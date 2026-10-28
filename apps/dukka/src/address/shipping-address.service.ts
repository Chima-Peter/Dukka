import {
    BadRequestException,
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { ShippingAddress } from '@app/common';
import { CustomerService } from '../customer/customer.service.js';
import { prismaHintIncludes } from '../shared/prisma-relation-error.js';
import type { CreateAddressDto } from './dto/create-address.dto.js';
import type { UpdateAddressDto } from './dto/update-address.dto.js';
import { ShippingAddressRepository } from './shipping-address.repository.js';

@Injectable()
export class ShippingAddressService {
    private readonly logger = new Logger(ShippingAddressService.name);

    constructor(
        private readonly shippingAddressRepository: ShippingAddressRepository,
        private readonly customerService: CustomerService,
    ) {}

    async create(
        customer_id: string,
        data: CreateAddressDto,
    ): Promise<ShippingAddress> {
        try {
            this.logger.log(
                `Creating shipping address for customer ${customer_id}`,
            );
            const market_id =
                await this.customerService.getActiveMarketId(customer_id);
            if (!market_id) {
                throw new BadRequestException('Active market is not set');
            }

            const address = await this.shippingAddressRepository.create(
                customer_id,
                market_id,
                data,
            );
            this.logger.log(`Shipping address created ${address.id}`);
            return address;
        } catch (error) {
            this.handleWriteError(error, 'A shipping address with this email already exists');
        }
    }

    async findAll(customer_id: string): Promise<ShippingAddress[]> {
        try {
            this.logger.log(
                `Fetching shipping addresses for customer ${customer_id}`,
            );
            return await this.shippingAddressRepository.findAllByCustomerId(
                customer_id,
            );
        } catch (error) {
            this.handleReadError(error);
        }
    }

    async findOne(customer_id: string, id: string): Promise<ShippingAddress> {
        try {
            this.logger.log(
                `Fetching shipping address ${id} for customer ${customer_id}`,
            );
            const address =
                await this.shippingAddressRepository.findByIdAndCustomerId(
                    id,
                    customer_id,
                );
            if (!address) {
                throw new NotFoundException('Shipping address not found');
            }
            return address;
        } catch (error) {
            this.handleReadError(error);
        }
    }

    async update(
        customer_id: string,
        id: string,
        data: UpdateAddressDto,
    ): Promise<ShippingAddress> {
        try {
            this.logger.log(
                `Updating shipping address ${id} for customer ${customer_id}`,
            );

            const address = await this.shippingAddressRepository.update(
                id,
                data,
            );
            this.logger.log(`Shipping address updated ${id}`);
            return address;
        } catch (error) {
            this.handleWriteError(
                error,
                'A shipping address with this email already exists',
                'Shipping address not found',
            );
        }
    }

    async delete(customer_id: string, id: string): Promise<object> {
        try {
            this.logger.log(
                `Deleting shipping address ${id} for customer ${customer_id}`,
            );

            await this.shippingAddressRepository.delete(id);
            this.logger.log(`Shipping address deleted ${id}`);
            return { data: null };
        } catch (error) {
            this.handleWriteError(
                error,
                undefined,
                'Shipping address not found',
            );
        }
    }

    private handleReadError(error: unknown): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }
        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private handleWriteError(
        error: unknown,
        conflictMessage?: string,
        notFoundMessage?: string,
    ): never {
        if (error instanceof HttpException) {
            this.logger.warn(`HTTP exception: ${error.message}`);
            throw error;
        }
        if (
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2002'
        ) {
            this.logger.warn(`Conflict error: ${error.message}`);
            throw new ConflictException(
                conflictMessage ??
                    'An address with this email already exists',
            );
        }
        if (
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2003'
        ) {
            this.throwForeignKeyNotFound(error);
        }
        if (
            error instanceof PrismaClientKnownRequestError &&
            error.code === 'P2025'
        ) {
            throw new NotFoundException(
                notFoundMessage ?? 'Shipping address not found',
            );
        }

        this.logger.error(`Internal server error: ${error}`);
        throw new InternalServerErrorException(
            'An unexpected error occurred. Try again later.',
        );
    }

    private throwForeignKeyNotFound(
        error: PrismaClientKnownRequestError,
    ): never {
        this.logger.warn(`Related record not found: ${error.message}`);

        if (prismaHintIncludes(error, 'customer_id', 'customer')) {
            throw new NotFoundException('Customer not found');
        }
        if (prismaHintIncludes(error, 'market_id', 'market')) {
            throw new NotFoundException('Market not found');
        }
        if (
            prismaHintIncludes(
                error,
                'state',
                'service_state',
                'servicestate',
            )
        ) {
            throw new NotFoundException('Service state not found');
        }

        throw new NotFoundException('Related record not found');
    }
}
