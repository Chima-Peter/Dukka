import type { Customer } from '../../../generated/prisma/client.js';

export type PublicCustomer = Omit<Customer, 'password' | 'createdAt' | 'updatedAt'>;

export type LoginData = {
  accessToken: string;
  customer: PublicCustomer;
};
