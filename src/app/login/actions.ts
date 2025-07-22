// Auth validation helpers
export const AUTH_ERRORS = {
  INVALID_EMAIL: 'Please enter a valid email address',
  WEAK_PASSWORD: 'Password must be at least 6 characters',
  PASSWORDS_DONT_MATCH: 'Passwords do not match',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_EXISTS: 'An account with this email already exists',
  NETWORK_ERROR: 'Network error. Please check your connection',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

export function validatePassword(password: string): boolean {
  return password.length >= 6;
}

export function getAuthErrorMessage(error: any): string {
  if (!error) return AUTH_ERRORS.UNKNOWN_ERROR;
  
  const message = error.message?.toLowerCase() || '';
  
  if (message.includes('invalid login')) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  }
  
  if (message.includes('already registered') || message.includes('already exists')) {
    return AUTH_ERRORS.ACCOUNT_EXISTS;
  }
  
  if (message.includes('network') || message.includes('fetch')) {
    return AUTH_ERRORS.NETWORK_ERROR;
  }
  
  return error.message || AUTH_ERRORS.UNKNOWN_ERROR;
}

export function getRedirectUrl(): string {
  if (typeof window === 'undefined') return '/';
  
  const params = new URLSearchParams(window.location.search);
  const redirectTo = params.get('redirectTo');
  
  // Validate redirect URL to prevent open redirect vulnerabilities
  if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
    return redirectTo;
  }
  
  return '/';
}