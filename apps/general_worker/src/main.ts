import { ConsoleLogger, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
    const logger = new Logger('GeneralWorker');

    await NestFactory.createApplicationContext(AppModule, {
        logger: new ConsoleLogger({
            json: true,
            colors: true,
            logLevels: ['log', 'warn', 'error', 'fatal'],
        }),
    });

    logger.log('General worker started and consuming the general queue');
}

await bootstrap();
