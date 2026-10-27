import { Injectable, Logger } from '@nestjs/common';
import {
    PrismaService,
    RestCountriesIpService,
    ServiceCountryStatus,
} from '@app/common';
import type { CustomerRegisteredJobPayload } from '@app/queues';

@Injectable()
export class CustomerRegisteredService {
    private readonly logger = new Logger(CustomerRegisteredService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly restCountriesIpService: RestCountriesIpService,
    ) {}

    async process(payload: CustomerRegisteredJobPayload): Promise<void> {
        const { customer_id, email, client_ip } = payload;

        await this.assignActiveMarketFromIp(customer_id, client_ip);

        this.logger.log(
            `Matching guest orders for customer ${customer_id} email=${email}`,
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
                customer_id,
            },
        });

        this.logger.log(
            `Linked ${result.count} order(s) to customer ${customer_id}`,
        );
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
