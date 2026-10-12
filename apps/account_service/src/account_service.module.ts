import { Module } from '@nestjs/common';
import { AccountServiceController } from './account_service.controller.js';
import { AccountServiceService } from './account_service.service.js';

@Module({
  imports: [],
  controllers: [AccountServiceController],
  providers: [AccountServiceService],
})
export class AccountServiceModule {}
