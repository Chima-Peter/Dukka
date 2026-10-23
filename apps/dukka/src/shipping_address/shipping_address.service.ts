import {
    ConflictException,
    HttpException,
    Injectable,
    InternalServerErrorException,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client';
import type { ShippingAddress } from '../../generated/prisma/client.js';
import { prismaHintIncludes } from '../shared/prisma-relation-error.js';
import type { CreateShippingAddressDto } from './dto/create-shipping-address.dto.js';
import type { UpdateShippingAddressDto } from './dto/update-shipping-address.dto.js';
import { ShippingAddressRepository } from './shipping_address.repository.js';

@Injectable()
export class ShippingAddressService {
    private readonly logger = new Logger(ShippingAddressService.name);

    constructor(
        private readonly shippingAddressRepository: ShippingAddressRepository,
    ) {}

    async create(
        customer_id: string,
        data: CreateShippingAddressDto,
    ): Promise<ShippingAddress> {
        try {
            this.logger.log(
                `Creating shipping address for customer ${customer_id}`,
            );
            const address = await this.shippingAddressRepository.create(
                customer_id,
                data,
            );
            this.logger.log(`Shipping address created ${address.id}`);
            return address;
        } catch (error) {
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2002'
            ) {
                this.logger.warn(`Conflict error: ${error.message}`);
                throw new ConflictException(
                    'A shipping address with this email already exists',
                );
            }
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2003'
            ) {
                this.throwForeignKeyNotFound(error);
            }

            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
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
            if (error instanceof HttpException) {
                throw error;
            }
            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
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

    async update(
        customer_id: string,
        id: string,
        data: UpdateShippingAddressDto,
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
                    'A shipping address with this email already exists',
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
                throw new NotFoundException('Shipping address not found');
            }
            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
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
            if (error instanceof HttpException) {
                this.logger.warn(`HTTP exception: ${error.message}`);
                throw error;
            }
            if (
                error instanceof PrismaClientKnownRequestError &&
                error.code === 'P2025'
            ) {
                throw new NotFoundException('Shipping address not found');
            }
            this.logger.error(`Internal server error: ${error}`);
            throw new InternalServerErrorException(
                'An unexpected error occurred. Try again later.',
            );
        }
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
