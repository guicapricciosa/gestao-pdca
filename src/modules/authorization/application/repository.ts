import type { AuthorizationSnapshot } from "../domain/types";

export interface AuthorizationRepository {
  loadSnapshot(): Promise<AuthorizationSnapshot>;
}

export class InMemoryAuthorizationRepository implements AuthorizationRepository {
  constructor(private readonly snapshot: AuthorizationSnapshot) {}

  async loadSnapshot(): Promise<AuthorizationSnapshot> {
    return this.snapshot;
  }
}
