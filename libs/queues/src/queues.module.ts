import { type DynamicModule, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailQueueService } from './mail-queue.service.js';
import { MAIL_QUEUE } from './queue.constants.js';
import {
    ConfigurableModuleClass,
    type QueuesModuleAsyncOptions,
    type QueuesModuleOptions,
} from './queues.module-definition.js';

function toBullRootOptions(options: QueuesModuleOptions) {
    return {
        connection: options.url
            ? { url: options.url }
            : {
                  host: options.host ?? '127.0.0.1',
                  port: options.port ?? 6379,
                  password: options.password,
                  db: options.db,
              },
        prefix: options.prefix,
    };
}

@Module({
    providers: [MailQueueService],
    exports: [MailQueueService, BullModule],
})
export class QueuesModule extends ConfigurableModuleClass {
    static register(
        options: QueuesModuleOptions & { isGlobal?: boolean },
    ): DynamicModule {
        const dynamicModule = super.register(options);

        return {
            ...dynamicModule,
            imports: [
                ...(dynamicModule.imports ?? []),
                BullModule.forRoot(toBullRootOptions(options)),
                BullModule.registerQueue({ name: MAIL_QUEUE }),
            ],
            providers: [...(dynamicModule.providers ?? []), MailQueueService],
            exports: [
                ...(dynamicModule.exports ?? []),
                MailQueueService,
                BullModule,
            ],
        };
    }

    static registerAsync(options: QueuesModuleAsyncOptions): DynamicModule {
        const dynamicModule = super.registerAsync(options);

        if (!options.useFactory) {
            throw new Error(
                'QueuesModule.registerAsync currently requires useFactory',
            );
        }

        return {
            ...dynamicModule,
            imports: [
                ...(dynamicModule.imports ?? []),
                BullModule.forRootAsync({
                    imports: options.imports,
                    inject: options.inject ?? [],
                    useFactory: async (...args: unknown[]) => {
                        const moduleOptions = await options.useFactory!(
                            ...args,
                        );
                        return toBullRootOptions(moduleOptions);
                    },
                }),
                BullModule.registerQueue({ name: MAIL_QUEUE }),
            ],
            providers: [...(dynamicModule.providers ?? []), MailQueueService],
            exports: [
                ...(dynamicModule.exports ?? []),
                MailQueueService,
                BullModule,
            ],
        };
    }
}
