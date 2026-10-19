import { Module } from '@nestjs/common';
import { STAFF_PERMISSIONS_SERVICE } from '@app/common';
import { PermissionsController } from './permissions.controller.js';
import { PermissionsRepository } from './permissions.repository.js';
import { PermissionsService } from './permissions.service.js';

@Module({
    controllers: [PermissionsController],
    providers: [
        PermissionsService,
        PermissionsRepository,
        {
            provide: STAFF_PERMISSIONS_SERVICE,
            useExisting: PermissionsService,
        },
    ],
    exports: [PermissionsService, STAFF_PERMISSIONS_SERVICE],
})
export class PermissionsModule {}
