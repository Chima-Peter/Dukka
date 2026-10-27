import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { PaymentMethod } from '@app/common';
import { MarketsService } from '../markets/markets.service.js';
import { assertStaffHasMarkets } from '../shared/assert-staff-markets.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import type { ApprovePaymentMethodDto } from './dto/approve-payment-method.dto.js';
import type { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import type { FindPaymentAttemptsDto } from './dto/find-payment-attempts.dto.js';
import type { FindPaymentMethodsDto } from './dto/find-payment-methods.dto.js';
import { PaymentsRepository } from './payments.repository.js';
import type {
    CreatePaymentAttemptInput,
    MarketPaymentMethodDetail,
    PaymentAttemptDetail,
    PaymentAttemptPage,
    PaymentMethodDetail,
    UpdatePaymentIntentInput,
} from './types/payment.type.js';

type PaymentErrorMessages = {
    conflict?: string;
    notFound?: string;
};

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private readonly paymentsRepository: PaymentsRepository,
        private readonly marketsService: MarketsService,
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
            return await this.paymentsRepository.findMethods(query);
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
            return method;
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
            assertStaffHasMarkets(staffMarketIds, [data.market_id]);
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
            assertStaffHasMarkets(staffMarketIds, [marketId]);

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

    async createAttempt(
        data: CreatePaymentAttemptInput,
    ): Promise<PaymentAttemptDetail> {
        try {
            this.logger.log(
                `Creating payment attempt for order ${data.order_id}`,
            );
            const attempt = await this.paymentsRepository.createAttempt(data);
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

    async findAttempts(
        query: FindPaymentAttemptsDto,
        staffMarketIds: string[],
    ): Promise<PaymentAttemptPage> {
        try {
            this.logger.log(
                `Fetching payment attempts for market ${query.market_id}`,
            );
            assertStaffHasMarkets(staffMarketIds, [query.market_id]);
            this.assertPriceRange(query.min_price, query.max_price);

            return await this.paymentsRepository.findAttempts(query);
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
            assertStaffHasMarkets(staffMarketIds, [marketId]);

            const attempt = await this.paymentsRepository.findAttemptById(
                id,
                marketId,
            );
            if (!attempt) {
                throw new NotFoundException('Payment attempt not found');
            }
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

    private handleError(
        error: unknown,
        messages: PaymentErrorMessages = {},
    ): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
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
