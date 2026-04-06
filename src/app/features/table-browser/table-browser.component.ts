import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { UITableView, UITextColumn, UITemplateColumn } from '@theredhead/ui-kit';

import { ConnectionManagerService } from '../../core/services/connection-manager.service';
import { FetchlaneService } from '../../core/services/fetchlane.service';
import { FetchlaneDatasource } from '../../core/datasources/fetchlane-datasource';
import { PreferencesService } from '../../core/services/preferences.service';
import type { ForeignKeyInfo } from '../../core/models';

interface ColumnDef {
  readonly key: string;
  readonly header: string;
  readonly fk: ForeignKeyInfo | null;
}

@Component({
  selector: 'bo-table-browser',
  templateUrl: './table-browser.component.html',
  styleUrl: './table-browser.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UITableView, UITextColumn, UITemplateColumn],
  host: { class: 'bo-table-browser' },
})
export class BoTableBrowser {
  private readonly router = inject(Router);
  private readonly fetchlane = inject(FetchlaneService);
  private readonly connectionManager = inject(ConnectionManagerService);
  private readonly preferences = inject(PreferencesService);
  private readonly injector = inject(Injector);

  protected readonly tables = signal<readonly string[]>([]);
  protected readonly selectedTable = signal<string | null>(null);
  protected readonly datasource = signal<FetchlaneDatasource | null>(null);
  protected readonly selectedRow = signal<Record<string, unknown> | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly columns = signal<readonly ColumnDef[]>([]);

  protected readonly baseUrl = computed(() => this.connectionManager.activeConnection().baseUrl);
  protected readonly connectionName = computed(
    () => this.connectionManager.activeConnection().name,
  );

  public constructor() {
    effect(() => {
      const url = this.baseUrl();
      this.selectedTable.set(null);
      this.datasource.set(null);
      this.loadTables(url);
    });
  }

  protected selectTable(table: string): void {
    if (!table) {
      return;
    }
    this.selectedTable.set(table);

    const ds = new FetchlaneDatasource(this.baseUrl(), table, this.injector);
    this.loading.set(true);
    this.error.set(null);

    this.fetchlane.getTableSchema(this.baseUrl(), table).subscribe({
      next: (schema) => {
        ds.applySchema(schema);
        this.columns.set(this.buildColumns(ds));
        ds.reload()
          .then(() => {
            this.datasource.set(ds);
            this.loading.set(false);
          })
          .catch((err) => {
            this.error.set(err?.error?.message ?? 'Failed to load table');
            this.loading.set(false);
          });
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load schema');
        this.loading.set(false);
      },
    });
  }

  protected onSelectionChange(rows: readonly unknown[]): void {
    if (rows.length === 0) {
      this.selectedRow.set(null);
      return;
    }
    const row = rows[0] as Record<string, unknown>;
    this.selectedRow.set(row);

    if (this.preferences.navigationMode() === 'click') {
      this.navigateToSelectedRow(row);
    }
  }

  protected onTableDblClick(): void {
    if (this.preferences.navigationMode() !== 'dblclick') {
      return;
    }
    const row = this.selectedRow();
    if (row) {
      this.navigateToSelectedRow(row);
    }
  }

  private navigateToSelectedRow(row: Record<string, unknown>): void {
    const ds = this.datasource();
    const table = this.selectedTable();
    if (!ds || !table) {
      return;
    }

    const pkColumn = ds.getPrimaryKeyColumn();
    if (!pkColumn || row[pkColumn] == null) {
      return;
    }

    void this.router.navigate(['/browse', table, 'record', String(row[pkColumn])]);
  }

  protected navigateToFkRecord(fk: ForeignKeyInfo, row: Record<string, unknown>): void {
    const value = row[fk.column];
    if (value == null) {
      return;
    }
    void this.router.navigate(['/browse', fk.referencedTable, 'record', String(value)]);
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
        this.error.set(err?.error?.message ?? 'Failed to load tables');
        this.loading.set(false);
      },
    });
  }

  private buildColumns(ds: FetchlaneDatasource): ColumnDef[] {
    const schema = ds.getSchema();
    if (!schema) {
      return [];
    }
    const fks = ds.getForeignKeys();
    const fkMap = new Map(fks.map((fk) => [fk.column, fk]));

    return schema.columns.map((col) => ({
      key: col.column_name,
      header: this.humanize(col.column_name),
      fk: fkMap.get(col.column_name) ?? null,
    }));
  }

  private humanize(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
