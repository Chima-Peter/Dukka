import type {
    LogisticsLocation,
    LogisticsLocationType,
    LogisticsPartner,
    OrderStatus,
    Prisma,
    Shipment,
    ShipmentLeg,
    ShipmentMovement,
    ShipmentStatus,
    WarehouseStatus,
} from '@app/common';

export type ShipmentLocationSummary = Pick<
    LogisticsLocation,
    | 'id'
    | 'type'
    | 'name'
    | 'warehouse_id'
    | 'distribution_point_id'
    | 'customer_id'
> & {
    warehouse: { id: string; status: WarehouseStatus } | null;
    distribution_point: { id: string; is_active: boolean } | null;
};

export type ShipmentOrderSummary = {
    id: string;
    status: OrderStatus;
    order_number: string;
    market_id: string;
    customer_id: string | null;
    warehouse_id: string;
    shipping_address: Prisma.JsonValue;
};

export type ShipmentOrderPaymentSummary = {
    status: string;
    payment_method_name: string;
} | null;

export type ShipmentForMove = Shipment & {
    current_location: ShipmentLocationSummary;
    order: {
        id: string;
        status: OrderStatus;
        order_number: string;
        market_id: string;
        customer_id: string | null;
        warehouse_id: string;
        order_payment_attempt: ShipmentOrderPaymentSummary;
    };
};

export type MoveShipmentInput = {
    from_location_id: string;
    to_location_id: string;
    logistics_partner_id: string;
    expected_departure_date: Date;
    expected_arrival_date: Date;
    occurred_at: Date;
    performed_by: string;
    mark_as_shipped: boolean;
    metadata?: Prisma.InputJsonValue;
};

export type DeliverShipmentInput = {
    from_location_id: string;
    to_location_id: string;
    logistics_partner_id: string;
    expected_departure_date: Date;
    expected_arrival_date: Date;
    occurred_at: Date;
    performed_by: string;
    metadata?: Prisma.InputJsonValue;
};

export type ShipmentActionSummary = {
    id: string;
    tracking_number: string;
    status: ShipmentStatus;
    order_id: string;
    estimated_delivery_date: Date | null;
    actual_delivery_date: Date | null;
    created_at: Date;
    updated_at: Date;
};

export type ShipmentLegSummary = {
    id: string;
    expected_departure_date: Date;
    actual_departure_date: Date | null;
    expected_arrival_date: Date;
    actual_arrival_date: Date | null;
    created_at: Date;
    updated_at: Date;
};

export type ShipmentMovementSummary = {
    id: string;
    movement_type: ShipmentMovement['movement_type'];
    performed_by: string;
    occurred_at: Date;
    recorded_at: Date;
    metadata: Prisma.JsonValue | null;
    shipment_leg_id: string;
    created_at: Date;
};

export type MoveShipmentResult = {
    shipment: ShipmentActionSummary;
    leg: ShipmentLegSummary;
    movement: ShipmentMovementSummary;
    logistics_partner: Pick<LogisticsPartner, 'id' | 'name' | 'code'>;
    from_location: ShipmentLocationSummary;
    to_location: ShipmentLocationSummary;
};

export type DeliverShipmentResult = MoveShipmentResult;

export type AcknowledgeShipmentInput = {
    occurred_at: Date;
    performed_by: string;
    metadata?: Prisma.InputJsonValue;
};

export type AcknowledgeShipmentResult = {
    shipment: ShipmentActionSummary;
    leg: ShipmentLegSummary;
    movement: ShipmentMovementSummary;
    from_location: ShipmentLocationSummary;
    to_location: ShipmentLocationSummary;
};

export type CancelShipmentMovementInput = AcknowledgeShipmentInput;

export type CancelShipmentMovementResult = AcknowledgeShipmentResult;

export type OpenDispatchMovement = ShipmentMovement & {
    from_location: ShipmentLocationSummary;
    to_location: ShipmentLocationSummary;
    shipment_leg: ShipmentLeg;
};

export type ShipmentForAcknowledge = ShipmentForMove & {
    open_dispatch: OpenDispatchMovement | null;
};

