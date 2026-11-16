// Shared between the mocks in setup.ts and the tests.

/** Who is signed in (null = signed out). Set with signIn() from ./fixtures. */
export const auth: { session: null | { user: { id: string; email?: string } } } = { session: null };
