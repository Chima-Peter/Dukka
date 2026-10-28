import {
    BadGatewayException,
    BadRequestException,
    Injectable,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpClient, HttpResponseError } from '@nestjs/http-client';
import type { ConfigType } from '../../../config/env.interface.js';
import type {
    CreateRefundInput,
    CreateRefundResult,
    FetchRefundResult,
    FetchTransactionResult,
    InitializeTransactionInput,
    InitializeTransactionResult,
    ListRefundsInput,
    ListRefundsResult,
    ListTransactionsInput,
    ListTransactionsResult,
    PaystackApiResponse,
    RetryRefundInput,
    RetryRefundResult,
    VerifyTransactionResult,
} from './types/index.js';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

@Injectable()
export class PaystackService {
    private readonly logger = new Logger(PaystackService.name);

    constructor(
        private readonly http: HttpClient,
        private readonly configService: ConfigService<ConfigType, true>,
    ) {}

    async initializeTransaction(
        input: InitializeTransactionInput,
    ): Promise<InitializeTransactionResult> {
        this.logger.log(
            `Initializing Paystack transaction email=${input.email} amount=${input.amount}`,
        );
        return this.request<InitializeTransactionResult>(
            'POST',
            '/transaction/initialize',
            {
                json: {
                    email: input.email,
                    amount: String(input.amount),
                    ...(input.currency !== undefined && {
                        currency: input.currency,
                    }),
                    ...(input.reference !== undefined && {
                        reference: input.reference,
                    }),
                    ...(input.metadata !== undefined && {
                        metadata: input.metadata,
                    }),
                },
            },
        );
    }

    async verifyTransaction(
        reference: string,
    ): Promise<VerifyTransactionResult> {
        this.logger.log(
            `Verifying Paystack transaction reference=${reference}`,
        );
        return this.request<VerifyTransactionResult>(
            'GET',
            `/transaction/verify/${encodeURIComponent(reference)}`,
        );
    }

    async listTransactions(
        input: ListTransactionsInput = {},
    ): Promise<ListTransactionsResult> {
        this.logger.log(
            `Listing Paystack transactions page=${input.page ?? 1} perPage=${input.perPage ?? 50}`,
        );
        return this.request<ListTransactionsResult>('GET', '/transaction', {
            query: {
                perPage: input.perPage,
                page: input.page,
                status: input.status,
                from: input.from,
                to: input.to,
                amount: input.amount,
            },
        });
    }

    async fetchTransaction(
        id: string | number,
    ): Promise<FetchTransactionResult> {
        this.logger.log(`Fetching Paystack transaction id=${id}`);
        return this.request<FetchTransactionResult>(
            'GET',
            `/transaction/${encodeURIComponent(String(id))}`,
        );
    }

    async createRefund(input: CreateRefundInput): Promise<CreateRefundResult> {
        this.logger.log(
            `Creating Paystack refund transaction=${input.transaction} amount=${input.amount ?? 'full'}`,
        );
        return this.request<CreateRefundResult>('POST', '/refund', {
            json: {
                transaction: input.transaction,
                ...(input.amount !== undefined && { amount: input.amount }),
                ...(input.currency !== undefined && {
                    currency: input.currency,
                }),
                ...(input.customer_note !== undefined && {
                    customer_note: input.customer_note,
                }),
                ...(input.merchant_note !== undefined && {
                    merchant_note: input.merchant_note,
                }),
            },
        });
    }

    async listRefunds(
        input: ListRefundsInput,
    ): Promise<ListRefundsResult> {
        this.logger.log(
            `Listing Paystack refunds page=${input.page ?? 1} perPage=${input.perPage ?? 50}`,
        );
        return this.request<ListRefundsResult>('GET', '/refund', {
            query: {
                transaction: input.transaction,
                currency: input.currency,
                from: input.from,
                to: input.to,
                perPage: input.perPage,
                page: input.page,
            },
        });
    }

    async fetchRefund(id: string | number): Promise<FetchRefundResult> {
        this.logger.log(`Fetching Paystack refund id=${id}`);
        return this.request<FetchRefundResult>(
            'GET',
            `/refund/${encodeURIComponent(String(id))}`,
        );
    }

    async retryRefund(input: RetryRefundInput): Promise<RetryRefundResult> {
        this.logger.log(`Retrying Paystack refund id=${input.id}`);
        return this.request<RetryRefundResult>(
            'POST',
            `/refund/retry_with_customer_details/${encodeURIComponent(String(input.id))}`,
            {
                json: {
                    refund_account_details: input.refund_account_details,
                },
            },
        );
    }

    private async request<T>(
        method: 'GET' | 'POST',
        path: string,
        options: {
            json?: unknown;
            query?: Record<
                string,
                string | number | boolean | null | undefined
            >;
        } = {},
    ): Promise<T> {
        const secretKey = this.configService.getOrThrow('PAYSTACK_SECRET_KEY', {
            infer: true,
        });
        const url = `${PAYSTACK_BASE_URL}${path}`;
        const headers = {
            Authorization: `Bearer ${secretKey}`,
        };

        try {
            const response =
                method === 'GET'
                    ? await this.http.get<PaystackApiResponse<T>>(url, {
                          headers,
                          query: options.query,
                      })
                    : await this.http.post<PaystackApiResponse<T>>(url, {
                          headers,
                          json: options.json,
                      });

            const body = response.data;
            if (!body?.status) {
                throw new BadGatewayException(
                    body?.message ?? 'Paystack request failed',
                );
            }

            return body.data;
        } catch (error) {
            throw this.mapError(error);
        }
    }

    private mapError(error: unknown): never {
        if (
            error instanceof BadRequestException ||
            error instanceof BadGatewayException
        ) {
            throw error;
        }

        if (error instanceof HttpResponseError) {
            const message = this.extractPaystackMessage(error.body);
            this.logger.warn(
                `Paystack HTTP ${error.status}: ${message ?? error.message}`,
            );

            if (error.status >= 400 && error.status < 500) {
                throw new BadRequestException(
                    message ?? 'Paystack rejected the request',
                );
            }

            throw new BadGatewayException(
                message ?? 'Paystack request failed',
            );
        }

        this.logger.error(`Paystack request failed: ${error}`);
        throw new BadGatewayException('Paystack request failed');
    }

    private extractPaystackMessage(body: unknown): string | undefined {
        if (
            body &&
            typeof body === 'object' &&
            'message' in body &&
            typeof (body as { message: unknown }).message === 'string'
        ) {
            return (body as { message: string }).message;
        }
        return undefined;
    }
}
