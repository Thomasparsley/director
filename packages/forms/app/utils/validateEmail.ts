/**
 * Enum-like object representing the possible results of an email validation check.
 */
export const EmailValidationResult = {
  Success: "Success",
  MissingAtSymbol: "MissingAtSymbol",
  MissingLocalPart: "MissingLocalPart",
  MissingDomainPart: "MissingDomainPart",
  MissingTLD: "MissingTLD",
  InvalidFormat: "InvalidFormat",
} as const;

export type EmailValidationResultKey = keyof typeof EmailValidationResult;
export type EmailValidationResult = (typeof EmailValidationResult)[EmailValidationResultKey];
export type EmailValidationFailure = Exclude<EmailValidationResult, typeof EmailValidationResult.Success>;

/**
 * Validates the structure of an email address and reports *why* it failed, not just
 * that it did — so validators can show a targeted message.
 *
 * An empty string passes: whether the field may be empty is the job of
 * `requiredValidator`, not of the format check.
 */
export function validateEmail(email: string): EmailValidationResult {
  if (!email) {
    return EmailValidationResult.Success;
  }

  const atIndex = email.indexOf("@");

  if (atIndex === -1) {
    return EmailValidationResult.MissingAtSymbol;
  }

  if (atIndex === 0) {
    return EmailValidationResult.MissingLocalPart;
  }

  if (atIndex === email.length - 1) {
    return EmailValidationResult.MissingDomainPart;
  }

  const domainPart = email.substring(atIndex + 1);
  if (!domainPart.includes(".")) {
    return EmailValidationResult.MissingTLD;
  }

  // Catches the remaining structural problems: spaces, multiple @, empty TLD, …
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return EmailValidationResult.InvalidFormat;
  }

  return EmailValidationResult.Success;
}
