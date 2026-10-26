import { SetMetadata } from "@nestjs/common";

export const SSE_METADATA_KEY = '__sse__';

export const SseDecorator = () => SetMetadata(SSE_METADATA_KEY, true);