import { Module } from '@nestjs/common';
import { GeneralProcessor } from './general.processor.js';

@Module({
    providers: [GeneralProcessor],
})
export class GeneralModule {}
