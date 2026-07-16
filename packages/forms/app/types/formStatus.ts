/**
 * Enum-like object representing the different states of a form.
 *
 * @property PRISTINE - The form is in its initial, untouched state.
 * @property DIRTY - The user (or a patch) has modified the form.
 * @property PENDING - The form is waiting, e.g. during submission.
 * @property ERROR - The form contains validation errors.
 */
export const FormStatus = {
  PRISTINE: 0,
  DIRTY: 1,
  PENDING: 2,
  ERROR: 3,
} as const;

export type FormStatusKey = keyof typeof FormStatus;

export type FormStatus = (typeof FormStatus)[FormStatusKey];
