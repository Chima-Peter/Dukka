export type JwtSubjectType = 'customer' | 'staff';
export type JwtTokenUse = 'access' | 'refresh';

interface JwtPayloadBase {
    sub: string;
    email: string;
    tokenUse: JwtTokenUse;
    iat?: number;
    exp?: number;
}

export interface CustomerJwtPayload extends JwtPayloadBase {
    type: 'customer';
    name: string;
    cart_id: string;
}

export type StaffJwtScopeType =
    | 'GLOBAL'
    | 'MARKET'
    | 'WAREHOUSE'
    | 'DISTRIBUTION_POINT';

export type StaffJwtScope = {
    scope_type: StaffJwtScopeType;
    market_id: string | null;
    warehouse_id: string | null;
    distribution_point_id: string | null;
};

export interface StaffJwtPayload extends JwtPayloadBase {
    type: 'staff';
    name: string;
    role_id: string | null;
    role_name: string | null;
    hierarchy: number | null;
    scope_type: StaffJwtScopeType | null;
    scopes: StaffJwtScope[];
    market_ids: string[];
    permissions: string[];
}

export type JwtPayload = CustomerJwtPayload | StaffJwtPayload;
