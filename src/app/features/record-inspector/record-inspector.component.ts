import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { KeyValuePipe } from '@angular/common';
import { UITableView, UITextColumn, UITemplateColumn, UITabGroup, UITab } from '@theredhead/ui-kit';

import { ConnectionManagerService } from '../../core/services/connection-manager.service';
import { FetchlaneService } from '../../core/services/fetchlane.service';
import { FetchlaneDatasource } from '../../core/datasources/fetchlane-datasource';
import type { ForeignKeyInfo, ChildForeignKeyInfo } from '../../core/models';

interface ColumnDef {
  readonly key: string;
  readonly header: string;
  readonly fk: ForeignKeyInfo | null;
}

interface RelatedTableEntry {
  readonly table: string;
  readonly datasource: FetchlaneDatasource;
  readonly columns: readonly ColumnDef[];
}

@Component({
  selector: 'bo-record-inspector',
  templateUrl: './record-inspector.component.html',
  styleUrl: './record-inspector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UITableView, UITextColumn, UITemplateColumn, UITabGroup, UITab, KeyValuePipe],
  host: { class: 'bo-record-inspector' },
})
export class BoRecordInspector {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  private readonly fetchlane = inject(FetchlaneService);
  private readonly connectionManager = inject(ConnectionManagerService);

  protected readonly tableName = signal('');
  protected readonly primaryKey = signal('');
  protected readonly record = signal<Record<string, unknown> | null>(null);
  protected readonly fields = signal<readonly [string, unknown][]>([]);
  protected readonly loading = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly foreignKeys = signal<readonly ForeignKeyInfo[]>([]);
  protected readonly childForeignKeys = signal<readonly ChildForeignKeyInfo[]>([]);
  protected readonly relatedDatasources = signal<ReadonlyMap<string, RelatedTableEntry>>(new Map());

  protected readonly baseUrl = computed(() => this.connectionManager.activeConnection().baseUrl);

  private readonly destroyRef = inject(DestroyRef);

  public constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const name = params.get('tableName') ?? '';
      const pk = params.get('pk') ?? '';
      this.tableName.set(name);
      this.primaryKey.set(pk);
      this.relatedDatasources.set(new Map());
      this.foreignKeys.set([]);
      this.childForeignKeys.set([]);
      this.loadRecord(name, pk);
    });
  }

  protected goBack(): void {
    void this.router.navigate(['/browse']);
  }

  protected navigateToRecord(table: string, pk: string): void {
    void this.router.navigate(['/browse', table, 'record', pk]);
  }

  protected isForeignKeyField(fieldName: string): boolean {
    return this.foreignKeys().some((fk) => fk.column === fieldName);
  }

  protected getForeignKeyForField(fieldName: string): ForeignKeyInfo | undefined {
    return this.foreignKeys().find((fk) => fk.column === fieldName);
  }

  private loadRecord(table: string, pk: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.fetchlane.getRecord(this.baseUrl(), table, pk).subscribe({
      next: (record) => {
        this.record.set(record);
        this.fields.set(Object.entries(record));
        this.loading.set(false);
        this.loadSchema(table, record);
      },
      error: (err) => {
        this.error.set(err?.error?.message ?? 'Failed to load record');
        this.loading.set(false);
      },
    });
  }

  private loadSchema(table: string, record: Record<string, unknown>): void {
    this.fetchlane.getCachedSchema(this.baseUrl(), table).subscribe({
      next: (schema) => {
        const fks = this.fetchlane.extractForeignKeys(schema);
        this.foreignKeys.set(fks);
        this.loadParentRelations(fks, record);

        this.fetchlane.getTableNames(this.baseUrl()).subscribe((allTables) => {
          this.fetchlane
            .findChildForeignKeys(this.baseUrl(), table, allTables)
            .subscribe((childFks) => {
              this.childForeignKeys.set(childFks);
              this.loadChildRelations(childFks, record);
            });
        });
      },
    });
  }

  private loadParentRelations(
    fks: readonly ForeignKeyInfo[],
    record: Record<string, unknown>,
  ): void {
    for (const fk of fks) {
      const value = record[fk.column];
      if (value == null) {
        continue;
      }

      const ds = new FetchlaneDatasource(this.baseUrl(), fk.referencedTable, this.injector);
      ds.setPredicates([
        { text: `${fk.referencedColumn} = :value`, args: { value: String(value) } },
      ]);

      this.fetchlane.getTableSchema(this.baseUrl(), fk.referencedTable).subscribe({
        next: (schema) => {
          ds.applySchema(schema);
          void ds.reload().then(() => {
            const updated = new Map(this.relatedDatasources());
            updated.set(`${fk.column} \u2192 ${fk.referencedTable}`, {
              table: fk.referencedTable,
              datasource: ds,
              columns: this.buildColumns(ds),
            });
            this.relatedDatasources.set(updated);
          });
        },
      });
    }
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

  private loadChildRelations(
    childFks: readonly ChildForeignKeyInfo[],
    record: Record<string, unknown>,
  ): void {
    for (const childFk of childFks) {
      const value = record[childFk.parentColumn];
      if (value == null) {
        continue;
      }

      const ds = new FetchlaneDatasource(this.baseUrl(), childFk.childTable, this.injector);
      ds.setPredicates([
        { text: `${childFk.childColumn} = :value`, args: { value: String(value) } },
      ]);

      this.fetchlane.getTableSchema(this.baseUrl(), childFk.childTable).subscribe({
        next: (schema) => {
          ds.applySchema(schema);
          void ds.reload().then(() => {
            const updated = new Map(this.relatedDatasources());
            updated.set(`${childFk.childTable}.${childFk.childColumn}`, {
              table: childFk.childTable,
              datasource: ds,
              columns: this.buildColumns(ds),
            });
            this.relatedDatasources.set(updated);
          });
        },
      });
    }
  }
}
