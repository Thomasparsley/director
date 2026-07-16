let uid = 0;

/**
 * Returns an identifier unique within the app's lifetime, used as the identity of
 * form groups (e.g. as a `:key` when swapping whole forms in templates).
 */
export function createFormKey(): string {
  uid += 1;
  return `form-${uid}`;
}
