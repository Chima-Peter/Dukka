import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@app/common';
import type { OrderMatchingJobPayload } from '@app/queues';

@Injectable()
export class OrderMatchingService {
    private readonly logger = new Logger(OrderMatchingService.name);

    constructor(private readonly prisma: PrismaService) {}

    async process(payload: OrderMatchingJobPayload): Promise<void> {
        const { customer_id, email } = payload;

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
}
