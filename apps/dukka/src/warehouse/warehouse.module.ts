import { forwardRef, Module } from '@nestjs/common';
import { NotificationPublisherModule } from '@app/common';
import { MarketsModule } from '../markets/markets.module.js';
import { ServiceModule } from '../service/service.module.js';
import { CustomerModule } from '../customer/customer.module.js';
import { StaffModule } from '../staff/staff.module.js';
import { WarehouseController } from './warehouse.controller.js';
import { WarehouseRepository } from './warehouse.repository.js';
import { WarehouseService } from './warehouse.service.js';

@Module({
    imports: [
        StaffModule,
        MarketsModule,
        NotificationPublisherModule,
        forwardRef(() => ServiceModule),
        forwardRef(() => CustomerModule),
    ],
    controllers: [WarehouseController],
    providers: [
        WarehouseService,
        WarehouseRepository,
    ],
    exports: [WarehouseService, WarehouseRepository],
})
export class WarehouseModule {}
