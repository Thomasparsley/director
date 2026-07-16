/**
 * Interface for form elements with pristine/dirty state management.
 */
export interface StatefulForm {
  /** Marks the form as untouched and clears any stored validation error. */
  readonly markAsPristine: () => void;

  /** Marks the form as modified. */
  readonly markAsDirty: () => void;

  /** Reverts the form back to its original data and marks it pristine. */
  readonly reset: () => void;

  /** Commits the current data as the new original data and marks the form pristine. */
  readonly save: () => void;
}
