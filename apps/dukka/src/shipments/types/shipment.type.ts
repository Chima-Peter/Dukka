import type {
    LogisticsLocation,
    LogisticsLocationType,
    LogisticsPartner,
    OrderStatus,
    Prisma,
    Shipment,
    ShipmentLeg,
    ShipmentMovement,
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

export type ShipmentForMove = Shipment & {
    current_location: ShipmentLocationSummary;
    order: {
        id: string;
        status: OrderStatus;
        market_id: string;
        customer_id: string | null;
        warehouse_id: string;
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

export type MoveShipmentResult = {
    shipment: Shipment;
    leg: ShipmentLeg;
    movement: ShipmentMovement;
    logistics_partner: Pick<LogisticsPartner, 'id' | 'name' | 'code'>;
    from_location: ShipmentLocationSummary;
    to_location: ShipmentLocationSummary;
};

export type LogisticsPartnerForMove = Pick<
    LogisticsPartner,
    'id' | 'name' | 'code' | 'is_active'
>;

export const ALLOWED_SHIPMENT_MOVE_ROUTES: ReadonlyArray<{
    from: LogisticsLocationType;
    to: LogisticsLocationType;
}> = [
    { from: 'WAREHOUSE', to: 'DISTRIBUTION_POINT' },
    { from: 'DISTRIBUTION_POINT', to: 'DISTRIBUTION_POINT' },
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

export const shipmentForMoveInclude = {
    current_location: { select: shipmentLocationSelect },
    order: {
        select: {
            id: true,
            status: true,
            market_id: true,
            customer_id: true,
            warehouse_id: true,
        },
    },
} as const;
