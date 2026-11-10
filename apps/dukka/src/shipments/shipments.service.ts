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
    OrderPaymentAttemptStatus,
    ShipmentStatus,
    WarehouseStatus,
    type Prisma,
} from '@app/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import {
    ACCESS_CONTROL_ERROR,
    assertActorHasScopedAccess,
    hasGlobalScope,
    resolveActorDistributionPointIds,
    resolveActorWarehouseIds,
    type ScopedAccessActor,
} from '../shared/access-control.js';
import {
    prismaHintIncludes,
    prismaMissingRecordModel,
} from '../shared/prisma-relation-error.js';
import type { AcknowledgeShipmentDto } from './dto/acknowledge-shipment.dto.js';
import type { CancelShipmentMovementDto } from './dto/cancel-shipment-movement.dto.js';
import type { DeliverShipmentDto } from './dto/deliver-shipment.dto.js';
import type { FindShipmentsDto } from './dto/find-shipments.dto.js';
import type { MoveShipmentDto } from './dto/move-shipment.dto.js';
import { ShipmentsRepository } from './shipments.repository.js';
import {
    ALLOWED_CUSTOMER_DELIVERY_ROUTES,
    ALLOWED_SHIPMENT_MOVE_ROUTES,
    type AcknowledgeShipmentResult,
    type CancelShipmentMovementResult,
    type DeliverShipmentResult,
    type LogisticsPartnerForMove,
    type MoveShipmentResult,
    type ShipmentDetail,
    type ShipmentForMove,
    type ShipmentListScope,
    type ShipmentLocationSummary,
    type ShipmentPage,
} from './types/shipment.type.js';

@Injectable()
export class ShipmentsService {
    private readonly logger = new Logger(ShipmentsService.name);

    constructor(private readonly shipmentsRepository: ShipmentsRepository) {}

