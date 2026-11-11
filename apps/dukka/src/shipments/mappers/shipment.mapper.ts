import { ShipmentStatus, type Prisma } from '@app/common';
import {
    shipmentLocationBriefSelect,
    shipmentLocationSelect,
    type ShipmentActionSummary,
    type ShipmentDetail,
    type ShipmentDetailLeg,
    type ShipmentDetailMovement,
    type ShipmentLegSummary,
    type ShipmentMovementSummary,
    type ShipmentSummary,
    type ShipmentTrackingDetail,
} from '../types/shipment.type.js';

export const shipmentSummarySelect = {
    id: true,
    tracking_number: true,
    status: true,
    estimated_delivery_date: true,
    actual_delivery_date: true,
    order_id: true,
    created_at: true,
    updated_at: true,
    current_location: { select: shipmentLocationBriefSelect },
    order: {
        select: {
            status: true,
            order_number: true,
        },
    },
} satisfies Prisma.ShipmentSelect;

export const shipmentDetailSelect = {
    id: true,
    tracking_number: true,
    status: true,
    estimated_delivery_date: true,
    actual_delivery_date: true,
    order_id: true,
    created_at: true,
    updated_at: true,
    origin_location: { select: shipmentLocationSelect },
    destination_location: { select: shipmentLocationSelect },
    current_location: { select: shipmentLocationSelect },
    order: {
        select: {
            id: true,
            status: true,
            order_number: true,
            market_id: true,
            customer_id: true,
            warehouse_id: true,
            shipping_address: true,
        },
    },
    shipment_legs: {
        orderBy: [
            { created_at: 'asc' as const },
            { id: 'asc' as const },
        ],
        select: {
            id: true,
            expected_departure_date: true,
            actual_departure_date: true,
            expected_arrival_date: true,
            actual_arrival_date: true,
            created_at: true,
            updated_at: true,
            origin_location: { select: shipmentLocationBriefSelect },
            destination_location: { select: shipmentLocationBriefSelect },
            logistics_partner: {
                select: {
                    id: true,
                    name: true,
                    code: true,
                },
            },
        },
    },
    shipment_movements: {
        orderBy: [
            { occurred_at: 'asc' as const },
            { id: 'asc' as const },
        ],
        select: {
            id: true,
            movement_type: true,
            performed_by: true,
            occurred_at: true,
            recorded_at: true,
            metadata: true,
            shipment_leg_id: true,
            created_at: true,
            from_location: { select: shipmentLocationBriefSelect },
            to_location: { select: shipmentLocationBriefSelect },
        },
    },
} satisfies Prisma.ShipmentSelect;

export const shipmentTrackingSelect = {
    tracking_number: true,
    status: true,
    order: {
        select: {
            order_number: true,
        },
    },
    shipment_movements: {
        orderBy: [
            { occurred_at: 'asc' as const },
            { id: 'asc' as const },
        ],
        select: {
            id: true,
            movement_type: true,
            occurred_at: true,
            from_location: { select: shipmentLocationBriefSelect },
            to_location: { select: shipmentLocationBriefSelect },
        },
    },
} satisfies Prisma.ShipmentSelect;

export const shipmentActionSelect = {
    id: true,
    tracking_number: true,
    status: true,
    order_id: true,
    estimated_delivery_date: true,
    actual_delivery_date: true,
    created_at: true,
    updated_at: true,
} satisfies Prisma.ShipmentSelect;

export const shipmentLegSummarySelect = {
    id: true,
    expected_departure_date: true,
    actual_departure_date: true,
    expected_arrival_date: true,
    actual_arrival_date: true,
    created_at: true,
    updated_at: true,
} satisfies Prisma.ShipmentLegSelect;

export const shipmentMovementSummarySelect = {
    id: true,
    movement_type: true,
    performed_by: true,
    occurred_at: true,
    recorded_at: true,
    metadata: true,
    shipment_leg_id: true,
    created_at: true,
} satisfies Prisma.ShipmentMovementSelect;

export const logisticsPartnerBriefSelect = {
    id: true,
    name: true,
    code: true,
} as const;

export const mutationLegSelect = {
    ...shipmentLegSummarySelect,
    origin_location: { select: shipmentLocationSelect },
    destination_location: { select: shipmentLocationSelect },
    logistics_partner: { select: logisticsPartnerBriefSelect },
    shipment_movements: {
        orderBy: [{ created_at: 'desc' as const }, { id: 'desc' as const }],
        take: 1,
        select: shipmentMovementSummarySelect,
    },
} satisfies Prisma.ShipmentLegSelect;

