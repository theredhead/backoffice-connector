import {
  APP_INITIALIZER,
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { BUILT_IN_FIELDS, provideFormFields } from '@theredhead/ui-forms';
import { UIInput } from '@theredhead/ui-kit';

import { routes } from './app.routes';
import { AuthService, authInterceptor } from './core/services/auth.service';
import { BoForeignKeyField } from './shared/fk-field/fk-field.component';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideFormFields({
      ...BUILT_IN_FIELDS,
      number: { component: UIInput, modelProperty: 'value', defaultConfig: { type: 'number' } },
      fk: { component: BoForeignKeyField, modelProperty: 'value' },
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: (auth: AuthService) => () => auth.init(),
      deps: [AuthService],
      multi: true,
    },
  ],
};
