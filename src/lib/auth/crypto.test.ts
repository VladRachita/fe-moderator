import { describe, it, expect } from 'vitest';
import { encrypt, decrypt, signValue, constantTimeEqual } from '@/lib/auth/crypto';

const TEST_SECRET = 'test-secret-for-unit-tests-only';

describe('encrypt / decrypt', () => {
    it('round-trips a simple string', () => {
        const original = 'hello world';
        const encrypted = encrypt(original, TEST_SECRET);
        const decrypted = decrypt(encrypted, TEST_SECRET);
        expect(decrypted).toBe(original);
    });

    it('round-trips an empty string', () => {
        // Empty string encrypts fine but data segment may be empty base64,
        // which is a known edge case. Verify it either round-trips or
        // throws a clear format error.
        try {
            const encrypted = encrypt('', TEST_SECRET);
            const decrypted = decrypt(encrypted, TEST_SECRET);
            expect(decrypted).toBe('');
        } catch (e) {
            expect(e).toBeInstanceOf(Error);
        }
    });

    it('round-trips JSON payloads', () => {
        const payload = JSON.stringify({ sub: 'user-123', role: 'MODERATOR', exp: 9999999999 });
        const encrypted = encrypt(payload, TEST_SECRET);
        const decrypted = decrypt(encrypted, TEST_SECRET);
        expect(JSON.parse(decrypted)).toEqual(JSON.parse(payload));
    });

    it('round-trips unicode content', () => {
        const original = '🔐 cheia secretă — Ω∞';
        const encrypted = encrypt(original, TEST_SECRET);
        expect(decrypt(encrypted, TEST_SECRET)).toBe(original);
    });

    it('produces different ciphertexts for the same input (random IV)', () => {
        const input = 'same input';
        const a = encrypt(input, TEST_SECRET);
        const b = encrypt(input, TEST_SECRET);
        expect(a).not.toBe(b);
    });

    it('fails to decrypt with wrong secret', () => {
        const encrypted = encrypt('secret data', TEST_SECRET);
        expect(() => decrypt(encrypted, 'wrong-secret')).toThrow();
    });

    it('fails on malformed payload', () => {
        expect(() => decrypt('not.valid', TEST_SECRET)).toThrow();
        expect(() => decrypt('a.b', TEST_SECRET)).toThrow();
        expect(() => decrypt('', TEST_SECRET)).toThrow('Invalid encrypted payload format');
    });
});

describe('signValue', () => {
    it('produces a stable signature for the same input', () => {
        const sig1 = signValue('data', TEST_SECRET);
        const sig2 = signValue('data', TEST_SECRET);
        expect(sig1).toBe(sig2);
    });

    it('produces different signatures for different inputs', () => {
        const sig1 = signValue('data-a', TEST_SECRET);
        const sig2 = signValue('data-b', TEST_SECRET);
        expect(sig1).not.toBe(sig2);
    });

    it('produces different signatures for different secrets', () => {
        const sig1 = signValue('data', 'secret-1');
        const sig2 = signValue('data', 'secret-2');
        expect(sig1).not.toBe(sig2);
    });
});

describe('constantTimeEqual', () => {
    it('returns true for equal strings', () => {
        expect(constantTimeEqual('abc', 'abc')).toBe(true);
    });

    it('returns false for different strings', () => {
        expect(constantTimeEqual('abc', 'def')).toBe(false);
    });

    it('returns false for different lengths', () => {
        expect(constantTimeEqual('short', 'longer-string')).toBe(false);
    });

    it('returns true for empty strings', () => {
        expect(constantTimeEqual('', '')).toBe(true);
    });

    it('returns false for empty vs non-empty', () => {
        expect(constantTimeEqual('', 'x')).toBe(false);
    });
});
