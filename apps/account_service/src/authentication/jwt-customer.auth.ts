import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import { CustomerService } from '../customer/customer.service.js';
import { CustomerJwtPayload } from '@app/common';

@Injectable()
export class JwtCustomerAuth extends JwtBearerProvider<CustomerJwtPayload> {
  constructor(
    private readonly customerService: CustomerService,
    registry: AuthenticationRegistry,
  ) {
    super({ realm: 'dukka' });
    registry.registerProvider(this);
  }

  protected async validate(claims: JwtClaims): Promise<CustomerJwtPayload | null> {
    if (!claims.sub) {
      return null;
    }

    if (claims.type !== 'customer') {
      return null;
    }

    return {
      sub: claims.sub,
      type: 'customer',
      name: claims.name as string,
      email: claims.email as string,
    };
  }
}
