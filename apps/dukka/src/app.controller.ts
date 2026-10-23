import { Controller, Get, Logger, Sse, SseSignal } from '@nestjs/common';
import { Public, ResponseMessage } from '@app/common';
import { Observable, interval, map } from 'rxjs';
import { randomUUID } from 'node:crypto';

@Controller()
export class AppController {
    private readonly logger = new Logger(AppController.name);

    @Get('health')
    @Public()
    @ResponseMessage('Health check successful')
    health() {
        this.logger.log('Health check successful');
        return { status: 'ok' };
    }

    
    @Sse('sse')
    @Public()
    sse(@SseSignal() signal: AbortSignal): Observable<MessageEvent> {
    return new Observable<MessageEvent>(subscriber => {
        const timer = setInterval(() => subscriber.next({ data: "message", id: randomUUID(), type: "message", comment: "comment" } as MessageEvent), 1000)
        const onAbort = () => {
            console.log(`SSE lifetime closed. Subscriber aborted.`)
            subscriber.complete()
        }

        signal.addEventListener("abort", onAbort, { once: true })

        return () => {
            clearInterval(timer);
            signal.removeEventListener("abort", onAbort)
        }
    })
    }

}
