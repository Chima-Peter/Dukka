import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CustomerService } from '../customer/customer.service.js';
import type { LoginDto } from './dto/login.dto.js';
import { PasswordHasher } from '../shared/index.js';
import type { LoginData, PublicCustomer } from './types/index.js';
import { CreateCustomerDto } from '../customer/dto/create-customer.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly customerService: CustomerService,
    private readonly jwtService: JwtService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async register(data: CreateCustomerDto): Promise<PublicCustomer> {
    const password = await this.passwordHasher.hash(data.password);
    const customer = await this.customerService.create({
      ...data,
      password,
    });
    const { password: _, ...publicCustomer } = customer;

    return publicCustomer;
  }

  async login(data: LoginDto): Promise<LoginData> {
    try {
      const customer = await this.customerService.findByEmail(data.email);
      if (!customer) {
        throw new UnauthorizedException('Invalid email or password');
      }
      const isValid = await this.passwordHasher.verify(
        data.password,
        customer.password,
      );
      if (!customer || !isValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const { password: _, ...publicCustomer } = customer;
      const accessToken = await this.jwtService.signAsync({
        sub: customer.id,
        email: customer.email,
        type: 'customer',
      });

      return { accessToken, customer: publicCustomer };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred. Try again later.',
      );
    }
  }
}
