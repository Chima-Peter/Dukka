import {
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
} from '@nestjs/common';
import type { Permission } from '../../generated/prisma/client.js';
import { PermissionsRepository } from './permissions.repository.js';

@Injectable()
export class PermissionsService {
    private readonly logger = new Logger(PermissionsService.name);

    constructor(
        private readonly permissionsRepository: PermissionsRepository,
    ) {}

    async findAll(): Promise<Permission[]> {
        try {
            this.logger.log('Fetching permissions');
            return await this.permissionsRepository.findAll();
        } catch (error) {
            this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
