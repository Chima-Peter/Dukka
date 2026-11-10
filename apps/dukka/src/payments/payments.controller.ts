import {
    Body,
    Controller,
    Delete,
    Get,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Query,
    Req,
    type RawBodyRequest,
} from '@nestjs/common';
import type { Request } from 'express';
import {
    Auth,
    CurrentStaff,
    Public,
    RequirePermission,
    ResponseMessage,
    SkipTransform,
    StaffPermission,
    type StaffJwtPayload,
} from '@app/common';
import { toScopedAccessActor } from '../shared/access-control.js';
import { ApprovePaymentMethodDto } from './dto/approve-payment-method.dto.js';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto.js';
import { FindPaymentAttemptDto } from './dto/find-payment-attempt.dto.js';
import { FindPaymentAttemptsDto } from './dto/find-payment-attempts.dto.js';
import { FindPaymentMethodsDto } from './dto/find-payment-methods.dto.js';
import { StaffPaystackPayDto } from './dto/staff-paystack-pay.dto.js';
import { PaymentsService } from './payments.service.js';

@Auth('staff')
@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Post('webhooks/paystack')
    @Public()
    @SkipTransform()
    @HttpCode(HttpStatus.OK)
    handlePaystackWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Headers('x-paystack-signature') signature: string | undefined,
    ) {
        return this.paymentsService.handlePaystackWebhook({
            rawBody: req.rawBody,
            signature,
            body: req.body,
        });
    }

    @Post('methods')
    @RequirePermission(StaffPermission.PaymentsManage)
    @ResponseMessage('Payment method created successfully')
    createMethod(@Body() data: CreatePaymentMethodDto) {
        return this.paymentsService.createMethod(data);
    }

    @Get('methods')
    @Public()
    @ResponseMessage('Payment methods retrieved successfully')
    findMethods(@Query() query: FindPaymentMethodsDto) {
        return this.paymentsService.findMethods(query);
    }

    @Get('methods/:id')
    @Public()
    @ResponseMessage('Payment method retrieved successfully')
    findMethod(@Param('id', ParseUUIDPipe) id: string) {
        return this.paymentsService.findMethod(id);
    }

    @Post('methods/:id/markets')
    @RequirePermission(StaffPermission.PaymentsReview)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Payment method approved for market successfully')
    approveForMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() data: ApprovePaymentMethodDto,
    ) {
        return this.paymentsService.approveForMarket(
            id,
            data,
            staff.market_ids,
        );
    }

    @Delete('methods/:id/markets/:marketId')
    @RequirePermission(StaffPermission.MarketPaymentsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Payment method removed from market successfully')
    removeFromMarket(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Param('marketId', ParseUUIDPipe) marketId: string,
    ) {
        return this.paymentsService.removeFromMarket(
            id,
            marketId,
            staff.market_ids,
        );
    }

    @Post('orders/:orderId/paystack')
    @RequirePermission(StaffPermission.PaymentsManage)
    @HttpCode(HttpStatus.OK)
    @ResponseMessage('Paystack payment initialized for cash order successfully')
    payCashOrderWithPaystack(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('orderId', ParseUUIDPipe) orderId: string,
        @Body() data: StaffPaystackPayDto,
        @Headers('x-idempotency-key') idempotencyKey?: string,
    ) {
        return this.paymentsService.payCashOrderWithPaystack(
            orderId,
            data,
            toScopedAccessActor(staff),
            staff.sub,
            idempotencyKey,
        );
    }

    @Get('attempts')
    @RequirePermission(StaffPermission.PaymentsRead)
    @ResponseMessage('Payment attempts retrieved successfully')
    findAttempts(
        @CurrentStaff() staff: StaffJwtPayload,
        @Query() query: FindPaymentAttemptsDto,
    ) {
        return this.paymentsService.findAttempts(
            query,
            toScopedAccessActor(staff),
        );
    }

    @Get('attempts/:id')
    @RequirePermission(StaffPermission.PaymentsRead)
    @ResponseMessage('Payment attempt retrieved successfully')
    findAttempt(
        @CurrentStaff() staff: StaffJwtPayload,
        @Param('id', ParseUUIDPipe) id: string,
        @Query() query: FindPaymentAttemptDto,
    ) {
        return this.paymentsService.findAttempt(
            id,
            query.market_id,
            staff.market_ids,
        );
    }
}
