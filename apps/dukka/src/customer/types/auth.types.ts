import type { Customer } from '../../../generated/prisma/client.js';

export type PublicCustomer = Omit<
    Customer,
    'password' | 'createdAt' | 'updatedAt'
>;

export type AuthTokens = {
    accessToken: string;
    refreshToken: string;
};

export type LoginData = AuthTokens & {
    customer: PublicCustomer;
};
