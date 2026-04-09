import { Signal } from '@angular/core';

/**
 * Provider-agnostic OIDC adapter interface.
 *
 * To swap identity providers, implement this abstract class and
 * register the implementation via `{ provide: OidcAdapter, useClass: ... }`
 * in the application config. No other code needs to change.
 */
export abstract class OidcAdapter {
  /** Whether the user is currently authenticated. */
  public abstract readonly authenticated: Signal<boolean>;

  /** Display name of the current user. */
  public abstract readonly userName: Signal<string>;

  /** Roles assigned to the current user. */
  public abstract readonly roles: Signal<readonly string[]>;

  /** URL to the provider's account management page, or `null`. */
  public abstract readonly accountUrl: Signal<string | null>;

  /** Epoch (seconds) when the session expires, or `null` if unknown. */
  public abstract readonly sessionExpiresAt: Signal<number | null>;

  /** Initialise the OIDC flow (login redirect, token parsing, etc.). */
  public abstract init(): Promise<void>;

  /** Return a valid access token, refreshing if necessary. */
  public abstract getToken(): Promise<string>;

  /** Log the user out and redirect. */
  public abstract logout(): void;

  /** Attempt to extend the session. Resolves `true` on success. */
  public abstract extendSession(): Promise<boolean>;
}
