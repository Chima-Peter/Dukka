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

export interface StaffJwtPayload extends JwtPayloadBase {
    type: 'staff';
    name: string;
    role_id: string | null;
    role_name: string | null;
    hierarchy: number | null;
    market_ids: string[];
}

export type JwtPayload = CustomerJwtPayload | StaffJwtPayload;
