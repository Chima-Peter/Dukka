export type JwtSubjectType = 'customer';

export interface JwtPayload {
  sub: string;
  email: string;
  type: JwtSubjectType;
  iat?: number;
  exp?: number;
}

export interface CustomerJwtPayload extends JwtPayload {
  type: 'customer';
}
