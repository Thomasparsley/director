/** The HTTP status codes the identity REST clients branch on. */
export const HttpStatusCode = {
  Ok: 200,
  BadRequest: 400,
  Unauthorized: 401,
  Conflict: 409,
  TooManyRequests: 429,
  /**
   * Not a status the clients match exactly — the floor they compare against, so every
   * 5xx is read as "the backend broke", not as "the request was judged and refused".
   */
  InternalServerError: 500,
} as const;

export type HttpStatusCode = typeof HttpStatusCode[keyof typeof HttpStatusCode];
