/**
 * The app's identified user. The layer stores and hands this back but never looks
 * inside it — what a "user" is belongs to the consuming app. Augment the interface
 * from the app to give `useIdentity().user` its real shape:
 *
 * ```ts
 * declare module "#layers/director-identity/app/types/user" {
 *   interface IdentityUser {
 *     name: string
 *     email: string
 *   }
 * }
 * ```
 */
export interface IdentityUser {}
