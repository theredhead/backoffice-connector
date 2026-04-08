import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { LoggerFactory } from '@theredhead/foundation';
import { UIButton, UIIcon, UIIcons, ModalRef } from '@theredhead/ui-kit';
import { FormEngine, UIForm } from '@theredhead/ui-forms';
import type { FormSchema, FormValues } from '@theredhead/ui-forms';
import type { DbEngine } from '../../core/datasources/fetchlane-datasource';

export interface RecordFormResult {
  readonly action: 'save';
  readonly values: FormValues;
}

@Component({
  selector: 'bo-record-form-dialog',
  imports: [UIButton, UIIcon, UIForm],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bo-record-form-dialog' },
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-width: 420px;
      max-width: 640px;
      max-height: 80vh;
      overflow: hidden;
    }
    .bo-form-dialog-header {
      display: flex;
      align-items: baseline;
      gap: 8px;
      padding: 20px 24px 12px;
      border-bottom: 1px solid var(--ui-border);
    }
    .bo-form-dialog-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0;
    }
    .bo-form-dialog-subtitle {
      font-size: 0.8125rem;
      color: var(--ui-text-muted, var(--ui-text));
      font-weight: 400;
    }
    .bo-form-dialog-body {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 20px 24px;
    }
    .bo-form-dialog-error {
      color: var(--ui-danger);
      font-size: 0.8125rem;
      margin: 8px 0 0;
    }
    .bo-form-dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      padding: 12px 24px;
      border-top: 1px solid var(--ui-border);
      background: color-mix(in srgb, var(--ui-surface) 90%, var(--ui-text) 10%);
    }
    .bo-form-dialog-save-wrapper {
      position: relative;
    }
    .bo-form-dialog-validation-popover {
      display: none;
      position: absolute;
      bottom: calc(100% + 8px);
      right: 0;
      min-width: 260px;
      max-width: 360px;
      padding: 12px 16px;
      border-radius: 8px;
      background: var(--ui-surface-raised, var(--ui-surface));
      color: var(--ui-text);
      border: 1px solid var(--ui-border);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
      font-size: 0.8125rem;
      z-index: 10;
    }
    .bo-form-dialog-validation-popover::after {
      content: '';
      position: absolute;
      top: 100%;
      right: 24px;
      border: 6px solid transparent;
      border-top-color: var(--ui-border);
    }
    .bo-form-dialog-save-wrapper:hover .bo-form-dialog-validation-popover {
      display: block;
    }
    .bo-form-dialog-validation-popover strong {
      color: var(--ui-danger, #ef4444);
    }
    .bo-form-dialog-validation-popover ul {
      margin: 6px 0 0;
      padding: 0 0 0 16px;
    }
    .bo-form-dialog-validation-popover li {
      margin: 4px 0;
    }
    .bo-form-dialog-validation-popover li span {
      display: block;
      color: var(--ui-text-muted, var(--ui-text));
    }
  `,
  template: `
    <div class="bo-form-dialog-header">
      <h2 class="bo-form-dialog-title">{{ title() }}</h2>
    </div>
    @if (engine(); as eng) {
      <div class="bo-form-dialog-body">
        <ui-form [engine]="eng" [showSubmit]="false" />
        @if (errorMessage()) {
          <p class="bo-form-dialog-error">{{ errorMessage() }}</p>
        }
      </div>
      <div class="bo-form-dialog-footer">
        <ui-button variant="ghost" (click)="onCancel()">Cancel</ui-button>
        <div class="bo-form-dialog-save-wrapper">
          <ui-button color="primary" [disabled]="!eng.valid()" (click)="onSave(eng)">
            <ui-icon [svg]="saveIcon" [size]="16" />
            Save
          </ui-button>
          @if (validationSummary().length > 0) {
            <div class="bo-form-dialog-validation-popover" role="status">
              <strong>Cannot save:</strong>
              <ul>
                @for (item of validationSummary(); track item.title) {
                  <li>
                    <strong>{{ item.title }}</strong>
                    @for (err of item.errors; track err) {
                      <span>{{ err }}</span>
                    }
                  </li>
                }
              </ul>
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class BoRecordFormDialog {
  private readonly log = inject(LoggerFactory).createLogger('BoRecordFormDialog');
  public readonly modalRef = inject(ModalRef<RecordFormResult>);

  public readonly title = input('Record');
  public readonly formSchema = input.required<FormSchema>();
  public readonly initialValues = input<Record<string, unknown>>({});
  public readonly lookupBaseUrl = input('');
  public readonly lookupEngine = input<DbEngine>('postgres');

  protected readonly engine = signal<FormEngine | null>(null);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly saveIcon = UIIcons.Lucide.Files.Save;

  protected readonly validationSummary = computed(() => {
    const eng = this.engine();
    if (!eng || eng.valid()) return [];
    const summary: { title: string; errors: string[] }[] = [];
    for (const group of eng.groups) {
      for (const field of group.fields) {
        if (!field.visible()) continue;
        const v = field.validation();
        if (!v.valid) {
          summary.push({
            title: field.definition.title || field.definition.id,
            errors: v.errors.map((e) => e.message),
          });
        }
      }
    }
    return summary;
  });

  public constructor() {
    // Build engine after inputs are set — ModalService sets inputs after construction
    queueMicrotask(() => this.initEngine());
  }

  private initEngine(): void {
    const schema = this.formSchema();
    if (!schema) {
      return;
    }
    const baseUrl = this.lookupBaseUrl();
    const dbEngine = this.lookupEngine();
    const stripped: FormSchema = {
      ...schema,
      title: undefined,
      groups: schema.groups.map((g) => ({
        ...g,
        title: undefined,
        fields: g.fields.map((f) =>
          f.component === 'fk'
            ? { ...f, config: { ...f.config, lookupBaseUrl: baseUrl, lookupEngine: dbEngine } }
            : f,
        ),
      })),
    };
    const eng = new FormEngine(stripped);
    const initial = this.initialValues();
    for (const [key, value] of Object.entries(initial)) {
      try {
        eng.setValue(key, value);
      } catch {
        // Field may not exist in form (e.g. identity columns)
      }
    }
    this.engine.set(eng);
  }

  protected onSave(eng: FormEngine): void {
    eng.markAllTouched();
    if (!eng.valid()) {
      return;
    }
    this.modalRef.close({ action: 'save', values: eng.output()() });
  }

  protected onCancel(): void {
    this.modalRef.close(undefined);
  }
}
