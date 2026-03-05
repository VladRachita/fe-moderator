import { describe, it, expect } from 'vitest';
import { checkRateLimit } from '@/lib/auth/rate-limit';

describe('checkRateLimit', () => {
    const uniqueKey = () => `test-${Date.now()}-${Math.random()}`;

    it('allows requests under the limit', () => {
        const key = uniqueKey();
        const result = checkRateLimit(key, 5, 60_000);
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBe(4);
    });

    it('blocks after exceeding limit', () => {
        const key = uniqueKey();
        for (let i = 0; i < 3; i++) {
            checkRateLimit(key, 3, 60_000);
        }
        const result = checkRateLimit(key, 3, 60_000);
        expect(result.allowed).toBe(false);
        expect(result.remaining).toBe(0);
        expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it('counts remaining correctly', () => {
        const key = uniqueKey();
        checkRateLimit(key, 5, 60_000);
        checkRateLimit(key, 5, 60_000);
        const result = checkRateLimit(key, 5, 60_000);
        expect(result.remaining).toBe(2);
    });

    it('isolates different keys', () => {
        const keyA = uniqueKey();
        const keyB = uniqueKey();
        for (let i = 0; i < 3; i++) {
            checkRateLimit(keyA, 3, 60_000);
        }
        const resultA = checkRateLimit(keyA, 3, 60_000);
        const resultB = checkRateLimit(keyB, 3, 60_000);
        expect(resultA.allowed).toBe(false);
        expect(resultB.allowed).toBe(true);
    });

    it('allows again after window expires', async () => {
        const key = uniqueKey();
        // Use a 10ms window
        for (let i = 0; i < 3; i++) {
            checkRateLimit(key, 3, 10);
        }
        // Wait for the window to expire
        await new Promise((resolve) => setTimeout(resolve, 20));
        const result = checkRateLimit(key, 3, 10);
        expect(result.allowed).toBe(true);
    });
});
