import { randomBytes, createHash } from 'crypto';

const PKCE_VERIFIER_LENGTH = 64;
const STATE_LENGTH = 24;

const base64UrlEncode = (buffer: Buffer): string =>
  buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const createCodeVerifier = (): string => {
  return base64UrlEncode(randomBytes(PKCE_VERIFIER_LENGTH));
};

export const createCodeChallenge = (verifier: string): string => {
  return base64UrlEncode(createHash('sha256').update(verifier).digest());
};

export const createState = (): string => {
  return base64UrlEncode(randomBytes(STATE_LENGTH));
};
