import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { Role } from '../../generated/prisma/client.js';
import type { CreateRoleDto } from './dto/create-role.dto.js';
import type { UpdateRoleDto } from './dto/update-role.dto.js';
import { RolesRepository } from './roles.repository.js';

@Injectable()
export class RolesService {
    private readonly logger = new Logger(RolesService.name);

    constructor(private readonly rolesRepository: RolesRepository) {}

    async create(data: CreateRoleDto): Promise<Role> {
        try {
            this.logger.log(`Creating role ${data.name}`);
            const role = await this.rolesRepository.create(data);
            this.logger.log(`Role created ${role.id}`);
            return role;
        } catch (error) {
            this.handleError(error);
        }
    }

    async findAll(): Promise<Role[]> {
        try {
            this.logger.log('Fetching roles');
            return await this.rolesRepository.findAll();
        } catch (error) {
            this.handleError(error);
        }
    }

    async findOne(id: string): Promise<Role> {
        try {
            this.logger.log(`Fetching role ${id}`);
            const role = await this.rolesRepository.findById(id);
            if (!role) {
                throw new NotFoundException('Role not found');
            }
            return role;
        } catch (error) {
            this.handleError(error);
        }
    }

    async update(id: string, data: UpdateRoleDto): Promise<Role> {
        try {
            this.logger.log(`Updating role ${id}`);
            const role = await this.rolesRepository.update(id, data);
            this.logger.log(`Role updated ${id}`);
            return role;
        } catch (error) {
            this.handleError(error);
        }
    }

    async delete(id: string): Promise<object> {
        try {
            this.logger.log(`Deleting role ${id}`);
            await this.rolesRepository.delete(id);
            this.logger.log(`Role deleted ${id}`);
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
                    'A role with this name already exists',
                );
            }
            if (error.code === 'P2003') {
                this.logger.warn(
                    `Foreign key constraint on role delete: ${error.message}`,
                );
                throw new ConflictException(
                    'Role cannot be deleted while it is still assigned to staff',
                );
            }
            if (error.code === 'P2025') {
                throw new NotFoundException('Role not found');
            }
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }
}