export type LogisticsPartnerForMove = Pick<
    LogisticsPartner,
    'id' | 'name' | 'code' | 'is_active'
>;

export type ShipmentSummary = {
    id: string;
    tracking_number: string;
    status: ShipmentStatus;
    estimated_delivery_date: Date | null;
    actual_delivery_date: Date | null;
    order_id: string;
    order_status: OrderStatus;
    order_number: string;
    current_location: Pick<LogisticsLocation, 'id' | 'type' | 'name'>;
    created_at: Date;
    updated_at: Date;
};

export type ShipmentDetailLeg = ShipmentLegSummary & {
    origin_location: Pick<LogisticsLocation, 'id' | 'type' | 'name'>;
    destination_location: Pick<LogisticsLocation, 'id' | 'type' | 'name'>;
    logistics_partner: Pick<LogisticsPartner, 'id' | 'name' | 'code'>;
};

export type ShipmentDetailMovement = ShipmentMovementSummary & {
    from_location: Pick<LogisticsLocation, 'id' | 'type' | 'name'>;
    to_location: Pick<LogisticsLocation, 'id' | 'type' | 'name'>;
};

export type ShipmentDetail = {
    id: string;
    tracking_number: string;
    status: ShipmentStatus;
    estimated_delivery_date: Date | null;
    actual_delivery_date: Date | null;
    order_id: string;
    origin_location: ShipmentLocationSummary | null;
    destination_location: ShipmentLocationSummary | null;
    current_location: ShipmentLocationSummary;
    order: ShipmentOrderSummary;
    shipment_legs: ShipmentDetailLeg[];
    shipment_movements: ShipmentDetailMovement[];
    created_at: Date;
    updated_at: Date;
    why?: string;
};

export type ShipmentTrackingMovement = {
    id: string;
    movement_type: ShipmentMovement['movement_type'];
    occurred_at: Date;
    from_location: Pick<LogisticsLocation, 'id' | 'type' | 'name'>;
    to_location: Pick<LogisticsLocation, 'id' | 'type' | 'name'>;
};

export type ShipmentTrackingDetail = {
    tracking_number: string;
    status: ShipmentStatus;
    order_number: string;
    shipment_movements: ShipmentTrackingMovement[];
};

export type ShipmentPage = {
    items: ShipmentSummary[];
    next_cursor: string | null;
};

export type ShipmentListScope = {
    market_ids?: string[];
    warehouse_ids?: string[];
    distribution_point_ids?: string[];
};

export const ALLOWED_SHIPMENT_MOVE_ROUTES: ReadonlyArray<{
    from: LogisticsLocationType;
    to: LogisticsLocationType;
}> = [
    { from: 'WAREHOUSE', to: 'DISTRIBUTION_POINT' },
    { from: 'DISTRIBUTION_POINT', to: 'DISTRIBUTION_POINT' },
] as const;

export const ALLOWED_CUSTOMER_DELIVERY_ROUTES: ReadonlyArray<{
    from: LogisticsLocationType;
    to: LogisticsLocationType;
}> = [
    { from: 'WAREHOUSE', to: 'CUSTOMER' },
    { from: 'DISTRIBUTION_POINT', to: 'CUSTOMER' },
] as const;

export const shipmentLocationSelect = {
    id: true,
    type: true,
    name: true,
    warehouse_id: true,
    distribution_point_id: true,
    customer_id: true,
    warehouse: {
        select: {
            id: true,
            status: true,
        },
    },
    distribution_point: {
        select: {
            id: true,
            is_active: true,
        },
    },
} as const;

export const shipmentLocationBriefSelect = {
    id: true,
    type: true,
    name: true,
} as const;

export const shipmentForMoveInclude = {
    current_location: { select: shipmentLocationSelect },
    order: {
        select: {
            id: true,
            status: true,
            order_number: true,
            market_id: true,
            customer_id: true,
            warehouse_id: true,
            order_payment_attempt: {
                select: {
                    status: true,
                    payment_method_name: true,
                },
            },
        },
    },
} as const;

export const openDispatchInclude = {
    from_location: { select: shipmentLocationSelect },
    to_location: { select: shipmentLocationSelect },
    shipment_leg: true,
} as const;
