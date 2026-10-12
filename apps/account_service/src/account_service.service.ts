import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountServiceService {
  getHello(): string {
    return 'Hello World!';
  }
}
