import { Body, Controller, Post } from '@nestjs/common';
import { ResponseMessage } from '@app/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { CreateCustomerDto } from '../customer/dto/create-customer.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ResponseMessage('Customer created successfully')
  register(@Body() data: CreateCustomerDto) {
    return this.authService.register(data);
  }

  @Post('login')
  @ResponseMessage('Login successful')
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }
}
