import { Injectable, Logger } from '@nestjs/common';
import {
    OrderInventoryStatus,
    OrderPaymentAttemptStatus,
    PrismaService,
} from '@app/common';
import type { ExpiredReservationsJobPayload } from '@app/queues';

type LockedReservation = {
    id: string;
    order_id: string;
    warehouse_id: string;
};

@Injectable()
export class ExpiredReservationsService {
    private readonly logger = new Logger(ExpiredReservationsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async process(
        payload: ExpiredReservationsJobPayload,
    ): Promise<void> {
        const expired = await this.prisma.$transaction(async (tx) => {
            const locked = await tx.$queryRaw<LockedReservation[]>`
                SELECT oi.id, oi.order_id, oi.warehouse_id
                FROM "OrderInventory" oi
                WHERE oi.id = ${payload.order_inventory_id}
                  AND oi.expires_at <= NOW()
                  AND oi.status = ${OrderInventoryStatus.PENDING}::"OrderInventoryStatus"
                FOR UPDATE OF oi
            `;

            if (locked.length === 0) {
                return null;
            }

            const reservation = locked[0];

            const lineItems = await tx.inventoryLineItem.findMany({
                where: { order_inventory_id: reservation.id },
                select: {
                    market_variant_id: true,
                    quantity: true,
                },
            });

            for (const line of lineItems) {
                const updated = await tx.inventory.updateManyAndReturn({
                    where: {
                        warehouse_id: reservation.warehouse_id,
                        market_variant_id: line.market_variant_id,
                        reserved_quantity: { gte: line.quantity },
                    },
                    data: {
                        available_quantity: { increment: line.quantity },
                        reserved_quantity: { decrement: line.quantity },
                    },
                    select: {
                        available_quantity: true,
                        reserved_quantity: true,
                    },
                });

                if (updated.length === 0) {
                    throw new Error(
                        `No inventory for market variant ${line.market_variant_id} in warehouse ${reservation.warehouse_id}`,
                    );
                }
            }

            await tx.orderInventory.update({
                where: { id: reservation.id },
                data: { status: OrderInventoryStatus.CLOSED },
            });

            await tx.orderPaymentAttempt.updateMany({
                where: {
                    order_id: reservation.order_id,
                    status: OrderPaymentAttemptStatus.PENDING,
                },
                data: {
                    status: OrderPaymentAttemptStatus.FAILED,
                },
            });

            return reservation;
        });

        if (!expired) {
            this.logger.log(
                `Skipped expired-reservations for ${payload.order_inventory_id} (inventory booking not eligible)`,
            );
            return;
        }

        this.logger.log(
            `Reverted expired inventory booking ${expired.id}`,
        );
    }
}
