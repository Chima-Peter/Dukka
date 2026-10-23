import { SetMetadata } from '@nestjs/common';

export const OPTIONAL_CUSTOMER_AUTH_KEY = 'optionalCustomerAuth';

export const OptionalCustomerAuth = () =>
    SetMetadata(OPTIONAL_CUSTOMER_AUTH_KEY, true);
