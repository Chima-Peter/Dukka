import { Body, Controller, Post } from '@nestjs/common';
import { ResponseMessage } from '@app/common';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegisterDto } from './dto/register.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ResponseMessage('Customer created successfully')
  register(@Body() data: RegisterDto) {
    return this.authService.register(data);
  }

  @Post('login')
  @ResponseMessage('Login successful')
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }
}
