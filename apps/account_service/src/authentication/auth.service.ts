import {
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { dehashPassword, hashPassword } from '@app/utils';
import { CustomerService } from '../customer/customer.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import type { LoginData, PublicCustomer } from './types/index.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly customerService: CustomerService,
    private readonly jwtService: JwtService,
  ) {}

  async register(data: RegisterDto): Promise<PublicCustomer> {
    const password = await hashPassword(data.password);
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

      const isValid = await dehashPassword(data.password, customer.password);
      if (!isValid) {
        throw new UnauthorizedException('Invalid email or password');
      }

      const { password: _, ...publicCustomer } = customer;
      const accessToken = await this.jwtService.signAsync({
        sub: customer.id,
        email: customer.email,
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