    async findAll(
        query: FindShipmentsDto,
        actor: ScopedAccessActor,
    ): Promise<ShipmentPage> {
        try {
            this.logger.log('Fetching shipments');
            const scope = this.resolveShipmentListScope(query, actor);
            if (scope === null) {
                return { items: [], next_cursor: null };
            }
            const page = await this.shipmentsRepository.findAll(query, scope);
            this.logger.log('Fetched shipments');
            return page;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(
        id: string,
        actor: ScopedAccessActor,
    ): Promise<ShipmentDetail> {
        try {
            this.logger.log(`Fetching shipment ${id}`);
            const shipment = await this.shipmentsRepository.findDetail(id);
            if (!shipment) {
                throw new NotFoundException('Shipment not found');
            }
            this.assertActorCanAccessShipment(actor, shipment);
            this.logger.log(`Fetched shipment ${id}`);
            return shipment;
        } catch (error) {
            this.handleError(error);
        }
    }

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

            const openDispatch =
                await this.shipmentsRepository.findOpenDispatch(
                    shipment.id,
                    shipment.current_location_id,
                );
            if (openDispatch) {
                throw new BadRequestException(
                    'Cannot move a shipment that is already in transit; acknowledge receipt first',
                );
            }

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

    async deliverToCustomer(
        shipmentId: string,
        data: DeliverShipmentDto,
        actor: ScopedAccessActor,
        performedBy: string,
    ): Promise<DeliverShipmentResult> {
        try {
            this.logger.log(`Delivering shipment ${shipmentId} to customer`);

            const shipment = await this.shipmentsRepository.findForMove(
                shipmentId,
            );
            if (!shipment) {
                throw new NotFoundException('Shipment not found');
            }

            this.assertShipmentMovable(shipment);
            this.assertActorCanMoveFrom(actor, shipment);
            this.assertLocationActive(shipment.current_location, 'origin');
            this.assertCashOrderPaid(shipment);

            const openDispatch =
                await this.shipmentsRepository.findOpenDispatch(
                    shipment.id,
                    shipment.current_location_id,
                );
            if (openDispatch) {
                throw new BadRequestException(
                    'Cannot deliver a shipment that is already in transit; acknowledge or cancel first',
                );
            }

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
            this.assertCustomerDeliveryRoute(
                shipment.current_location,
                toLocation,
            );
            this.assertCustomerDestination(shipment, toLocation);

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

            const result = await this.shipmentsRepository.deliverToCustomer(
                shipmentId,
                {
                    from_location_id: shipment.current_location_id,
                    to_location_id: data.to_location_id,
                    logistics_partner_id: data.logistics_partner_id,
                    expected_departure_date: expectedDeparture,
                    expected_arrival_date: expectedArrival,
                    occurred_at: occurredAt,
                    performed_by: performedBy,
                    ...(data.metadata !== undefined && {
                        metadata: data.metadata as Prisma.InputJsonValue,
                    }),
                },
            );

            this.logger.log(`Delivered shipment ${shipmentId} to customer`);
            return result;
        } catch (error) {
            this.handleError(error);
        }
    }

    async acknowledge(
        shipmentId: string,
        data: AcknowledgeShipmentDto,
        actor: ScopedAccessActor,
        performedBy: string,
    ): Promise<AcknowledgeShipmentResult> {
        try {
            this.logger.log(`Acknowledging shipment ${shipmentId}`);

            const shipment =
                await this.shipmentsRepository.findForAcknowledge(shipmentId);
            if (!shipment) {
                throw new NotFoundException('Shipment not found');
            }

            this.assertShipmentMovable(shipment);

            const openDispatch = shipment.open_dispatch;
            if (!openDispatch) {
                throw new BadRequestException(
                    'No in-transit dispatch found to acknowledge',
                );
            }

            this.assertActorCanReceiveAt(
                actor,
                shipment.order.market_id,
                openDispatch.to_location,
            );
            this.assertLocationActive(openDispatch.to_location, 'destination');

            const occurredAt = data.occurred_at
                ? new Date(data.occurred_at)
                : new Date();

            const result = await this.shipmentsRepository.acknowledge(
                shipmentId,
                openDispatch,
                {
                    occurred_at: occurredAt,
                    performed_by: performedBy,
                    ...(data.metadata !== undefined && {
                        metadata: data.metadata as Prisma.InputJsonValue,
                    }),
                },
            );

            this.logger.log(
                `Acknowledged shipment ${shipmentId} at ${result.to_location.type}`,
            );
            return result;
        } catch (error) {
            this.handleError(error);
        }
    }

    async cancelMovement(
        shipmentId: string,
        data: CancelShipmentMovementDto,
        actor: ScopedAccessActor,
        performedBy: string,
    ): Promise<CancelShipmentMovementResult> {
        try {
            this.logger.log(`Cancelling shipment movement ${shipmentId}`);

            const shipment =
                await this.shipmentsRepository.findForAcknowledge(shipmentId);
            if (!shipment) {
                throw new NotFoundException('Shipment not found');
            }

            this.assertShipmentMovable(shipment);

            const openDispatch = shipment.open_dispatch;
            if (!openDispatch) {
                throw new BadRequestException(
                    'No in-transit dispatch found to cancel',
                );
            }

            this.assertActorCanAccessLocation(
                actor,
                shipment.order.market_id,
                openDispatch.from_location,
                'Shipment movement can only be cancelled by the origin location',
            );

            const occurredAt = data.occurred_at
                ? new Date(data.occurred_at)
                : new Date();

            const result = await this.shipmentsRepository.cancelMovement(
                shipmentId,
                openDispatch,
                {
                    occurred_at: occurredAt,
                    performed_by: performedBy,
                    ...(data.metadata !== undefined && {
                        metadata: data.metadata as Prisma.InputJsonValue,
                    }),
                },
            );

            this.logger.log(`Cancelled shipment movement ${shipmentId}`);
            return result;
        } catch (error) {
            this.handleError(error);
        }
    }

    private resolveShipmentListScope(
        query: FindShipmentsDto,
        actor: ScopedAccessActor,
    ): ShipmentListScope | null {
        if (hasGlobalScope(actor.scopes)) {
            return {};
        }

        const hasMarketScope = actor.scopes.some(
            (scope) => scope.scope_type === 'MARKET',
        );
        if (hasMarketScope) {
            if (actor.market_ids.length === 0) {
                return null;
            }
            if (
                query.market_id !== undefined &&
                !actor.market_ids.includes(query.market_id)
            ) {
                throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
            }
            return { market_ids: [...actor.market_ids] };
        }

        const warehouseIds = resolveActorWarehouseIds(actor.scopes);
        if (warehouseIds.length > 0) {
            if (
                query.warehouse_id !== undefined &&
                !warehouseIds.includes(query.warehouse_id)
            ) {
                throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
            }
            return { warehouse_ids: warehouseIds };
        }

        const distributionPointIds = resolveActorDistributionPointIds(
            actor.scopes,
        );
        if (distributionPointIds.length > 0) {
            if (
                query.distribution_point_id !== undefined &&
                !distributionPointIds.includes(query.distribution_point_id)
            ) {
                throw new Error(ACCESS_CONTROL_ERROR.INSUFFICIENT_SCOPE_ACCESS);
            }
            return { distribution_point_ids: distributionPointIds };
        }

        return null;
    }

    private assertActorCanAccessShipment(
        actor: ScopedAccessActor,
        shipment: ShipmentDetail,
    ): void {
        const current = shipment.current_location;
        if (
            current.type === LogisticsLocationType.WAREHOUSE &&
            current.warehouse_id
        ) {
            assertActorHasScopedAccess(actor, {
                market_id: shipment.order.market_id,
                warehouse_id: current.warehouse_id,
            });
            return;
        }

        if (
            current.type === LogisticsLocationType.DISTRIBUTION_POINT &&
            current.distribution_point_id
        ) {
            assertActorHasScopedAccess(actor, {
                market_id: shipment.order.market_id,
                distribution_point_id: current.distribution_point_id,
            });
            return;
        }

        assertActorHasScopedAccess(actor, {
            market_id: shipment.order.market_id,
        });
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
        this.assertActorCanAccessLocation(
            actor,
            shipment.order.market_id,
            shipment.current_location,
            'Shipment cannot be moved from its current location type',
        );
    }

    private assertActorCanReceiveAt(
        actor: ScopedAccessActor,
        marketId: string,
        location: ShipmentLocationSummary,
    ): void {
        this.assertActorCanAccessLocation(
            actor,
            marketId,
            location,
            'Shipment can only be acknowledged at a warehouse or distribution point',
        );
    }

    private assertActorCanAccessLocation(
        actor: ScopedAccessActor,
        marketId: string,
        location: ShipmentLocationSummary,
        unsupportedMessage: string,
    ): void {
        if (
            location.type === LogisticsLocationType.WAREHOUSE &&
            location.warehouse_id
        ) {
            assertActorHasScopedAccess(actor, {
                market_id: marketId,
                warehouse_id: location.warehouse_id,
            });
            return;
        }

        if (
            location.type === LogisticsLocationType.DISTRIBUTION_POINT &&
            location.distribution_point_id
        ) {
            assertActorHasScopedAccess(actor, {
                market_id: marketId,
                distribution_point_id: location.distribution_point_id,
            });
            return;
        }

        throw new BadRequestException(unsupportedMessage);
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

    private assertCustomerDeliveryRoute(
        from: ShipmentLocationSummary,
        to: ShipmentLocationSummary,
    ): void {
        const allowed = ALLOWED_CUSTOMER_DELIVERY_ROUTES.some(
            (route) => route.from === from.type && route.to === to.type,
        );
        if (!allowed) {
            throw new BadRequestException(
                `Invalid delivery route: ${from.type} -> ${to.type}. Allowed: warehouse→customer, DB→customer`,
            );
        }
    }

    private assertCustomerDestination(
        shipment: ShipmentForMove,
        to: ShipmentLocationSummary,
    ): void {
        if (to.type !== LogisticsLocationType.CUSTOMER) {
            throw new BadRequestException(
                'Delivery destination must be a customer location',
            );
        }

        if (shipment.order.customer_id === null) {
            return;
        }

        if (
            to.customer_id !== null &&
            to.customer_id !== shipment.order.customer_id
        ) {
            throw new BadRequestException(
                'Customer destination does not match the order customer',
            );
        }
    }

    private assertCashOrderPaid(shipment: ShipmentForMove): void {
        const attempt = shipment.order.order_payment_attempt;
        if (!attempt) {
            throw new BadRequestException(
                'Order has no payment attempt; cannot deliver',
            );
        }

        const isCash =
            attempt.payment_method_name.toLowerCase() === 'cash';
        if (!isCash) {
            return;
        }

        if (attempt.status !== OrderPaymentAttemptStatus.SUCCESS) {
            throw new BadRequestException(
                'Cash order must be paid before delivery to customer',
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
