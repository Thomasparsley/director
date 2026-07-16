/**
 * Encapsulates the details of a failed validation — a human-readable message.
 */
export class ValidationError {
  constructor(public readonly message: string) { }
}
