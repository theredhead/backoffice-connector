import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { JsonPipe } from '@angular/common';

import { LoggerFactory } from '@theredhead/foundation';
import { UICheckbox } from '@theredhead/ui-kit';
import { ConnectionManagerService } from '../../core/services/connection-manager.service';
import { FetchlaneService } from '../../core/services/fetchlane.service';
import { PreferencesService } from '../../core/services/preferences.service';
import type { FullTableSchema } from '../../core/models';

@Component({
  selector: 'bo-schema-viewer',
  imports: [JsonPipe, UICheckbox],
  templateUrl: './schema-viewer.component.html',
  styleUrl: './schema-viewer.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bo-schema-viewer' },
})
export class BoSchemaViewer {
  private readonly log = inject(LoggerFactory).createLogger('BoSchemaViewer');
  private readonly fetchlane = inject(FetchlaneService);
  private readonly connectionManager = inject(ConnectionManagerService);
  protected readonly preferences = inject(PreferencesService);

  protected readonly tables = signal<string[]>([]);
  protected readonly selectedTable = signal<string | null>(null);
  protected readonly schema = signal<FullTableSchema | null>(null);
  protected readonly rawSchema = signal<Record<string, unknown> | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly connectionName = computed(
    () => this.connectionManager.activeConnection().name,
  );
  private readonly baseUrl = computed(() => this.connectionManager.activeConnection().baseUrl);

  public constructor() {
    effect(() => {
      const url = this.baseUrl();
      this.selectedTable.set(null);
      this.schema.set(null);
      this.loadTables(url);
    });
  }

  protected selectTable(table: string): void {
    this.selectedTable.set(table);
    this.loadSchema(table);
  }

  private loadTables(baseUrl: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.fetchlane.getTableNames(baseUrl).subscribe({
      next: (names) => {
        this.tables.set(names);
        this.loading.set(false);
      },
      error: (err) => {
        this.log.error('Failed to load tables', [err]);
        this.error.set('Failed to load tables.');
        this.loading.set(false);
      },
    });
  }

  private loadSchema(table: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.fetchlane.getRawTableSchema(this.baseUrl(), table).subscribe({
      next: (raw) => {
        this.rawSchema.set(raw);
      },
    });
    this.fetchlane.getTableSchema(this.baseUrl(), table).subscribe({
      next: (schema) => {
        this.schema.set(schema);
        this.loading.set(false);
      },
      error: (err) => {
        this.log.error('Failed to load schema', [err]);
        this.error.set('Failed to load schema.');
        this.loading.set(false);
      },
    });
  }
}
