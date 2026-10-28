import { Injectable, Logger } from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    PrismaService,
    RestCountriesIpService,
    ServiceCountryStatus,
} from '@app/common';
import type { CustomerRegisteredJobPayload } from '@app/queues';

type NormalizedAddress = {
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    whatsapp_number?: string | null;
    country: string;
    state: string;
    market_id: string;
    street_address: string;
};

@Injectable()
export class CustomerRegisteredService {
    private readonly logger = new Logger(CustomerRegisteredService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly restCountriesIpService: RestCountriesIpService,
    ) {}

    async process(payload: CustomerRegisteredJobPayload): Promise<void> {
        const { customer_id, email, client_ip } = payload;

        await Promise.all([
            await this.assignActiveMarketFromIp(customer_id, client_ip),
            await this.matchGuestOrders(customer_id, email),
            await this.resolveGuestCouponUsages(customer_id, email),
            await this.matchAddressesFromOrders(customer_id),
        ])
    }

    private async matchGuestOrders(
        customerId: string,
        email: string,
    ): Promise<void> {
        this.logger.log(
            `Matching guest orders for customer ${customerId} email=${email}`,
        );

        const result = await this.prisma.order.updateMany({
            where: {
                customer_id: null,
                guest_email: {
                    equals: email,
                    mode: 'insensitive',
                },
            },
            data: {
                customer_id: customerId,
            },
        });

        this.logger.log(
            `Linked ${result.count} order(s) to customer ${customerId}`,
        );
    }

    private async resolveGuestCouponUsages(
        customerId: string,
        email: string,
    ): Promise<void> {
        this.logger.log(
            `Resolving guest coupon usages for customer ${customerId} email=${email}`,
        );

        const result = await this.prisma.couponUsage.updateMany({
            where: {
                customer_id: null,
                guest_email: {
                    equals: email,
                    mode: 'insensitive',
                },
            },
            data: {
                customer_id: customerId,
            },
        });

        this.logger.log(
            `Linked ${result.count} coupon usage(s) to customer ${customerId}`,
        );
    }

