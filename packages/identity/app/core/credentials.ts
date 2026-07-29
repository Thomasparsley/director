import type { LoginCredentialsRequest } from "../types/api";

/**
 * Shapes a free-form login identifier + password into the discriminated
 * credentials request. A value containing "@" is treated as an email, anything
 * else as a username. Pure — no trimming/normalisation beyond the branch, so
 * validation stays the form layer's responsibility.
 */
export function buildLoginCredentials(
  usernameOrEmail: string,
  password: string,
): LoginCredentialsRequest {
  return usernameOrEmail.includes("@")
    ? { email: usernameOrEmail, password }
    : { username: usernameOrEmail, password };
}
