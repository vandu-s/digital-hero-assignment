/**
 * Small client-side validation helpers. These give immediate field-level
 * feedback; the server re-validates everything with Zod, so this is a UX
 * layer, never the security boundary.
 */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}
