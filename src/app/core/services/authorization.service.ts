import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { Observable, from, switchMap } from 'rxjs';

import { OidcAdapter } from './oidc-adapter';

@Injectable({ providedIn: 'root' })
export class AuthorizationService {
  private readonly oidc = inject(OidcAdapter);

  public readonly authenticated = this.oidc.authenticated;
  public readonly userName = this.oidc.userName;
  public readonly roles = this.oidc.roles;
  public readonly accountUrl = this.oidc.accountUrl;
  public readonly sessionExpiresAt = this.oidc.sessionExpiresAt;

  public readonly canWrite = computed(() => this.roles().includes('admin'));

  public async init(): Promise<void> {
    return this.oidc.init();
  }

  public async getToken(): Promise<string> {
    return this.oidc.getToken();
  }

  public hasRole(role: string): boolean {
    return this.roles().includes(role);
  }

  public logout(): void {
    this.oidc.logout();
  }

  public async extendSession(): Promise<boolean> {
    return this.oidc.extendSession();
  }
}

export const authorizationInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const auth = inject(AuthorizationService);

  if (!req.url.includes('/api/')) {
    return next(req);
  }

  return from(auth.getToken()).pipe(
    switchMap((token) => {
      if (token) {
        const cloned = req.clone({
          setHeaders: { Authorization: `Bearer ${token}` },
        });
        return next(cloned);
      }
      return next(req);
    }),
  );
};
