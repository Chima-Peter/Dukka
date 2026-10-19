export type JwtSubjectType = 'customer' | 'staff';

interface JwtPayloadBase {
    sub: string;
    email: string;
    iat?: number;
    exp?: number;
}

export interface CustomerJwtPayload extends JwtPayloadBase {
    type: 'customer';
    name: string;
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
