import { Injectable } from '@nestjs/common';
import {
    OrderStatus,
    PrismaService,
    ShipmentMovementType,
    ShipmentStatus,
} from '@app/common';
import {
    shipmentForMoveInclude,
    shipmentLocationSelect,
    type LogisticsPartnerForMove,
    type MoveShipmentInput,
    type MoveShipmentResult,
    type ShipmentForMove,
    type ShipmentLocationSummary,
} from './types/shipment.type.js';

@Injectable()
export class ShipmentsRepository {
    constructor(private readonly prisma: PrismaService) {}

    async findForMove(id: string): Promise<ShipmentForMove | null> {
        return await this.prisma.shipment.findUnique({
            where: { id },
            include: shipmentForMoveInclude,
        });
    }

    async findLocation(
        id: string,
    ): Promise<ShipmentLocationSummary | null> {
        return await this.prisma.logisticsLocation.findUnique({
            where: { id },
            select: shipmentLocationSelect,
        });
    }

    async findPartner(
        id: string,
    ): Promise<LogisticsPartnerForMove | null> {
        return await this.prisma.logisticsPartner.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,
                code: true,
                is_active: true,
            },
        });
    }

    async move(
        shipmentId: string,
        input: MoveShipmentInput,
    ): Promise<MoveShipmentResult> {
        const shipment = await this.prisma.shipment.update({
            where: { id: shipmentId },
            data: {
                current_location: {
                    connect: { id: input.to_location_id },
                },
                ...(input.mark_as_shipped && {
                    status: ShipmentStatus.SHIPPED,
                    order: {
                        update: {
                            status: OrderStatus.SHIPPED,
                        },
                    },
                }),
                shipment_legs: {
                    create: {
                        origin_location: {
                            connect: { id: input.from_location_id },
                        },
                        destination_location: {
                            connect: { id: input.to_location_id },
                        },
                        logistics_partner: {
                            connect: { id: input.logistics_partner_id },
                        },
                        expected_departure_date: input.expected_departure_date,
                        expected_arrival_date: input.expected_arrival_date,
                        actual_departure_date: input.occurred_at,
                        shipment_movements: {
                            create: {
                                shipment: { connect: { id: shipmentId } },
                                from_location: {
                                    connect: { id: input.from_location_id },
                                },
                                to_location: {
                                    connect: { id: input.to_location_id },
                                },
                                movement_type: ShipmentMovementType.DISPATCH,
                                performed_by: input.performed_by,
                                occurred_at: input.occurred_at,
                                recorded_at: new Date(),
                                ...(input.metadata !== undefined && {
                                    metadata: input.metadata,
                                }),
                            },
                        },
                    },
                },
            },
            include: {
                shipment_legs: {
                    orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
                    take: 1,
                    include: {
                        origin_location: { select: shipmentLocationSelect },
                        destination_location: {
                            select: shipmentLocationSelect,
                        },
                        logistics_partner: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                            },
                        },
                        shipment_movements: {
                            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
                            take: 1,
                        },
                    },
                },
            },
        });

        const leg = shipment.shipment_legs[0];
        if (!leg) {
            throw new Error('SHIPMENT_LEG_CREATE_FAILED');
        }

        const movement = leg.shipment_movements[0];
        if (!movement) {
            throw new Error('SHIPMENT_MOVEMENT_CREATE_FAILED');
        }

        const {
            origin_location,
            destination_location,
            logistics_partner,
            shipment_movements: _movements,
            ...legRecord
        } = leg;

        const { shipment_legs: _legs, ...shipmentRecord } = shipment;

        return {
            shipment: shipmentRecord,
            leg: legRecord,
            movement,
            logistics_partner,
            from_location: origin_location,
            to_location: destination_location,
        };
    }
}
