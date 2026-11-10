import { Injectable } from '@nestjs/common';
import {
    OrderStatus,
    Prisma,
    PrismaService,
    ShipmentMovementType,
    ShipmentStatus,
} from '@app/common';
import type { FindShipmentsDto } from './dto/find-shipments.dto.js';
import {
    openDispatchInclude,
    shipmentDetailInclude,
    shipmentForMoveInclude,
    shipmentLocationSelect,
    shipmentSummarySelect,
    type AcknowledgeShipmentInput,
    type AcknowledgeShipmentResult,
    type CancelShipmentMovementInput,
    type CancelShipmentMovementResult,
    type LogisticsPartnerForMove,
    type MoveShipmentInput,
    type MoveShipmentResult,
    type OpenDispatchMovement,
    type ShipmentDetail,
    type ShipmentForAcknowledge,
    type ShipmentForMove,
    type ShipmentListScope,
    type ShipmentLocationSummary,
    type ShipmentPage,
    type ShipmentSummary,
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

    async findForAcknowledge(
        id: string,
    ): Promise<ShipmentForAcknowledge | null> {
        const shipment = await this.prisma.shipment.findUnique({
            where: { id },
            include: shipmentForMoveInclude,
        });
        if (!shipment) {
            return null;
        }

        const openDispatch = await this.findOpenDispatch(
            shipment.id,
            shipment.current_location_id,
        );

        return {
            ...shipment,
            open_dispatch: openDispatch,
        };
    }

    async findOpenDispatch(
        shipmentId: string,
        fromLocationId: string,
    ): Promise<OpenDispatchMovement | null> {
        return await this.prisma.shipmentMovement.findFirst({
            where: {
                shipment_id: shipmentId,
                movement_type: ShipmentMovementType.DISPATCH,
                from_location_id: fromLocationId,
            },
            include: openDispatchInclude,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
        });
    }

    async findDetail(id: string): Promise<ShipmentDetail | null> {
        const shipment = await this.prisma.shipment.findUnique({
            where: { id },
            include: shipmentDetailInclude,
        });
        if (!shipment) {
            return null;
        }

        return {
            ...shipment,
            ...(shipment.status === ShipmentStatus.DELIVERED && {
                why: 'Shipment has already been delivered to the customer',
            }),
            ...(shipment.status === ShipmentStatus.CANCELLED && {
                why: 'Shipment was cancelled and cannot be progressed further',
            }),
        };
    }

    async findAll(
        query: FindShipmentsDto,
        scope: ShipmentListScope,
    ): Promise<ShipmentPage> {
        const limit = query.limit ?? 50;
        const andFilters: Prisma.ShipmentWhereInput[] = [];

        if (query.status !== undefined) {
            andFilters.push({ status: query.status });
        }
        if (query.tracking_number !== undefined) {
            andFilters.push({
                tracking_number: {
                    contains: query.tracking_number,
                    mode: 'insensitive',
                },
            });
        }
        if (query.carrier !== undefined) {
            andFilters.push({
                carrier: {
                    contains: query.carrier,
                    mode: 'insensitive',
                },
            });
        }
        if (query.order_id !== undefined) {
            andFilters.push({ order_id: query.order_id });
        }
        if (query.market_id !== undefined) {
            andFilters.push({
                OR: [
                    {
                        current_location: {
                            warehouse: { market_id: query.market_id },
                        },
                    },
                    {
                        current_location: {
                            distribution_point: {
                                market_id: query.market_id,
                            },
                        },
                    },
                ],
            });
        }
        if (query.warehouse_id !== undefined) {
            andFilters.push({
                current_location: {
                    warehouse_id: query.warehouse_id,
                },
            });
        }
        if (query.distribution_point_id !== undefined) {
            andFilters.push({
                current_location: {
                    distribution_point_id: query.distribution_point_id,
                },
            });
        }

        const scopeWhere = this.buildScopeWhere(scope);
        if (Object.keys(scopeWhere).length > 0) {
            andFilters.push(scopeWhere);
        }

        const where: Prisma.ShipmentWhereInput =
            andFilters.length > 0 ? { AND: andFilters } : {};

        const records = await this.prisma.shipment.findMany({
            where,
            select: shipmentSummarySelect,
            orderBy: [{ created_at: 'desc' }, { id: 'desc' }],
            take: limit + 1,
            ...(query.cursor !== undefined && {
                cursor: { id: query.cursor },
                skip: 1,
            }),
        });

        const hasMore = records.length > limit;
        const sliced = hasMore ? records.slice(0, limit) : records;
        const items: ShipmentSummary[] = sliced.map((record) => {
            const { order, ...rest } = record;
            return {
                ...rest,
                order_status: order.status,
                order_number: order.order_number,
            };
        });

        return {
            items,
            next_cursor: hasMore ? items[items.length - 1]!.id : null,
        };
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
                destination_location: {
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

    async acknowledge(
        shipmentId: string,
        openDispatch: OpenDispatchMovement,
        input: AcknowledgeShipmentInput,
    ): Promise<AcknowledgeShipmentResult> {
        const shipment = await this.prisma.shipment.update({
            where: { id: shipmentId },
            data: {
                destination_location: { disconnect: true },
                origin_location: {
                    connect: { id: openDispatch.to_location_id },
                },
                current_location: {
                    connect: { id: openDispatch.to_location_id },
                },
                shipment_movements: {
                    update: {
                        where: { id: openDispatch.id },
                        data: {
                            movement_type: ShipmentMovementType.RECEIVED,
                            performed_by: input.performed_by,
                            occurred_at: input.occurred_at,
                            recorded_at: new Date(),
                            ...(input.metadata !== undefined && {
                                metadata: input.metadata,
                            }),
                        },
                    },
                },
                shipment_legs: {
                    update: {
                        where: { id: openDispatch.shipment_leg_id },
                        data: {
                            actual_arrival_date: input.occurred_at,
                        },
                    },
                },
            },
            include: {
                current_location: { select: shipmentLocationSelect },
                shipment_movements: {
                    where: { id: openDispatch.id },
                    take: 1,
                },
                shipment_legs: {
                    where: { id: openDispatch.shipment_leg_id },
                    take: 1,
                },
            },
        });

        const movement = shipment.shipment_movements[0];
        const leg = shipment.shipment_legs[0];
        if (!movement || !leg) {
            throw new Error('SHIPMENT_ACKNOWLEDGE_FAILED');
        }

        const {
            current_location: _current,
            shipment_movements: _movements,
            shipment_legs: _legs,
            ...shipmentRecord
        } = shipment;

        return {
            shipment: shipmentRecord,
            leg,
            movement,
            from_location: openDispatch.from_location,
            to_location: openDispatch.to_location,
        };
    }

    async cancelMovement(
        shipmentId: string,
        openDispatch: OpenDispatchMovement,
        input: CancelShipmentMovementInput,
    ): Promise<CancelShipmentMovementResult> {
        const shipment = await this.prisma.shipment.update({
            where: { id: shipmentId },
            data: {
                destination_location: { disconnect: true },
                shipment_movements: {
                    update: {
                        where: { id: openDispatch.id },
                        data: {
                            movement_type: ShipmentMovementType.CANCELLED,
                            performed_by: input.performed_by,
                            occurred_at: input.occurred_at,
                            recorded_at: new Date(),
                            ...(input.metadata !== undefined && {
                                metadata: input.metadata,
                            }),
                        },
                    },
                },
                shipment_legs: {
                    update: {
                        where: { id: openDispatch.shipment_leg_id },
                        data: {
                            actual_departure_date: null,
                            actual_arrival_date: null,
                        },
                    },
                },
            },
            include: {
                shipment_movements: {
                    where: { id: openDispatch.id },
                    take: 1,
                },
                shipment_legs: {
                    where: { id: openDispatch.shipment_leg_id },
                    take: 1,
                },
            },
        });

        const movement = shipment.shipment_movements[0];
        const leg = shipment.shipment_legs[0];
        if (!movement || !leg) {
            throw new Error('SHIPMENT_CANCEL_MOVEMENT_FAILED');
        }

        const {
            shipment_movements: _movements,
            shipment_legs: _legs,
            ...shipmentRecord
        } = shipment;

        return {
            shipment: shipmentRecord,
            leg,
            movement,
            from_location: openDispatch.from_location,
            to_location: openDispatch.to_location,
        };
    }

    private buildScopeWhere(
        scope: ShipmentListScope,
    ): Prisma.ShipmentWhereInput {
        if (scope.market_ids !== undefined) {
            return {
                OR: [
                    {
                        current_location: {
                            warehouse: {
                                market_id: { in: scope.market_ids },
                            },
                        },
                    },
                    {
                        current_location: {
                            distribution_point: {
                                market_id: { in: scope.market_ids },
                            },
                        },
                    },
                ],
            };
        }

        if (scope.warehouse_ids !== undefined) {
            return {
                current_location: {
                    warehouse_id: { in: scope.warehouse_ids },
                },
            };
        }

        if (scope.distribution_point_ids !== undefined) {
            return {
                current_location: {
                    distribution_point_id: {
                        in: scope.distribution_point_ids,
                    },
                },
            };
        }

        return {};
    }
}
