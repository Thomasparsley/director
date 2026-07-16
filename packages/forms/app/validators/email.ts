import type { ValidatorResponse } from "../types/validation";

import {
  EmailValidationResult,
  validateEmail,
  type EmailValidationFailure,
} from "../utils/validateEmail";

import { ValidationError } from "./validationError";

interface EmailValidatorConfig {
  /**
   * A custom error message — a static string, or a function receiving the specific
   * failure reason.
   */
  errorMessage?: string | ((reason: EmailValidationFailure) => string);
}

/**
 * Creates a validator that checks the string is a valid email address, with a
 * targeted message per failure reason. An empty value passes — combine with
 * `requiredValidator` to enforce presence.
 */
export function emailValidator(config?: EmailValidatorConfig) {
  return function (value: string): ValidatorResponse {
    const result = validateEmail(value);

    if (result === EmailValidationResult.Success) {
      return;
    }

    if (config?.errorMessage) {
      const message = typeof config.errorMessage === "function"
        ? config.errorMessage(result)
        : config.errorMessage;

      return new ValidationError(message);
    }

    switch (result) {
      case EmailValidationResult.MissingAtSymbol:
        return new ValidationError("Email must contain an '@' symbol.");
      case EmailValidationResult.MissingLocalPart:
        return new ValidationError("Email must contain a local part before '@'.");
      case EmailValidationResult.MissingDomainPart:
        return new ValidationError("Email must contain a domain part after '@'.");
      case EmailValidationResult.MissingTLD:
        return new ValidationError("Email must contain a top-level domain (e.g. .com).");
      case EmailValidationResult.InvalidFormat:
      default:
        return new ValidationError("Value must be a valid email address.");
    }
  };
}
