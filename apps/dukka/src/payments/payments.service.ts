import {
    BadGatewayException,
    BadRequestException,
    ConflictException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
    UnauthorizedException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    NotificationPublisher,
    NotificationType,
    OrderPaymentAttemptStatus,
    OrderRefundStatus,
    OrderStatus,
    Prisma,
    RedisService,
    type PaymentMethod,
} from '@app/common';
import { GENERAL_JOBS, GeneralQueueService } from '@app/queues';
import { MarketsService } from '../markets/markets.service.js';
import {
    ACCESS_CONTROL_ERROR,
    assertActorBelongsToMarkets,
    assertActorHasScopedAccess,
    type ScopedAccessActor,
} from '../shared/access-control.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import {
    ORDER_IDEMPOTENCY_COMPLETED_TTL_SECONDS,
    ORDER_IDEMPOTENCY_KEY_MAX_LENGTH,
    ORDER_IDEMPOTENCY_PROCESSING_TTL_SECONDS,
    RedisKeys,
} from '../shared/redis.constants.js';
import type { ApprovePaymentMethodDto } from './dto/approve-payment-method.dto.js';
import type { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import type { FindOrderRefundDto } from './dto/find-order-refund.dto.js';
import type { FindOrderRefundsDto } from './dto/find-order-refunds.dto.js';
import type { FindPaymentAttemptsDto } from './dto/find-payment-attempts.dto.js';
import type { FindPaymentMethodsDto } from './dto/find-payment-methods.dto.js';
import type { RetryOrderRefundDto } from './dto/retry-order-refund.dto.js';
import type { RetryRefundWithCustomerDetailsDto } from './dto/retry-refund-with-customer-details.dto.js';
import type { StaffPaystackPayDto } from './dto/staff-paystack-pay.dto.js';
import { PaymentsRepository } from './payments.repository.js';
import {
    PAYSTACK_REFUND_EVENTS,
    PAYSTACK_REFUND_TERMINAL_STATUS,
    PaystackService,
    type PaystackRefundTerminalWebhookEventName,
    type PaystackWebhookChargeData,
    type PaystackWebhookEvent,
    type PaystackWebhookRefundData,
} from './providers/index.js';
import type {
    CreatePaymentAttemptInput,
    MarketPaymentMethodDetail,
    OrderRefundActorMetadata,
    OrderRefundDetail,
    OrderRefundPage,
    PaymentAttemptDetail,
    PaymentAttemptPage,
    PaymentErrorMessages,
    PaymentMethodDetail,
    StaffPaystackPayResult,
    StaffRetryRefundResult,
    UpdatePaymentIntentInput,
} from './types/payment.type.js';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly paymentsRepository: PaymentsRepository,
        private readonly marketsService: MarketsService,
        private readonly paystackService: PaystackService,
        private readonly generalQueueService: GeneralQueueService,
        private readonly redisService: RedisService,
        private readonly notificationPublisher: NotificationPublisher,
    ) {}

    async createMethod(data: CreatePaymentMethodDto): Promise<PaymentMethod> {
        try {
            this.logger.log(`Creating payment method ${data.name}`);
            const method = await this.paymentsRepository.createMethod(data);
            this.logger.log(`Payment method created ${method.id}`);
            return method;
        } catch (error) {
            this.handleError(error, {
                conflict: 'A payment method with this name already exists',
                notFound: 'Payment method not found',
            });
        }
    }

    async findMethods(query: FindPaymentMethodsDto): Promise<PaymentMethod[]> {
        try {
            this.logger.log('Fetching payment methods');
            if (
                query.market_approved === false &&
                query.market_ids !== undefined &&
                query.market_ids.length > 0
            ) {
                throw new BadRequestException(
                    'market_approved=false cannot be combined with market_ids',
                );
            }
            const methods = await this.paymentsRepository.findMethods(query);
            this.logger.log('Fetched payment methods');
            return methods;
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment method not found',
            });
        }
    }

    async findMethod(id: string): Promise<PaymentMethodDetail> {
        try {
            this.logger.log(`Fetching payment method ${id}`);
            const method =
                await this.paymentsRepository.findMethodDetailById(id);
            if (!method) {
                throw new NotFoundException('Payment method not found');
            }
            this.logger.log(`Fetched payment method ${id}`);
            return method;
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment method not found',
            });
        }
    }

    async findAvailableForMarket(
        marketId: string,
    ): Promise<MarketPaymentMethodDetail[]> {
        try {
            this.logger.log(
                `Fetching available payment methods for market ${marketId}`,
            );
            const methods =
                await this.paymentsRepository.findMarketPaymentMethods(
                    marketId,
                );
            this.logger.log(
                `Fetched ${methods.length} payment method(s) for market ${marketId}`,
            );
            return methods;
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment method not found',
            });
        }
    }

    async approveForMarket(
        paymentMethodId: string,
        data: ApprovePaymentMethodDto,
        staffMarketIds: string[],
    ): Promise<MarketPaymentMethodDetail> {
        try {
            this.logger.log(
                `Approving payment method ${paymentMethodId} for market ${data.market_id}`,
            );
            assertActorBelongsToMarkets(staffMarketIds, [data.market_id]);
            await this.requireOpenMarket(data.market_id);

            const approved = await this.paymentsRepository.approveForMarket(
                paymentMethodId,
                data.market_id,
            );
            this.logger.log(
                `Payment method ${paymentMethodId} approved for market ${data.market_id}`,
            );
            return approved;
        } catch (error) {
            this.handleError(error, {
                conflict:
                    'Payment method is already approved for this market',
                notFound: 'Payment method not found',
            });
        }
    }

    async removeFromMarket(
        paymentMethodId: string,
        marketId: string,
        staffMarketIds: string[],
    ): Promise<object> {
        try {
            this.logger.log(
                `Removing payment method ${paymentMethodId} from market ${marketId}`,
            );
            assertActorBelongsToMarkets(staffMarketIds, [marketId]);

            const marketMethod =
                await this.paymentsRepository.findMarketPaymentMethod(
                    paymentMethodId,
                    marketId,
                );
            if (!marketMethod) {
                throw new NotFoundException(
                    'Payment method is not approved for this market',
                );
            }

            await this.paymentsRepository.removeFromMarket(marketMethod.id);
            this.logger.log(
                `Payment method ${paymentMethodId} removed from market ${marketId}`,
            );
            return { data: null };
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment method is not approved for this market',
            });
        }
    }

    async findMarketPaymentMethod(
        paymentMethodId: string,
        marketId: string,
    ): Promise<MarketPaymentMethodDetail> {
        try {
            const method =
                await this.paymentsRepository.findMarketPaymentMethod(
                    paymentMethodId,
                    marketId,
                );
            if (!method) {
                throw new NotFoundException(
                    'Payment method is not approved for this market',
                );
            }
            return method;
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment method is not approved for this market',
            });
        }
    }

    async createAttempt(
        data: CreatePaymentAttemptInput,
        tx?: Prisma.TransactionClient,
    ): Promise<PaymentAttemptDetail> {
        try {
            this.logger.log(
                `Creating payment attempt for order ${data.order_id}`,
            );
            const attempt = await this.paymentsRepository.createAttempt(
                data,
                tx,
            );
            this.logger.log(`Payment attempt created ${attempt.id}`);
            return attempt;
        } catch (error) {
            this.handleError(error, {
                conflict: 'A payment attempt already exists for this order',
                notFound: 'Order or market payment method not found',
            });
        }
    }

    async updatePaymentIntent(
        id: string,
        data: UpdatePaymentIntentInput,
    ): Promise<PaymentAttemptDetail> {
        try {
            this.logger.log(`Updating payment intent for attempt ${id}`);
            const attempt = await this.paymentsRepository.updatePaymentIntent(
                id,
                data,
            );
            this.logger.log(`Payment intent updated for attempt ${id}`);
            return attempt;
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment attempt not found',
            });
        }
    }

    async markAttemptSuccess(id: string): Promise<PaymentAttemptDetail> {
        try {
            this.logger.log(`Marking payment attempt ${id} as success`);
            const attempt =
                await this.paymentsRepository.markAttemptSuccess(id);
            this.logger.log(`Payment attempt ${id} marked success`);
            return attempt;
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment attempt not found',
            });
        }
    }

    async handlePaystackWebhook(input: {
        rawBody: Buffer | undefined;
        signature: string | undefined;
        body: unknown;
    }): Promise<{ received: true }> {
        try {
            if (!input.rawBody || !input.signature) {
                throw new UnauthorizedException('Invalid Paystack signature');
            }

            const valid = this.paystackService.verifyWebhookSignature(
                input.rawBody,
                input.signature,
            );
            if (!valid) {
                throw new UnauthorizedException('Invalid Paystack signature');
            }

            const event = this.parseWebhookEvent(input.body);
            if (!event) {
                this.logger.log('Ignoring Paystack webhook event=unknown');
                return { received: true };
            }

            if (event.event === 'charge.success') {
                return await this.handleChargeSuccessWebhook(event);
            }

            if (PAYSTACK_REFUND_EVENTS.has(event.event)) {
                return await this.handleRefundWebhook(event);
            }

            this.logger.log(
                `Ignoring Paystack webhook event=${event.event}`,
            );
            return { received: true };
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment attempt not found',
            });
        }
    }

    private async handleChargeSuccessWebhook(
        event: PaystackWebhookEvent,
    ): Promise<{ received: true }> {
        const attempt = await this.resolvePaymentAttempt(event);
        if (!attempt) {
            const reference =
                this.asChargeData(event.data).reference ?? 'missing';
            this.logger.warn(
                `No payment attempt for Paystack reference=${reference}`,
            );
            return { received: true };
        }

        if (attempt.status === OrderPaymentAttemptStatus.SUCCESS) {
            this.logger.log(
                `Payment attempt ${attempt.id} already success; acknowledging webhook`,
            );
            return { received: true };
        }

        const metadata = this.parseWebhookMetadata(
            this.asChargeData(event.data).metadata,
        );
        if (this.isCashStaffPaystackPayment(metadata, attempt)) {
            await this.paymentsRepository.markAttemptSuccess(attempt.id);
            this.logger.log(
                `Paystack charge.success for cash staff payment attempt ${attempt.id}; marked success without order transition`,
            );
            return { received: true };
        }

        const transition =
            await this.paymentsRepository.completeSuccessfulPayment(
                attempt.id,
                attempt.order_id,
            );
        if (!transition.ok) {
            if (transition.reason === 'not_found') {
                throw new NotFoundException('Order not found');
            }
            throw new BadRequestException(
                `Cannot transition order from ${transition.current_status} to ${OrderStatus.PROCESSING}`,
            );
        }

        await this.generalQueueService.enqueue(
            GENERAL_JOBS.ORDER_PROCESSING,
            { order_id: attempt.order_id },
            { jobId: `order-processing-${attempt.order_id}` },
        );

        this.logger.log(
            `Paystack charge.success processed for payment attempt ${attempt.id} order ${attempt.order_id}`,
        );
        return { received: true };
    }

    private async handleRefundWebhook(
        event: PaystackWebhookEvent,
    ): Promise<{ received: true }> {
        const data = this.asRefundData(event.data);
        const refundId = data.refund_reference?.trim();
        if (!refundId) {
            this.logger.warn(
                `Paystack refund event=${event.event} missing refund_reference; acknowledging`,
            );
            return { received: true };
        }

        const refund =
            await this.paymentsRepository.findRefundById(refundId);
        if (!refund) {
            this.logger.warn(
                `No OrderRefund for Paystack refund event=${event.event} refund_id=${refundId}`,
            );
            return { received: true };
        }

        if (event.event === 'refund.needs-attention') {
            if (
                refund.status !== OrderRefundStatus.PENDING &&
                refund.status !== OrderRefundStatus.NEEDS_ATTENTION
            ) {
                this.logger.log(
                    `OrderRefund ${refund.id} already ${refund.status}; acknowledging needs-attention webhook`,
                );
                return { received: true };
            }

            const updated =
                await this.paymentsRepository.markRefundStatusIfPending({
                    id: refund.id,
                    status: OrderRefundStatus.NEEDS_ATTENTION,
                    from_statuses: [OrderRefundStatus.PENDING],
                });

            if (updated) {
                await this.notifyRefundNeedsAttention(updated);
                this.logger.log(
                    `Paystack refund.needs-attention processed for OrderRefund ${updated.id} order ${updated.order_id}`,
                );
            } else {
                this.logger.log(
                    `OrderRefund ${refund.id} already ${refund.status}; acknowledging needs-attention webhook`,
                );
            }
            return { received: true };
        }

        const nextStatus =
            PAYSTACK_REFUND_TERMINAL_STATUS[
                event.event as PaystackRefundTerminalWebhookEventName
            ];

        if (!nextStatus) {
            this.logger.log(
                `Acknowledged non-terminal Paystack refund event=${event.event} for OrderRefund ${refund.id} (local status=${refund.status})`,
            );
            return { received: true };
        }

        if (
            refund.status !== OrderRefundStatus.PENDING &&
            refund.status !== OrderRefundStatus.NEEDS_ATTENTION
        ) {
            this.logger.log(
                `OrderRefund ${refund.id} already ${refund.status}; acknowledging webhook`,
            );
            return { received: true };
        }

        const updated = await this.paymentsRepository.markRefundStatusIfPending({
            id: refund.id,
            status: nextStatus,
            from_statuses: [
                OrderRefundStatus.PENDING,
                OrderRefundStatus.NEEDS_ATTENTION,
            ],
            refunded_at:
                nextStatus === OrderRefundStatus.PROCESSED ? new Date() : null,
        });

        if (!updated) {
            this.logger.log(
                `OrderRefund ${refund.id} was no longer open; acknowledging webhook`,
            );
            return { received: true };
        }

        await this.notifyRefund(updated, nextStatus);

        this.logger.log(
            `Paystack ${event.event} processed for OrderRefund ${updated.id} order ${updated.order_id}`,
        );
        return { received: true };
    }

    private async notifyRefundNeedsAttention(
        refund: OrderRefundDetail,
    ): Promise<void> {
        const actor = this.getRefundActor(refund);
        const staffId =
            actor?.type === 'staff' && actor.id
                ? actor.id
                : refund.order.warehouse?.manager_id;
        if (!staffId) {
            return;
        }

        const orderNumber = refund.order.order_number;
        const warehouseName = refund.order.warehouse?.name;
        await this.notificationPublisher.notifyStaff(staffId, {
            title: 'Refund needs attention',
            type: NotificationType.ORDER,
            text: warehouseName
                ? `Paystack needs the customer's bank account details to complete the refund for order #${orderNumber} (${warehouseName}). Retry with account number and bank ID.`
                : `Paystack needs the customer's bank account details to complete the refund for order #${orderNumber}. Retry with account number and bank ID.`,
        });
    }

    private getRefundActor(
        refund: OrderRefundDetail,
    ): Pick<OrderRefundActorMetadata['actor'], 'type' | 'id'> | null {
        const metadata = refund.metadata;
        if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
            return null;
        }

        const actor = (metadata as Record<string, unknown>).actor;
        if (!actor || typeof actor !== 'object' || Array.isArray(actor)) {
            return null;
        }

        const typed = actor as Partial<OrderRefundActorMetadata['actor']>;
        if (typed.type !== 'staff' && typed.type !== 'system') {
            return null;
        }

        return {
            type: typed.type,
            ...(typeof typed.id === 'string' ? { id: typed.id } : {}),
        };
    }

    private async notifyRefund(
        refund: OrderRefundDetail,
        status: Extract<OrderRefundStatus, 'PROCESSED' | 'FAILED'>,
        options?: { audience?: 'all' | 'staff' },
    ): Promise<void> {
        const audience = options?.audience ?? 'all';
        const orderNumber = refund.order.order_number;
        const customerId = refund.order.customer_id;
        const managerId = refund.order.warehouse?.manager_id ?? null;
        const warehouseName = refund.order.warehouse?.name;
        const notifyCustomer = audience === 'all';

        if (status === OrderRefundStatus.PROCESSED) {
            if (notifyCustomer) {
                if (customerId) {
                    await this.notificationPublisher.notifyCustomer(
                        customerId,
                        {
                            title: 'Refund processed',
                            type: NotificationType.ORDER,
                            text: `Your refund for order #${orderNumber} has been processed.`,
                        },
                    );
                } else {
                    this.logger.log(
                        `OrderRefund ${refund.id} has no customer to notify`,
                    );
                }
            }

            if (managerId) {
                await this.notificationPublisher.notifyStaff(managerId, {
                    title: 'Refund processed',
                    type: NotificationType.ORDER,
                    text: warehouseName
                        ? `Refund processed for order #${orderNumber} (${warehouseName}).`
                        : `Refund processed for order #${orderNumber}.`,
                });
            }
            return;
        }

        if (notifyCustomer) {
            if (customerId) {
                await this.notificationPublisher.notifyCustomer(customerId, {
                    title: 'Refund failed',
                    type: NotificationType.ORDER,
                    text: `We could not process the refund for order #${orderNumber}. Please contact support.`,
                });
            } else {
                this.logger.log(
                    `OrderRefund ${refund.id} has no customer to notify`,
                );
            }
        }

        if (managerId) {
            await this.notificationPublisher.notifyStaff(managerId, {
                title: 'Refund failed',
                type: NotificationType.ORDER,
                text: warehouseName
                    ? `Refund failed for order #${orderNumber} (${warehouseName}). Staff retry may be required.`
                    : `Refund failed for order #${orderNumber}. Staff retry may be required.`,
            });
        }
    }

    async retryRefundWithCustomerDetails(
        refundId: string,
        data: RetryRefundWithCustomerDetailsDto,
        actor: ScopedAccessActor,
    ): Promise<StaffRetryRefundResult> {
        try {
            this.logger.log(
                `Retrying OrderRefund ${refundId} with customer bank details`,
            );

            const [refund] = await Promise.all([
                this.paymentsRepository.findRefundDetailById(
                    refundId,
                    data.market_id,
                ),
                this.requireOpenMarket(data.market_id),
            ]);

            if (!refund) {
                throw new NotFoundException('Order refund not found');
            }

            assertActorHasScopedAccess(actor, {
                market_id: refund.order.market_id,
                warehouse_id: refund.order.warehouse_id,
            });

            if (refund.status !== OrderRefundStatus.NEEDS_ATTENTION) {
                throw new BadRequestException(
                    'Only refunds that need attention can be retried with customer details',
                );
            }

            if (refund.provider.toLowerCase() !== 'paystack') {
                throw new BadRequestException(
                    'Only Paystack refunds can be retried with customer details',
                );
            }

            const providerRefundId = refund.provider_refund_id?.trim();
            if (!providerRefundId) {
                throw new BadRequestException(
                    'Refund is missing Paystack refund ID and cannot be retried',
                );
            }

            try {
                await this.paystackService.retryRefund({
                    id: providerRefundId,
                    refund_account_details: {
                        currency: refund.currency,
                        account_number: data.account_number,
                        bank_id: data.bank_id,
                    },
                });
            } catch (error) {
                this.logger.error(
                    `Paystack retry with customer details failed for OrderRefund ${refund.id}: ${error}`,
                );
                if (error instanceof HttpException) {
                    throw error;
                }
                throw new InternalServerErrorException(
                    'Paystack refund retry failed. Try again later',
                );
            }

            const updated =
                (await this.paymentsRepository.markRefundStatusIfPending({
                    id: refund.id,
                    status: OrderRefundStatus.PENDING,
                    from_statuses: [OrderRefundStatus.NEEDS_ATTENTION],
                })) ?? refund;

            this.logger.log(
                `Retried OrderRefund ${updated.id} with customer details via Paystack refund id=${providerRefundId}; waiting for webhook`,
            );

            return {
                refund_id: updated.id,
                order_id: updated.order_id,
                provider_refund_id: updated.provider_refund_id,
                payment_reference: updated.payment_reference,
                status: updated.status,
            };
        } catch (error) {
            this.handleError(error, {
                notFound: 'Order refund not found',
            });
        }
    }

    async retryFailedRefund(
        orderId: string,
        data: RetryOrderRefundDto,
        actor: ScopedAccessActor,
        staff: {
            id: string;
            name: string;
            role_id: string | null;
            role_name: string | null;
        },
    ): Promise<StaffRetryRefundResult> {
        try {
            this.logger.log(
                `Staff ${staff.id} retrying failed refunds for order ${orderId}`,
            );

            const [attempt] = await Promise.all([
                this.paymentsRepository.findAttemptByOrderId(orderId),
                this.requireOpenMarket(data.market_id),
            ]);

            if (!attempt || attempt.order.market_id !== data.market_id) {
                throw new NotFoundException('Order refund not found');
            }

            assertActorHasScopedAccess(actor, {
                market_id: attempt.order.market_id,
                warehouse_id: attempt.order.warehouse_id,
            });

            const paymentReference = attempt.payment_intent_id?.trim();
            if (!paymentReference) {
                throw new BadRequestException(
                    'Refund is missing payment transaction reference and cannot be retried',
                );
            }

            const currency = attempt.order.currency;
            const [refunds, paystackRefunds] = await Promise.all([
                this.paymentsRepository.findRefundsByOrderId(orderId),
                this.listPaystackRefundsForTransaction(
                    paymentReference,
                    currency,
                ),
            ]);

            const scoped = refunds.filter(
                (refund) =>
                    refund.order.market_id === data.market_id &&
                    refund.payment_reference === paymentReference,
            );
            if (scoped.length === 0) {
                throw new NotFoundException('Order refund not found');
            }

            this.assertLocalTxnRefundsAreAllFailed(scoped);
            this.assertPaystackTxnRefundsAreAllFailed(paystackRefunds);

            const template = scoped[0];
            if (template.provider.toLowerCase() !== 'paystack') {
                throw new BadRequestException(
                    'Only Paystack refunds can be retried',
                );
            }

            const created = await this.paymentsRepository.createRefund({
                amount: template.amount,
                currency: template.currency,
                provider: template.provider,
                payment_reference: paymentReference,
                order_id: orderId,
                order_payment_attempt_id:
                    template.order_payment_attempt_id ?? attempt.id,
                customer_note: template.customer_note,
                merchant_note: template.merchant_note,
                metadata: {
                    actor: {
                        type: 'staff',
                        id: staff.id,
                        name: staff.name,
                        role_id: staff.role_id,
                        role_name: staff.role_name,
                        source: 'staff_retry',
                    },
                },
            });

            let paystackRefund;
            try {
                paystackRefund = await this.paystackService.createRefund({
                    transaction: paymentReference,
                    reference: created.id,
                    currency: created.currency,
                    ...(created.customer_note
                        ? { customer_note: created.customer_note }
                        : {}),
                    ...(created.merchant_note
                        ? { merchant_note: created.merchant_note }
                        : {}),
                });
            } catch (error) {
                const failed =
                    await this.paymentsRepository.markRefundStatusIfPending({
                        id: created.id,
                        status: OrderRefundStatus.FAILED,
                    });
                if (failed) {
                    await this.notifyRefund(failed, OrderRefundStatus.FAILED, {
                        audience: 'staff',
                    });
                }
                this.logger.error(
                    `Paystack refund retry failed for new OrderRefund ${created.id} on order ${orderId}: ${error}`,
                );
                throw new InternalServerErrorException(
                    'Paystack refund retry failed. Try again later',
                );
            }

            const updated = await this.paymentsRepository.attachProviderRefundId(
                created.id,
                String(paystackRefund.id),
            );

            this.logger.log(
                `Created OrderRefund ${updated.id} for order ${orderId} via Paystack transaction=${paymentReference} reference=${updated.id} id=${updated.provider_refund_id}; waiting for webhook`,
            );

            return {
                refund_id: updated.id,
                order_id: updated.order_id,
                provider_refund_id: updated.provider_refund_id,
                payment_reference: updated.payment_reference,
                status: updated.status,
            };
        } catch (error) {
            this.handleError(error, {
                notFound: 'Order refund not found',
            });
        }
    }

    private assertLocalTxnRefundsAreAllFailed(
        refunds: OrderRefundDetail[],
    ): void {
        if (
            refunds.some(
                (refund) =>
                    refund.status === OrderRefundStatus.PENDING ||
                    refund.status === OrderRefundStatus.NEEDS_ATTENTION,
            )
        ) {
            throw new ConflictException(
                'A pending refund or one that needs attention already exists for this payment',
            );
        }

        if (
            refunds.some(
                (refund) => refund.status === OrderRefundStatus.PROCESSED,
            )
        ) {
            throw new BadRequestException(
                'A successful refund already exists for this payment',
            );
        }

        if (
            refunds.some(
                (refund) => refund.status !== OrderRefundStatus.FAILED,
            )
        ) {
            throw new BadRequestException(
                'Only failed refunds can be retried',
            );
        }
    }

    private async listPaystackRefundsForTransaction(
        paymentReference: string,
        currency: string,
    ) {
        try {
            return (
                (await this.paystackService.listRefunds({
                    transaction: paymentReference,
                    currency,
                    perPage: 50,
                    page: 1,
                })) ?? []
            );
        } catch (error) {
            this.logger.error(
                `Failed listing Paystack refunds for transaction=${paymentReference}: ${error}`,
            );
            throw new InternalServerErrorException(
                'Unable to verify Paystack refunds. Try again later',
            );
        }
    }

    private assertPaystackTxnRefundsAreAllFailed(
        paystackRefunds: Array<{ status: string }>,
    ): void {
        if (paystackRefunds.length === 0) {
            return;
        }

        const statuses = paystackRefunds.map((refund) =>
            refund.status.toLowerCase(),
        );

        if (
            statuses.some(
                (status) =>
                    status === 'pending' ||
                    status === 'processing' ||
                    status === 'needs-attention',
            )
        ) {
            throw new ConflictException(
                'A pending refund already exists for this payment on Paystack',
            );
        }

        if (
            statuses.some(
                (status) => status === 'processed' || status === 'success',
            )
        ) {
            throw new BadRequestException(
                'A successful refund already exists for this payment on Paystack',
            );
        }

        if (statuses.some((status) => status !== 'failed')) {
            throw new BadRequestException(
                'Only failed Paystack refunds can be retried',
            );
        }
    }

    async payCashOrderWithPaystack(
        orderId: string,
        data: StaffPaystackPayDto,
        actor: ScopedAccessActor,
        staffId: string,
        idempotencyKeyHeader?: string,
    ): Promise<StaffPaystackPayResult> {
        try {
            const idempotencyKey =
                this.requireIdempotencyKey(idempotencyKeyHeader);

            return await this.withPaystackPayIdempotency(
                idempotencyKey,
                async () => {
                    this.logger.log(
                        `Staff ${staffId} initiating Paystack pay for cash order ${orderId}`,
                    );
                    assertActorHasScopedAccess(actor, {
                        market_id: data.market_id,
                    });
                    await this.requireOpenMarket(data.market_id);

                    const attempt =
                        await this.paymentsRepository.findAttemptByOrderId(
                            orderId,
                        );
                    if (!attempt || attempt.order.market_id !== data.market_id) {
                        throw new NotFoundException('Order payment attempt not found');
                    }

                    if (attempt.order.status === OrderStatus.CANCELLED) {
                        throw new BadRequestException(
                            'Cannot pay for a cancelled order',
                        );
                    }

                    if (attempt.payment_method_name.toLowerCase() !== 'cash') {
                        throw new BadRequestException(
                            'Only cash orders can be paid via Paystack',
                        );
                    }

                    if (
                        attempt.status === OrderPaymentAttemptStatus.PENDING &&
                        attempt.payment_intent_url &&
                        attempt.payment_intent_id
                    ) {
                        return {
                            order_id: attempt.order_id,
                            payment_attempt_id: attempt.id,
                            authorization_url: attempt.payment_intent_url,
                            reference: attempt.payment_intent_id,
                            status: attempt.status,
                        };
                    }

                    if (
                        attempt.status === OrderPaymentAttemptStatus.SUCCESS &&
                        attempt.payment_intent_id
                    ) {
                        throw new BadRequestException(
                            'Cash order is already paid via Paystack',
                        );
                    }

                    const paystackMethod =
                        await this.paymentsRepository.findPaystackMarketPaymentMethod(
                            data.market_id,
                        );
                    if (!paystackMethod) {
                        throw new BadRequestException(
                            'Paystack is not available for this market',
                        );
                    }

                    const email = this.resolvePayerEmail(attempt);
                    let init;
                    try {
                        init = await this.paystackService.initializeTransaction(
                            {
                                email,
                                amount: Math.round(
                                    Number(attempt.order.total_amount) * 100,
                                ),
                                currency: attempt.order.currency,
                                metadata: {
                                    order_id: attempt.order_id,
                                    payment_attempt_id: attempt.id,
                                    market_id: data.market_id,
                                    staff_id: staffId,
                                    idempotency_key: idempotencyKey,
                                    payment_method: 'cash',
                                    source: 'staff_cash_to_paystack',
                                    ...(attempt.order.customer_id
                                        ? {
                                              customer_id:
                                                  attempt.order.customer_id,
                                          }
                                        : {
                                              guest_email: email,
                                          }),
                                },
                            },
                        );
                    } catch (error) {
                        this.logger.error(
                            `Paystack initialize failed for order ${orderId}: ${error}`,
                        );
                        throw new InternalServerErrorException(
                            'Paystack initialization failed. Try again later',
                        );
                    }

                    if (!init.authorization_url || !init.reference) {
                        throw new BadGatewayException(
                            'Paystack initialization returned an incomplete response. Try again later',
                        );
                    }

                    const updated =
                        await this.paymentsRepository.convertCashAttemptToPaystack(
                            attempt.id,
                            {
                                payment_intent_id: init.reference,
                                payment_intent_url: init.authorization_url,
                            },
                        );

                    this.logger.log(
                        `Cash order ${orderId} Paystack payment initialized on attempt ${updated.id}`,
                    );

                    return {
                        order_id: updated.order_id,
                        payment_attempt_id: updated.id,
                        authorization_url: init.authorization_url,
                        reference: init.reference,
                        status: updated.status,
                    };
                },
            );
        } catch (error) {
            this.handleError(error, {
                notFound: 'Order payment attempt not found',
            });
        }
    }

    private resolvePayerEmail(attempt: PaymentAttemptDetail): string {
        const shipping = attempt.order.shipping_address;
        if (
            shipping &&
            typeof shipping === 'object' &&
            !Array.isArray(shipping) &&
            typeof (shipping as { email?: unknown }).email === 'string' &&
            (shipping as { email: string }).email.trim().length > 0
        ) {
            return (shipping as { email: string }).email.trim();
        }

        const customerEmail = attempt.order.customer?.email?.trim();
        if (customerEmail) {
            return customerEmail;
        }

        const guestEmail = attempt.order.guest_email?.trim();
        if (guestEmail) {
            return guestEmail;
        }

        throw new BadRequestException(
            'Order has no email available for Paystack payment',
        );
    }

    private requireIdempotencyKey(header?: string): string {
        const key = header?.trim();
        if (!key) {
            throw new BadRequestException('Idempotency-Key header is required');
        }
        if (key.length > ORDER_IDEMPOTENCY_KEY_MAX_LENGTH) {
            throw new BadRequestException(
                `Idempotency-Key must be at most ${ORDER_IDEMPOTENCY_KEY_MAX_LENGTH} characters`,
            );
        }
        return key;
    }

    private async withPaystackPayIdempotency(
        idempotencyKey: string,
        run: () => Promise<StaffPaystackPayResult>,
    ): Promise<StaffPaystackPayResult> {
        const resultKey = RedisKeys.orderPaystackPayIdempotency(idempotencyKey);
        const lockKey =
            RedisKeys.orderPaystackPayIdempotencyLock(idempotencyKey);

        const outcome =
            await this.redisService.getObjectOrLock<StaffPaystackPayResult>(
                resultKey,
                lockKey,
                ORDER_IDEMPOTENCY_PROCESSING_TTL_SECONDS * 1000,
            );

        if (outcome.status === 'hit') {
            this.logger.log(
                `Replaying staff Paystack pay for idempotency key ${idempotencyKey}`,
            );
            return outcome.value;
        }

        if (outcome.status === 'busy') {
            throw new ConflictException('Paystack payment already in progress');
        }

        try {
            const result = await run();
            await this.redisService.setObject(
                resultKey,
                result,
                ORDER_IDEMPOTENCY_COMPLETED_TTL_SECONDS,
            );
            return result;
        } finally {
            await this.redisService.unlock(lockKey, outcome.token);
        }
    }

    private parseWebhookEvent(body: unknown): PaystackWebhookEvent | null {
        if (!body || typeof body !== 'object') {
            return null;
        }

        const event = body as Partial<PaystackWebhookEvent>;
        if (typeof event.event !== 'string') {
            return null;
        }

        return {
            event: event.event,
            data:
                event.data && typeof event.data === 'object'
                    ? event.data
                    : {},
        };
    }

    private async resolvePaymentAttempt(
        event: PaystackWebhookEvent,
    ): Promise<PaymentAttemptDetail | null> {
        const data = this.asChargeData(event.data);
        const reference = data.reference?.trim();
        if (reference) {
            const byReference =
                await this.paymentsRepository.findAttemptByPaymentIntentId(
                    reference,
                );
            if (byReference) {
                return byReference;
            }
        }

        const paymentAttemptId = this.extractPaymentAttemptId(data.metadata);
        if (!paymentAttemptId) {
            return null;
        }

        return await this.paymentsRepository.findAttemptDetailById(
            paymentAttemptId,
        );
    }

    private asChargeData(
        data: PaystackWebhookEvent['data'],
    ): PaystackWebhookChargeData {
        return data as PaystackWebhookChargeData;
    }

    private asRefundData(
        data: PaystackWebhookEvent['data'],
    ): PaystackWebhookRefundData {
        return data as PaystackWebhookRefundData;
    }

    private extractPaymentAttemptId(
        metadata: PaystackWebhookChargeData['metadata'],
    ): string | null {
        const parsed = this.parseWebhookMetadata(metadata);
        if (!parsed) {
            return null;
        }

        const value = parsed.payment_attempt_id;
        return typeof value === 'string' && value.length > 0 ? value : null;
    }

    private isCashStaffPaystackPayment(
        metadata: Record<string, unknown> | null,
        attempt: PaymentAttemptDetail,
    ): boolean {
        const paymentMethod =
            typeof metadata?.payment_method === 'string'
                ? metadata.payment_method.toLowerCase()
                : null;
        const source =
            typeof metadata?.source === 'string' ? metadata.source : null;

        if (
            paymentMethod === 'cash' ||
            source === 'staff_cash_to_paystack'
        ) {
            return true;
        }

        return attempt.payment_method_name.toLowerCase() === 'cash';
    }

    private parseWebhookMetadata(
        metadata: PaystackWebhookChargeData['metadata'],
    ): Record<string, unknown> | null {
        if (!metadata) {
            return null;
        }

        if (typeof metadata === 'string') {
            return this.tryParseMetadata(metadata);
        }

        return metadata;
    }

    private tryParseMetadata(
        metadata: string,
    ): Record<string, unknown> | null {
        try {
            const parsed: unknown = JSON.parse(metadata);
            if (parsed && typeof parsed === 'object') {
                return parsed as Record<string, unknown>;
            }
            return null;
        } catch {
            return null;
        }
    }

    async findAttempts(
        query: FindPaymentAttemptsDto,
        actor: ScopedAccessActor,
    ): Promise<PaymentAttemptPage> {
        try {
            this.logger.log(
                `Fetching payment attempts for market ${query.market_id}`,
            );
            assertActorHasScopedAccess(actor, {
                market_id: query.market_id,
                ...(query.warehouse_id !== undefined && {
                    warehouse_id: query.warehouse_id,
                }),
            });
            this.assertPriceRange(query.min_price, query.max_price);

            const page = await this.paymentsRepository.findAttempts(query);
            this.logger.log(
                `Fetched payment attempts for market ${query.market_id}`,
            );
            return page;
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment attempt not found',
            });
        }
    }

    async findRefunds(
        query: FindOrderRefundsDto,
        actor: ScopedAccessActor,
    ): Promise<OrderRefundPage> {
        try {
            this.logger.log(
                `Fetching order refunds for market ${query.market_id}`,
            );
            assertActorHasScopedAccess(actor, {
                market_id: query.market_id,
                ...(query.warehouse_id !== undefined && {
                    warehouse_id: query.warehouse_id,
                }),
            });
            this.assertAmountRange(query.min_amount, query.max_amount);

            const page = await this.paymentsRepository.findRefunds(query);
            this.logger.log(
                `Fetched order refunds for market ${query.market_id}`,
            );
            return page;
        } catch (error) {
            this.handleError(error, {
                notFound: 'Order refund not found',
            });
        }
    }

    async findRefund(
        id: string,
        query: FindOrderRefundDto,
        actor: ScopedAccessActor,
    ): Promise<OrderRefundDetail> {
        try {
            this.logger.log(`Fetching order refund ${id}`);
            const refund = await this.paymentsRepository.findRefundDetailById(
                id,
                query.market_id,
            );
            if (!refund) {
                throw new NotFoundException('Order refund not found');
            }

            assertActorHasScopedAccess(actor, {
                market_id: refund.order.market_id,
                warehouse_id: refund.order.warehouse_id,
            });

            this.logger.log(`Fetched order refund ${id}`);
            return refund;
        } catch (error) {
            this.handleError(error, {
                notFound: 'Order refund not found',
            });
        }
    }

    async findAttemptByOrderId(
        orderId: string,
    ): Promise<PaymentAttemptDetail | null> {
        try {
            return await this.paymentsRepository.findAttemptByOrderId(orderId);
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment attempt not found',
            });
        }
    }

    async findAttempt(
        id: string,
        marketId: string,
        staffMarketIds: string[],
    ): Promise<PaymentAttemptDetail> {
        try {
            this.logger.log(`Fetching payment attempt ${id}`);
            assertActorBelongsToMarkets(staffMarketIds, [marketId]);

            const attempt = await this.paymentsRepository.findAttemptById(
                id,
                marketId,
            );
            if (!attempt) {
                throw new NotFoundException('Payment attempt not found');
            }
            this.logger.log(`Fetched payment attempt ${id}`);
            return attempt;
        } catch (error) {
            this.handleError(error, {
                notFound: 'Payment attempt not found',
            });
        }
    }

    async hasPendingAttemptsForCustomer(customerId: string): Promise<boolean> {
        try {
            return await this.paymentsRepository.hasPendingAttemptsForCustomer(
                customerId,
            );
        } catch (error) {
            this.handleError(error);
        }
    }

    private async requireOpenMarket(marketId: string): Promise<void> {
        const validation = await this.marketsService.validateIds({
            market_ids: [marketId],
        });
        if (validation.invalid_ids.length > 0) {
            throw new NotFoundException('Market not found');
        }
        if (validation.inactive_ids.length > 0) {
            throw new BadRequestException('Market is not open');
        }
    }

    private assertPriceRange(minPrice?: number, maxPrice?: number): void {
        if (
            minPrice !== undefined &&
            maxPrice !== undefined &&
            minPrice > maxPrice
        ) {
            throw new BadRequestException(
                'min_price cannot be greater than max_price',
            );
        }
    }

    private assertAmountRange(minAmount?: number, maxAmount?: number): void {
        if (
            minAmount !== undefined &&
            maxAmount !== undefined &&
            minAmount > maxAmount
        ) {
            throw new BadRequestException(
                'min_amount cannot be greater than max_amount',
            );
        }
    }

    private handleError(
        error: unknown,
        messages: PaymentErrorMessages = {},
    ): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (
            error instanceof Error &&
            (error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_MARKET_ACCESS ||
                error.message === ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS)
        ) {
            throw new ForbiddenException(
                'Cannot operate outside your assigned scope',
            );
        }


        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    messages.conflict ??
                        'A payment record with these details already exists',
                );
            }
            if (error.code === 'P2003' || error.code === 'P2025') {
                this.logger.warn(
                    `Payment relation error ${error.code}: ${error.message}`,
                );
                const relationError = this.paymentRelationNotFound(error);
                if (relationError !== null) {
                    throw relationError;
                }
                throw new NotFoundException(
                    messages.notFound ?? 'Payment record not found',
                );
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private paymentRelationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException | null {
        const model = prismaMissingRecordModel(error);
        switch (model) {
            case 'order':
                return new NotFoundException('Order not found');
            case 'marketpaymentmethod':
                return new NotFoundException('Market payment method not found');
            case 'paymentmethod':
                return new NotFoundException('Payment method not found');
            case 'market':
                return new NotFoundException('Market not found');
            case 'orderpaymentattempt':
                return new NotFoundException('Payment attempt not found');
            case 'orderrefund':
                return new NotFoundException('Order refund not found');
        }

        if (prismaHintIncludes(error, 'order_id')) {
            return new NotFoundException('Order not found');
        }
        if (prismaHintIncludes(error, 'market_payment_method_id')) {
            return new NotFoundException('Market payment method not found');
        }
        if (prismaHintIncludes(error, 'payment_method_id')) {
            return new NotFoundException('Payment method not found');
        }
        if (prismaHintIncludes(error, 'market_id')) {
            return new NotFoundException('Market not found');
        }

        return null;
    }
}
