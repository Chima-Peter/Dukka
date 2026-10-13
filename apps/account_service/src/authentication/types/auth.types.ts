import type { Customer } from '../../../generated/prisma/client.js';

export type PublicCustomer = Omit<Customer, 'password'>;

export type LoginData = {
  accessToken: string;
  customer: PublicCustomer;
};
