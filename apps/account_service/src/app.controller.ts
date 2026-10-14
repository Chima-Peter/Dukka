import { Controller, Get, Logger } from '@nestjs/common';
import { Public, ResponseMessage } from '@app/common';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  @Get('health')
  @Public()
  @ResponseMessage('Health check successful')
  health() {
    this.logger.log('Health check successful');
    return { status: 'ok' };
  }
}
