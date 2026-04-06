import { Injectable, signal } from '@angular/core';

export type NavigationMode = 'click' | 'dblclick';
export type SchemaDisplayMode = 'formatted' | 'json';

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  public readonly navigationMode = signal<NavigationMode>(this.loadNavigationMode());
  public readonly schemaDisplayMode = signal<SchemaDisplayMode>(this.loadSchemaDisplayMode());

  public setNavigationMode(mode: NavigationMode): void {
    this.navigationMode.set(mode);
    localStorage.setItem('bo-navigation-mode', mode);
  }

  public setSchemaDisplayMode(mode: SchemaDisplayMode): void {
    this.schemaDisplayMode.set(mode);
    localStorage.setItem('bo-schema-display-mode', mode);
  }

  private loadNavigationMode(): NavigationMode {
    const stored = localStorage.getItem('bo-navigation-mode');
    return stored === 'dblclick' ? 'dblclick' : 'click';
  }

  private loadSchemaDisplayMode(): SchemaDisplayMode {
    const stored = localStorage.getItem('bo-schema-display-mode');
    return stored === 'json' ? 'json' : 'formatted';
  }
}
