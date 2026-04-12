import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { BUILT_IN_FIELDS, provideFormFields } from '@theredhead/lucid-forms';
import { UIInput } from '@theredhead/lucid-kit';

import { routes } from './app.routes';
import { OidcAdapter } from './core/services/oidc-adapter';
import { KeycloakAdapter } from './core/services/keycloak-adapter';
import {
  AuthorizationService,
  authorizationInterceptor,
} from './core/services/authorization.service';
import { SessionMonitorService } from './core/services/session-monitor.service';
import { BoForeignKeyField } from './shared/fk-field/fk-field.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: OidcAdapter, useClass: KeycloakAdapter },
    provideHttpClient(withInterceptors([authorizationInterceptor])),
    provideFormFields({
      ...BUILT_IN_FIELDS,
      number: { component: UIInput, modelProperty: 'value', defaultConfig: { type: 'number' } },
      fk: { component: BoForeignKeyField, modelProperty: 'value' },
    }),
    {
      provide: APP_INITIALIZER,
      useFactory:
        (auth: AuthorizationService, sessionMonitor: SessionMonitorService) => async () => {
          await auth.init();
          sessionMonitor.start();
        },
      deps: [AuthorizationService, SessionMonitorService],
      multi: true,
    },
  ],
};
