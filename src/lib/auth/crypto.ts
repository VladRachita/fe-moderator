import { createCipheriv, createDecipheriv, createHmac, createHash, randomBytes } from 'crypto';

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

const getKey = (secret: string): Buffer => {
  return createHash('sha256').update(secret).digest();
};

export const encrypt = (value: string, secret: string): string => {
  const key = getKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv, { authTagLength: AUTH_TAG_LENGTH });
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [
    iv.toString('base64url'),
    encrypted.toString('base64url'),
    authTag.toString('base64url'),
  ].join('.');
};

export const decrypt = (payload: string, secret: string): string => {
  const [ivEncoded, dataEncoded, tagEncoded] = payload.split('.');
  if (!ivEncoded || !dataEncoded || !tagEncoded) {
    throw new Error('Invalid encrypted payload format');
  }
  const key = getKey(secret);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivEncoded, 'base64url'),
    { authTagLength: AUTH_TAG_LENGTH }
  );
  decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataEncoded, 'base64url')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
};

export const signValue = (value: string, secret: string): string => {
  return createHmac('sha256', secret).update(value).digest('base64url');
};

export const constantTimeEqual = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return bufferA.equals(bufferB);
};
