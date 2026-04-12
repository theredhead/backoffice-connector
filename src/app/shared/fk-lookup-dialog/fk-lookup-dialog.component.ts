import {
  ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  Injector,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime } from 'rxjs';
import {
  UITableView,
  UITextColumn,
  UIButton,
  UIFilter,
  ModalRef,
  type FilterDescriptor,
  type FilterFieldDefinition,
  type FilterFieldType,
} from '@theredhead/lucid-kit';
import { LoggerFactory } from '@theredhead/lucid-foundation';
import type { DbEngine } from '../../core/datasources/fetchlane-datasource';
import { FetchlaneDatasource } from '../../core/datasources/fetchlane-datasource';
import { FetchlaneService } from '../../core/services/fetchlane.service';

interface LookupColumnDef {
  readonly key: string;
  readonly header: string;
}

@Component({
  selector: 'bo-fk-lookup-dialog',
  imports: [UITableView, UITextColumn, UIButton, UIFilter],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bo-fk-lookup-dialog' },
  styleUrl: './fk-lookup-dialog.component.scss',
  template: `
    <div class="bo-fk-lookup-header">
      <h2 class="bo-fk-lookup-title">{{ title() }}</h2>
    </div>
    <div class="bo-fk-lookup-body">
      @if (loading()) {
        <p class="bo-fk-lookup-loading">Loading…</p>
      }
      @if (datasource(); as ds) {
        @if (filterFields().length > 0) {
          <ui-filter [fields]="filterFields()" (valueChange)="onFilterChanged($event)" />
        }
        <ui-table-view
          [datasource]="ds"
          [tableId]="tableId()"
          [pageSize]="50"
          selectionMode="single"
          [rowClickSelect]="true"
          [showBuiltInPaginator]="true"
          (selectionChange)="onSelectionChanged($event)"
        >
          @for (col of columns(); track col.key) {
            <ui-text-column [key]="col.key" [headerText]="col.header" />
          }
        </ui-table-view>
      }
    </div>
    <div class="bo-fk-lookup-footer">
      @if (loadTimeMs()) {
        <span class="bo-fk-lookup-timing">Loaded in {{ loadTimeMs() }} ms</span>
      }
      <ui-button variant="ghost" (click)="onCancel()">Cancel</ui-button>
      <ui-button color="primary" [disabled]="!selectedRow()" (click)="onSelect()">
        Select
      </ui-button>
    </div>
  `,
})
export class BoFkLookupDialog {
  private readonly log = inject(LoggerFactory).createLogger('BoFkLookupDialog');
  private readonly injector = inject(Injector);
  private readonly fetchlane = inject(FetchlaneService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly appRef = inject(ApplicationRef);
  public readonly modalRef = inject(ModalRef<unknown>);

  public readonly title = input('Select Record');
  public readonly baseUrl = input('');
  public readonly referencedTable = input('');
  public readonly referencedColumn = input('');
  public readonly engine = input<DbEngine>('postgres');

  protected readonly datasource = signal<FetchlaneDatasource | null>(null);
  protected readonly columns = signal<readonly LookupColumnDef[]>([]);
  protected readonly filterFields = signal<FilterFieldDefinition[]>([]);
  protected readonly selectedRow = signal<Record<string, unknown> | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadTimeMs = signal<number | null>(null);

  protected readonly tableId = computed(() => 'bo-browse-' + this.referencedTable());

  private readonly filterSubject = new Subject<FilterDescriptor>();
  private filterApplied = false;
  private initStart = 0;

  public constructor() {
    this.filterSubject
      .pipe(debounceTime(400), takeUntilDestroyed(this.destroyRef))
      .subscribe((descriptor) => {
        this.datasource()?.applyFilterDescriptor(descriptor);
      });

    // ModalService sets inputs synchronously after construction.
    // queueMicrotask runs after that, so inputs are available.
    queueMicrotask(() => {
      const baseUrl = this.baseUrl();
      const table = this.referencedTable();
      const eng = this.engine();
      if (!baseUrl || !table) {
        return;
      }
      this.initStart = performance.now();
      this.init(baseUrl, table, eng);
    });
  }

  private init(baseUrl: string, table: string, eng: DbEngine): void {
    this.fetchlane.getCachedSchema(baseUrl, table).subscribe({
      next: (schema) => {
        const ds = new FetchlaneDatasource(baseUrl, table, eng, this.injector);
        ds.applySchema(schema);

        const fkColumns = new Set(this.fetchlane.extractForeignKeys(schema).map((fk) => fk.column));

        this.columns.set(
          schema.columns
            .filter((c) => !fkColumns.has(c.column_name))
            .map((c) => ({ key: c.column_name, header: this.humanize(c.column_name) })),
        );

        this.filterFields.set(
          schema.columns.map((col) => ({
            key: col.column_name,
            label: this.humanize(col.column_name),
            type: this.sqlTypeToFilterType(col.data_type),
          })),
        );

        void ds
          .reload()
          .then(() => {
            const fetchDone = performance.now();
            // Tick 1: create the table DOM so the virtual scroll
            // viewport can measure its container height.
            this.datasource.set(ds);
            this.appRef.tick();
            // Tick 2 (next frame): viewport is laid out, rows render.
            requestAnimationFrame(() => {
              this.loading.set(false);
              this.loadTimeMs.set(Math.round(fetchDone - this.initStart));
              this.appRef.tick();
            });
          })
          .catch((err) => {
            this.log.error('Failed to reload lookup data', [err]);
            this.loading.set(false);
          });
      },
      error: (err) => {
        this.log.error('Failed to load lookup schema', [err]);
        this.loading.set(false);
      },
    });
  }

  protected onSelectionChanged(rows: readonly unknown[]): void {
    this.selectedRow.set(rows.length > 0 ? (rows[0] as Record<string, unknown>) : null);
  }

  protected onFilterChanged(descriptor: FilterDescriptor): void {
    // Skip the initial empty emission from UIFilter init to prevent
    // applyFilterDescriptor → reload() from wiping the just-loaded data.
    if (descriptor.rules.length === 0 && !this.filterApplied) {
      return;
    }
    this.filterApplied = descriptor.rules.length > 0;
    this.filterSubject.next(descriptor);
  }

  protected onSelect(): void {
    const row = this.selectedRow();
    if (row) {
      this.modalRef.close(row[this.referencedColumn()]);
    }
  }

  protected onCancel(): void {
    this.modalRef.close(undefined);
  }

  private humanize(key: string): string {
    return key
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  private sqlTypeToFilterType(dataType: string): FilterFieldType {
    const lower = dataType.toLowerCase();
    if (
      lower.includes('int') ||
      lower.includes('numeric') ||
      lower.includes('decimal') ||
      lower.includes('float') ||
      lower.includes('double') ||
      lower.includes('real') ||
      lower.includes('money')
    ) {
      return 'number';
    }
    if (lower.includes('date') || lower.includes('time')) {
      return 'date';
    }
    return 'string';
  }
}
