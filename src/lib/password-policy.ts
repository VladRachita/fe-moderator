export interface PasswordPolicyOptions {
  allowEmpty?: boolean;
}

export const validatePasswordPolicy = (
  password: string,
  options: PasswordPolicyOptions = {},
): string | null => {
  const trimmed = password.trim();
  if (!trimmed) {
    return options.allowEmpty ? null : 'Password is required.';
  }
  if (trimmed.length < 12) {
    return 'Password must be at least 12 characters long.';
  }
  if (!/[A-Z]/.test(trimmed)) {
    return 'Password must include at least one uppercase letter.';
  }
  if (!/[a-z]/.test(trimmed)) {
    return 'Password must include at least one lowercase letter.';
  }
  if (!/[0-9]/.test(trimmed)) {
    return 'Password must include at least one digit.';
  }
  if (!/[^A-Za-z0-9]/.test(trimmed)) {
    return 'Password must include at least one symbol.';
  }
  return null;
};
