/** The HTTP status codes the identity REST clients branch on. */
export const HttpStatusCode = {
  Ok: 200,
  BadRequest: 400,
  Unauthorized: 401,
  Conflict: 409,
} as const;

export type HttpStatusCode = typeof HttpStatusCode[keyof typeof HttpStatusCode];
