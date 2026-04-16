import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'browse',
    pathMatch: 'full',
  },
  {
    path: 'browse',
    pathMatch: 'full',
    data: { navLabel: 'Tables' },
    loadComponent: () =>
      import('./features/table-browser/table-browser.component').then((m) => m.BoTableBrowser),
  },
  {
    path: 'browse/:tableName/record/:pk',
    loadComponent: () =>
      import('./features/record-inspector/record-inspector.component').then(
        (m) => m.BoRecordInspector,
      ),
  },
  {
    path: 'schema',
    data: { navLabel: 'Schema' },
    loadComponent: () =>
      import('./features/schema-viewer/schema-viewer.component').then((m) => m.BoSchemaViewer),
  },
  {
    path: 'settings',
    data: { navLabel: 'Settings' },
    loadComponent: () => import('./features/settings/settings.component').then((m) => m.BoSettings),
  },
  {
    path: 'swagger',
    data: { navLabel: 'API Docs' },
    loadComponent: () =>
      import('./features/swagger-viewer/swagger-viewer.component').then((m) => m.BoSwaggerViewer),
  },
];
