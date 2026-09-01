/**
 * Validates password complexity:
 * 1. At least 6 characters long
 * 2. At least 1 uppercase letter (A-Z)
 * 3. At least 1 number (0-9)
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  const trimmed = password.trim();

  if (trimmed.length < 6) {
    return { isValid: false, error: 'Password must be at least 6 characters long' };
  }

  if (!/[A-Z]/.test(trimmed)) {
    return { isValid: false, error: 'Password must contain at least one uppercase letter (A-Z)' };
  }

  if (!/[0-9]/.test(trimmed)) {
    return { isValid: false, error: 'Password must contain at least one number (0-9)' };
  }

  return { isValid: true };
}
