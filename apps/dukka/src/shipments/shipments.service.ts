import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import {
    LogisticsLocationType,
    ShipmentStatus,
    WarehouseStatus,
    type Prisma,
} from '@app/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    ACCESS_CONTROL_ERROR,
    assertActorHasScopedAccess,
    type ScopedAccessActor,
} from '../shared/access-control.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import type { MoveShipmentDto } from './dto/move-shipment.dto.js';
import { ShipmentsRepository } from './shipments.repository.js';
import {
    ALLOWED_SHIPMENT_MOVE_ROUTES,
    type LogisticsPartnerForMove,
    type MoveShipmentResult,
    type ShipmentForMove,
    type ShipmentLocationSummary,
} from './types/shipment.type.js';

@Injectable()
export class ShipmentsService {
    private readonly logger = new Logger(ShipmentsService.name);

    constructor(private readonly shipmentsRepository: ShipmentsRepository) {}

    async move(
        shipmentId: string,
        data: MoveShipmentDto,
        actor: ScopedAccessActor,
        performedBy: string,
    ): Promise<MoveShipmentResult> {
        try {
            this.logger.log(`Moving shipment ${shipmentId}`);

            const shipment = await this.shipmentsRepository.findForMove(
                shipmentId,
            );
            if (!shipment) {
                throw new NotFoundException('Shipment not found');
            }

            this.assertShipmentMovable(shipment);
            this.assertActorCanMoveFrom(actor, shipment);
            this.assertLocationActive(shipment.current_location, 'origin');

            if (shipment.current_location_id === data.to_location_id) {
                throw new BadRequestException(
                    'Destination must differ from the current location',
                );
            }

            const toLocation = await this.shipmentsRepository.findLocation(
                data.to_location_id,
            );
            if (!toLocation) {
                throw new NotFoundException('Logistics location not found');
            }
            this.assertAllowedRoute(shipment.current_location, toLocation);
            this.assertLocationActive(toLocation, 'destination');

            const partner = await this.shipmentsRepository.findPartner(
                data.logistics_partner_id,
            );
            if (!partner) {
                throw new NotFoundException('Logistics partner not found');
            }
            this.assertPartnerActive(partner);

            const expectedDeparture = new Date(data.expected_departure_date);
            const expectedArrival = new Date(data.expected_arrival_date);
            if (expectedArrival < expectedDeparture) {
                throw new BadRequestException(
                    'expected_arrival_date must be on or after expected_departure_date',
                );
            }

            const occurredAt = data.occurred_at
                ? new Date(data.occurred_at)
                : new Date();

            const result = await this.shipmentsRepository.move(shipmentId, {
                from_location_id: shipment.current_location_id,
                to_location_id: data.to_location_id,
                logistics_partner_id: data.logistics_partner_id,
                expected_departure_date: expectedDeparture,
                expected_arrival_date: expectedArrival,
                occurred_at: occurredAt,
                performed_by: performedBy,
                mark_as_shipped:
                    shipment.current_location.type ===
                    LogisticsLocationType.WAREHOUSE,
                ...(data.metadata !== undefined && {
                    metadata: data.metadata as Prisma.InputJsonValue,
                }),
            });

            this.logger.log(
                `Moved shipment ${shipmentId} ${result.from_location.type} -> ${result.to_location.type}`,
            );
            return result;
        } catch (error) {
            this.handleError(error);
        }
    }

    private assertShipmentMovable(shipment: ShipmentForMove): void {
        if (shipment.status === ShipmentStatus.CANCELLED) {
            throw new BadRequestException('Cannot move a cancelled shipment');
        }
        if (shipment.status === ShipmentStatus.DELIVERED) {
            throw new BadRequestException('Cannot move a delivered shipment');
        }
    }

    private assertActorCanMoveFrom(
        actor: ScopedAccessActor,
        shipment: ShipmentForMove,
    ): void {
        const from = shipment.current_location;
        const marketId = shipment.order.market_id;

        if (
            from.type === LogisticsLocationType.WAREHOUSE &&
            from.warehouse_id
        ) {
            assertActorHasScopedAccess(actor, {
                market_id: marketId,
                warehouse_id: from.warehouse_id,
            });
            return;
        }

        if (
            from.type === LogisticsLocationType.DISTRIBUTION_POINT &&
            from.distribution_point_id
        ) {
            assertActorHasScopedAccess(actor, {
                market_id: marketId,
                distribution_point_id: from.distribution_point_id,
            });
            return;
        }

        throw new BadRequestException(
            'Shipment cannot be moved from its current location type',
        );
    }

    private assertAllowedRoute(
        from: ShipmentLocationSummary,
        to: ShipmentLocationSummary,
    ): void {
        const allowed = ALLOWED_SHIPMENT_MOVE_ROUTES.some(
            (route) => route.from === from.type && route.to === to.type,
        );
        if (!allowed) {
            throw new BadRequestException(
                `Invalid move route: ${from.type} -> ${to.type}. Allowed: warehouse→DB, DB→DB`,
            );
        }
    }

    private assertLocationActive(
        location: ShipmentLocationSummary,
        role: 'origin' | 'destination',
    ): void {
        if (location.type === LogisticsLocationType.WAREHOUSE) {
            if (location.warehouse?.status !== WarehouseStatus.OPEN) {
                throw new BadRequestException(
                    `Cannot use an inactive warehouse as ${role}`,
                );
            }
            return;
        }

        if (location.type === LogisticsLocationType.DISTRIBUTION_POINT) {
            if (!location.distribution_point?.is_active) {
                throw new BadRequestException(
                    `Cannot use an inactive distribution point as ${role}`,
                );
            }
        }
    }

    private assertPartnerActive(partner: LogisticsPartnerForMove): void {
        if (!partner.is_active) {
            throw new BadRequestException(
                'Cannot use an inactive logistics partner',
            );
        }
    }

    private handleError(error: unknown): never {
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
            if (error.code === 'P2003' || error.code === 'P2025') {
                this.logger.warn(
                    `Shipment relation error ${error.code}: ${error.message}`,
                );
                throw this.relationNotFound(error);
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private relationNotFound(
        error: PrismaClientKnownRequestError,
    ): NotFoundException {
        switch (prismaMissingRecordModel(error)) {
            case 'shipment':
                return new NotFoundException('Shipment not found');
            case 'logisticslocation':
                return new NotFoundException('Logistics location not found');
            case 'logisticspartner':
                return new NotFoundException('Logistics partner not found');
            case 'order':
                return new NotFoundException('Order not found');
            default:
                break;
        }

        if (
            prismaHintIncludes(
                error,
                'destination_location',
                'to_location',
                'current_location',
                'logisticslocation',
            )
        ) {
            return new NotFoundException('Logistics location not found');
        }
        if (prismaHintIncludes(error, 'logistics_partner', 'logisticspartner')) {
            return new NotFoundException('Logistics partner not found');
        }
        if (prismaHintIncludes(error, 'shipment')) {
            return new NotFoundException('Shipment not found');
        }

        return new NotFoundException('Related record not found');
    }
}
