import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Permission } from '../../generated/prisma/client.js';
import type { CreatePermissionDto } from './dto/create-permission.dto.js';
import type { UpdatePermissionDto } from './dto/update-permission.dto.js';
import { PermissionsRepository } from './permissions.repository.js';

@Injectable()
export class PermissionsService {
    private readonly logger = new Logger(PermissionsService.name);

    constructor(
        private readonly permissionsRepository: PermissionsRepository,
    ) {}

    async create(data: CreatePermissionDto): Promise<Permission> {
        try {
            this.logger.log(`Creating permission ${data.name}`);
            const permission = await this.permissionsRepository.create(data);
            this.logger.log(`Permission created ${permission.id}`);
            return permission;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(): Promise<Permission[]> {
        try {
            this.logger.log('Fetching permissions');
            return await this.permissionsRepository.findAll();
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<Permission> {
        try {
            this.logger.log(`Fetching permission ${id}`);
            const permission = await this.permissionsRepository.findById(id);
            if (!permission) {
                throw new NotFoundException('Permission not found');
            }
            return permission;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(
        id: string,
        data: UpdatePermissionDto,
    ): Promise<Permission> {
        try {
            this.logger.log(`Updating permission ${id}`);
            const permission = await this.permissionsRepository.update(
                id,
                data,
            );
            this.logger.log(`Permission updated ${id}`);
            return permission;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<object> {
        try {
            this.logger.log(`Deleting permission ${id}`);
            await this.permissionsRepository.delete(id);
            this.logger.log(`Permission deleted ${id}`);
            return { data: null };
        } catch (error) {
            this.handleError(error);
        }
    }

    private handleError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }

        if (error instanceof PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'A permission with this name already exists',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(
                    `Foreign key constraint on permission delete: ${error.message}`,
                );
                throw new ConflictException(
                    'Permission cannot be deleted while it is still assigned to a role',
                );
            }
            if (error.code === 'P2025') {
                throw new NotFoundException('Permission not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
