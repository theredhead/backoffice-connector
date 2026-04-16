import { inject, Injectable, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

import { LoggerFactory } from '@theredhead/lucid-foundation';
import { OidcAdapter } from './oidc-adapter';
import { appEnvironment } from '../config/runtime-config';

@Injectable()
export class KeycloakAdapter extends OidcAdapter {
  private readonly log = inject(LoggerFactory).createLogger('KeycloakAdapter');
  private readonly keycloak = new Keycloak({
    url: appEnvironment.keycloak.url,
    realm: appEnvironment.keycloak.realm,
    clientId: appEnvironment.keycloak.clientId,
  });

  public readonly authenticated = signal(false);
  public readonly userName = signal('');
  public readonly roles = signal<readonly string[]>([]);
  public readonly accountUrl = signal<string | null>(null);
  public readonly sessionExpiresAt = signal<number | null>(null);

  public async init(): Promise<void> {
    const ok = await this.keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      pkceMethod: 'S256',
    });

    this.authenticated.set(ok);

    if (ok) {
      this.userName.set(this.keycloak.tokenParsed?.['preferred_username'] ?? '');
      this.roles.set(this.keycloak.tokenParsed?.['realm_access']?.['roles'] ?? []);
      this.sessionExpiresAt.set(this.keycloak.refreshTokenParsed?.exp ?? null);

      try {
        this.accountUrl.set(
          this.keycloak.createAccountUrl({ redirectUri: window.location.origin }),
        );
      } catch {
        this.accountUrl.set(null);
      }
    }
  }

  public async getToken(): Promise<string> {
    await this.keycloak.updateToken(30);
    return this.keycloak.token ?? '';
  }

  public logout(): void {
    void this.keycloak.logout({ redirectUri: window.location.origin });
  }

  public async extendSession(): Promise<boolean> {
    try {
      await this.keycloak.updateToken(-1);
      this.sessionExpiresAt.set(this.keycloak.refreshTokenParsed?.exp ?? null);
      this.log.debug('Session extended');
      return true;
    } catch {
      this.log.error('Failed to extend session');
      return false;
    }
  }
}