    private async matchAddressesFromOrders(
        customerId: string,
    ): Promise<void> {
        this.logger.log(
            `Matching shipping and billing addresses for customer ${customerId}`,
        );

        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
            select: {
                shipping_address: { select: { id: true }, take: 1 },
                billing_address: { select: { id: true }, take: 1 },
            },
        });
        if (!customer) {
            this.logger.warn(
                `Customer ${customerId} not found while matching addresses`,
            );
            return;
        }

        const needsShipping = customer.shipping_address.length === 0;
        const needsBilling = customer.billing_address.length === 0;
        if (!needsShipping && !needsBilling) {
            this.logger.log(
                `Customer ${customerId} already has shipping and billing addresses`,
            );
            return;
        }

        const order = await this.prisma.order.findFirst({
            where: { customer_id: customerId },
            orderBy: { created_at: 'desc' },
            select: {
                shipping_address: true,
                billing_address: true,
            },
        });
        if (!order) {
            this.logger.log(
                `No orders available to source addresses for customer ${customerId}`,
            );
            return;
        }

        if (needsShipping) {
            const shipping = this.normalizeAddress(order.shipping_address);
            if (shipping) {
                await this.createShippingAddress(customerId, shipping);
            } else {
                this.logger.warn(
                    `Could not normalize shipping address for customer ${customerId}`,
                );
            }
        }

        if (needsBilling) {
            const billing = this.normalizeAddress(order.billing_address);
            if (billing) {
                await this.createBillingAddress(customerId, billing);
            } else {
                this.logger.warn(
                    `Could not normalize billing address for customer ${customerId}`,
                );
            }
        }
    }

    private async createShippingAddress(
        customerId: string,
        address: NormalizedAddress,
    ): Promise<void> {
        if (!(await this.isValidAddressState(address))) {
            this.logger.warn(
                `Invalid shipping address state/market for customer ${customerId}`,
            );
            return;
        }

        try {
            await this.prisma.shippingAddress.create({
                data: {
                    first_name: address.first_name,
                    last_name: address.last_name,
                    email: address.email,
                    phone_number: address.phone_number,
                    whatsapp_number: address.whatsapp_number ?? null,
                    country: address.country,
                    street_address: address.street_address,
                    state: address.state,
                    market_id: address.market_id,
                    customer_id: customerId,
                },
            });
            this.logger.log(
                `Matched shipping address to customer ${customerId}`,
            );
        } catch (error) {
            this.handleAddressCreateError(error, 'shipping', customerId);
        }
    }

    private async createBillingAddress(
        customerId: string,
        address: NormalizedAddress,
    ): Promise<void> {
        if (!(await this.isValidAddressState(address))) {
            this.logger.warn(
                `Invalid billing address state/market for customer ${customerId}`,
            );
            return;
        }

        try {
            await this.prisma.billingAddress.create({
                data: {
                    first_name: address.first_name,
                    last_name: address.last_name,
                    email: address.email,
                    phone_number: address.phone_number,
                    whatsapp_number: address.whatsapp_number ?? null,
                    country: address.country,
                    street_address: address.street_address,
                    state: address.state,
                    market_id: address.market_id,
                    customer_id: customerId,
                },
            });
            this.logger.log(
                `Matched billing address to customer ${customerId}`,
            );
        } catch (error) {
            this.handleAddressCreateError(error, 'billing', customerId);
        }
    }

    private async isValidAddressState(
        address: NormalizedAddress,
    ): Promise<boolean> {
        const state = await this.prisma.serviceState.findFirst({
            where: {
                id: address.state,
                country: { market_id: address.market_id },
            },
            select: { id: true },
        });
        return state !== null;
    }

    private normalizeAddress(value: unknown): NormalizedAddress | null {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return null;
        }

        const raw = value as Record<string, unknown>;
        const email = this.asNonEmptyString(raw.email);
        const phone_number = this.asNonEmptyString(raw.phone_number);
        const country = this.asNonEmptyString(raw.country);
        const state = this.asNonEmptyString(raw.state);
        const market_id = this.asNonEmptyString(raw.market_id);
        const street_address = this.asNonEmptyString(raw.street_address);

        if (
            !email ||
            !phone_number ||
            !country ||
            !state ||
            !market_id ||
            !street_address
        ) {
            return null;
        }

        const first_name = this.asNonEmptyString(raw.first_name);
        const last_name = this.asNonEmptyString(raw.last_name);
        if (first_name && last_name) {
            return {
                first_name,
                last_name,
                email,
                phone_number,
                whatsapp_number: this.asOptionalString(raw.whatsapp_number),
                country,
                state,
                market_id,
                street_address,
            };
        }

        const fullName = this.asNonEmptyString(raw.name);
        if (!fullName) {
            return null;
        }

        const parts = fullName.trim().split(/\s+/);
        return {
            first_name: parts[0]!,
            last_name: parts.slice(1).join(' ') || parts[0]!,
            email,
            phone_number,
            whatsapp_number: this.asOptionalString(raw.whatsapp_number),
            country,
            state,
            market_id,
            street_address,
        };
    }

    private asNonEmptyString(value: unknown): string | null {
        if (typeof value !== 'string') {
            return null;
        }
        const trimmed = value.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    private asOptionalString(value: unknown): string | null {
        if (value === null || value === undefined) {
            return null;
        }
        return this.asNonEmptyString(value);
    }

    private handleAddressCreateError(
        error: unknown,
        kind: 'shipping' | 'billing',
        customerId: string,
    ): void {
        if (
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            this.logger.warn(
                `Skipped ${kind} address for customer ${customerId}: conflicting record`,
            );
            return;
        }

        throw error;
    }

    private async assignActiveMarketFromIp(
        customerId: string,
        clientIp?: string,
    ): Promise<void> {
        if (!clientIp) {
            this.logger.warn(
                `No client IP for customer ${customerId}; skipping market assignment`,
            );
            return;
        }

        const iso2 = await this.restCountriesIpService.resolveIso2(clientIp);
        if (!iso2) {
            return;
        }

        const match = await this.prisma.serviceCountry.findFirst({
            where: {
                status: ServiceCountryStatus.OPEN,
                iso2: {
                    equals: iso2,
                    mode: 'insensitive',
                },
            },
            select: {
                iso2: true,
                market_id: true,
            },
        });

        if (!match) {
            this.logger.warn(
                `No open service country found for iso2 ${iso2}`,
            );
            return;
        }

        if (!match.market_id) {
            this.logger.warn(
                `No market assigned for service country ${match.iso2}`,
            );
            return;
        }

        await this.prisma.customer.update({
            where: { id: customerId },
            data: { active_market_id: match.market_id },
        });

        this.logger.log(
            `Assigned market ${match.market_id} to customer ${customerId} from IP ${clientIp}`,
        );
    }
}
