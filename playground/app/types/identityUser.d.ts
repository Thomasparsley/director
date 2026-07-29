// The consumer half of @director/identity's user contract: the layer stores the user
// opaquely, and the app declares its real shape by augmenting `IdentityUser`.
declare module "#layers/director-identity/app/types/user" {
  interface IdentityUser {
    name: string
    email: string
  }
}

export {};