type ShipmentSummaryRow = Prisma.ShipmentGetPayload<{
    select: typeof shipmentSummarySelect;
}>;

type ShipmentDetailRow = Prisma.ShipmentGetPayload<{
    select: typeof shipmentDetailSelect;
}>;

type ShipmentTrackingRow = Prisma.ShipmentGetPayload<{
    select: typeof shipmentTrackingSelect;
}>;

type ShipmentActionRow = Prisma.ShipmentGetPayload<{
    select: typeof shipmentActionSelect;
}>;

type ShipmentLegSummaryRow = Prisma.ShipmentLegGetPayload<{
    select: typeof shipmentLegSummarySelect;
}>;

type ShipmentMovementSummaryRow = Prisma.ShipmentMovementGetPayload<{
    select: typeof shipmentMovementSummarySelect;
}>;

export function toShipmentSummary(row: ShipmentSummaryRow): ShipmentSummary {
    return {
        id: row.id,
        tracking_number: row.tracking_number,
        status: row.status,
        estimated_delivery_date: row.estimated_delivery_date,
        actual_delivery_date: row.actual_delivery_date,
        order_id: row.order_id,
        order_status: row.order.status,
        order_number: row.order.order_number,
        current_location: row.current_location,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toShipmentDetail(row: ShipmentDetailRow): ShipmentDetail {
    return {
        id: row.id,
        tracking_number: row.tracking_number,
        status: row.status,
        estimated_delivery_date: row.estimated_delivery_date,
        actual_delivery_date: row.actual_delivery_date,
        order_id: row.order_id,
        origin_location: row.origin_location,
        destination_location: row.destination_location,
        current_location: row.current_location,
        order: row.order,
        shipment_legs: row.shipment_legs.map(toShipmentDetailLeg),
        shipment_movements: row.shipment_movements.map(toShipmentDetailMovement),
        created_at: row.created_at,
        updated_at: row.updated_at,
        ...(row.status === ShipmentStatus.DELIVERED && {
            why: 'Shipment has already been delivered to the customer',
        }),
        ...(row.status === ShipmentStatus.CANCELLED && {
            why: 'Shipment was cancelled and cannot be progressed further',
        }),
    };
}

export function toShipmentTrackingDetail(
    row: ShipmentTrackingRow,
): ShipmentTrackingDetail {
    return {
        tracking_number: row.tracking_number,
        status: row.status,
        order_number: row.order.order_number,
        shipment_movements: row.shipment_movements,
    };
}

export function toShipmentActionSummary(
    row: ShipmentActionRow,
): ShipmentActionSummary {
    return {
        id: row.id,
        tracking_number: row.tracking_number,
        status: row.status,
        order_id: row.order_id,
        estimated_delivery_date: row.estimated_delivery_date,
        actual_delivery_date: row.actual_delivery_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toShipmentLegSummary(
    row: ShipmentLegSummaryRow,
): ShipmentLegSummary {
    return {
        id: row.id,
        expected_departure_date: row.expected_departure_date,
        actual_departure_date: row.actual_departure_date,
        expected_arrival_date: row.expected_arrival_date,
        actual_arrival_date: row.actual_arrival_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
    };
}

export function toShipmentMovementSummary(
    row: ShipmentMovementSummaryRow,
): ShipmentMovementSummary {
    return {
        id: row.id,
        movement_type: row.movement_type,
        performed_by: row.performed_by,
        occurred_at: row.occurred_at,
        recorded_at: row.recorded_at,
        metadata: row.metadata,
        shipment_leg_id: row.shipment_leg_id,
        created_at: row.created_at,
    };
}

function toShipmentDetailLeg(
    row: ShipmentDetailRow['shipment_legs'][number],
): ShipmentDetailLeg {
    return {
        id: row.id,
        expected_departure_date: row.expected_departure_date,
        actual_departure_date: row.actual_departure_date,
        expected_arrival_date: row.expected_arrival_date,
        actual_arrival_date: row.actual_arrival_date,
        created_at: row.created_at,
        updated_at: row.updated_at,
        origin_location: row.origin_location,
        destination_location: row.destination_location,
        logistics_partner: row.logistics_partner,
    };
}

function toShipmentDetailMovement(
    row: ShipmentDetailRow['shipment_movements'][number],
): ShipmentDetailMovement {
    return {
        id: row.id,
        movement_type: row.movement_type,
        performed_by: row.performed_by,
        occurred_at: row.occurred_at,
        recorded_at: row.recorded_at,
        metadata: row.metadata,
        shipment_leg_id: row.shipment_leg_id,
        created_at: row.created_at,
        from_location: row.from_location,
        to_location: row.to_location,
    };
}
