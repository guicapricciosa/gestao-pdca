export type LoginErrorKind = "invalid_credentials" | "service_unavailable";

export interface LoginFailure {
  readonly status: number | undefined;
  readonly code: string | undefined;
}

/**
 * Distinguishes an authentication rejection from an infrastructure failure.
 *
 * GoTrue answers wrong credentials with a 4xx status. A 5xx status comes from
 * the gateway or the auth service itself, and a missing/zero status means the
 * request never received an HTTP answer. Only the first case is the user's
 * fault; the others must not be reported as "invalid credentials".
 */
export function classifyLoginError(failure: LoginFailure): LoginErrorKind {
  const status = failure.status;
  if (status !== undefined && status >= 400 && status < 500)
    return "invalid_credentials";
  return "service_unavailable";
}
