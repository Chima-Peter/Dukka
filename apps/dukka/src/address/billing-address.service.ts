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
import type { BillingAddress } from '@app/common';
import { CustomerService } from '../customer/customer.service.js';
import { prismaHintIncludes } from '../shared/prisma-relation-error.js';
import type { CreateAddressDto } from './dto/create-address.dto.js';
import type { UpdateAddressDto } from './dto/update-address.dto.js';
import type { AddressSummary } from './mappers/address.mapper.js';
import { BillingAddressRepository } from './billing-address.repository.js';

@Injectable()
export class BillingAddressService {
    private readonly logger = new Logger(BillingAddressService.name);

    constructor(
        private readonly billingAddressRepository: BillingAddressRepository,
        private readonly customerService: CustomerService,
    ) {}

    async create(
        customer_id: string | undefined,
        data: CreateAddressDto,
    ): Promise<BillingAddress> {
        try {
            const market_id = await this.resolveMarketId(customer_id, data);
            this.logger.log(
                customer_id
                    ? `Creating billing address for customer ${customer_id}`
                    : `Creating guest billing address for ${data.email}`,
            );

            const address = await this.billingAddressRepository.create(
                customer_id ?? null,
                market_id,
                data,
            );
            this.logger.log(`Billing address created ${address.id}`);
            return address;
        } catch (error) {
            this.handleWriteError(error);
        }
    }

    async findAll(customer_id: string): Promise<AddressSummary[]> {
        try {
            this.logger.log(
                `Fetching billing addresses for customer ${customer_id}`,
            );
            const addresses =
                await this.billingAddressRepository.findAllByCustomerId(
                    customer_id,
                );
            this.logger.log(
                `Fetched billing addresses for customer ${customer_id}`,
            );
            return addresses;
        } catch (error) {
            this.handleReadError(error);
        }
    }

    async findOne(customer_id: string, id: string): Promise<BillingAddress> {
        try {
            this.logger.log(
                `Fetching billing address ${id} for customer ${customer_id}`,
            );
            const address =
                await this.billingAddressRepository.findByIdAndCustomerId(
                    id,
                    customer_id,
                );
            if (!address) {
                throw new NotFoundException('Billing address not found');
            }
            this.logger.log(
                `Fetched billing address ${id} for customer ${customer_id}`,
            );
            return address;
        } catch (error) {
            this.handleReadError(error);
        }
    }

    async findById(id: string): Promise<BillingAddress> {
        try {
            const address = await this.billingAddressRepository.findById(id);
            if (!address) {
                throw new NotFoundException('Billing address not found');
            }
            return address;
        } catch (error) {
            this.handleReadError(error);
        }
    }

    async findGuestByIdAndEmail(
        id: string,
        email: string,
    ): Promise<BillingAddress> {
        try {
            const address =
                await this.billingAddressRepository.findByIdAndEmail(
                    id,
                    email,
                );
            if (!address) {
                throw new NotFoundException('Billing address not found');
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
    ): Promise<BillingAddress> {
        try {
            this.logger.log(
                `Updating billing address ${id} for customer ${customer_id}`,
            );

            const existing =
                await this.billingAddressRepository.findByIdAndCustomerId(
                    id,
                    customer_id,
                );
            if (!existing) {
                throw new NotFoundException('Billing address not found');
            }

            const address = await this.billingAddressRepository.update(
                id,
                data,
            );
            this.logger.log(`Billing address updated ${id}`);
            return address;
        } catch (error) {
            this.handleWriteError(error, 'Billing address not found');
        }
    }

    async delete(customer_id: string, id: string): Promise<object> {
        try {
            this.logger.log(
                `Deleting billing address ${id} for customer ${customer_id}`,
            );

            const existing =
                await this.billingAddressRepository.findByIdAndCustomerId(
                    id,
                    customer_id,
                );
            if (!existing) {
                throw new NotFoundException('Billing address not found');
            }

            await this.billingAddressRepository.delete(id);
            this.logger.log(`Billing address deleted ${id}`);
            return { data: null };
        } catch (error) {
            this.handleWriteError(error, 'Billing address not found');
        }
    }

    private async resolveMarketId(
        customer_id: string | undefined,
        data: CreateAddressDto,
    ): Promise<string> {
        if (customer_id) {
            const market_id =
                await this.customerService.getActiveMarketId(customer_id);
            if (!market_id) {
                throw new BadRequestException('Active market is not set');
            }
            return market_id;
        }

        if (!data.market_id) {
            throw new BadRequestException(
                'market_id is required for guest addresses',
            );
        }
        return data.market_id;
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
                'A billing address with these details already exists',
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
                notFoundMessage ?? 'Billing address not found',
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
