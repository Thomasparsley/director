export type Result<T, E = unknown>
  = { readonly success: true, readonly value: T }
    | { readonly success: false, readonly error: E };

export type ErrorResult<E = unknown>
  = { readonly success: true }
    | { readonly success: false, readonly error: E };
