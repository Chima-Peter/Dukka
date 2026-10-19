import { describe, expect, it } from 'vitest';
import {
    DEFAULT_HTTP_RETRY,
    DEFAULT_HTTP_TIMEOUT,
    mergeHttpClientDefaults,
} from './http.defaults.js';

describe('mergeHttpClientDefaults', () => {
    it('applies timeout and retry defaults', () => {
        expect(mergeHttpClientDefaults()).toEqual({
            timeout: DEFAULT_HTTP_TIMEOUT,
            retry: DEFAULT_HTTP_RETRY,
        });
    });

    it('lets callers override timeout', () => {
        expect(mergeHttpClientDefaults({ timeout: '5s' }).timeout).toBe('5s');
    });

    it('merges retry fields when an object is provided', () => {
        expect(
            mergeHttpClientDefaults({ retry: { attempts: 5 } }).retry,
        ).toEqual({
            ...DEFAULT_HTTP_RETRY,
            attempts: 5,
        });
    });

    it('allows disabling retries', () => {
        expect(mergeHttpClientDefaults({ retry: false }).retry).toBe(false);
    });

    it('allows a numeric retry shorthand', () => {
        expect(mergeHttpClientDefaults({ retry: 2 }).retry).toBe(2);
    });
});
