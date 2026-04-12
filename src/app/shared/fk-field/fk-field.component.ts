import { ChangeDetectionStrategy, Component, inject, input, model } from '@angular/core';

import { UIButton, UIIcon, UIIcons, UIInput, ModalService } from '@theredhead/lucid-kit';
import type { DbEngine } from '../../core/datasources/fetchlane-datasource';
import { BoFkLookupDialog } from '../fk-lookup-dialog/fk-lookup-dialog.component';

@Component({
  selector: 'bo-foreign-key-field',
  imports: [UIButton, UIIcon, UIInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bo-foreign-key-field' },
  styles: `
    :host {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    :host ui-input {
      flex: 1;
    }
  `,
  template: `
    <ui-input
      [(value)]="value"
      type="number"
      [placeholder]="placeholder()"
      [disabled]="disabled()"
    />
    <ui-button
      size="small"
      variant="ghost"
      [disabled]="disabled()"
      (click)="browse()"
      [ariaLabel]="'Browse ' + referencedTable()"
    >
      <ui-icon [svg]="searchIcon" [size]="14" />
    </ui-button>
  `,
})
export class BoForeignKeyField {
  private readonly modal = inject(ModalService);

  public readonly value = model<string>('');
  public readonly placeholder = input('');
  public readonly disabled = input(false);
  public readonly referencedTable = input('');
  public readonly referencedColumn = input('');
  public readonly lookupBaseUrl = input('');
  public readonly lookupEngine = input<DbEngine>('postgres');

  protected readonly searchIcon = UIIcons.Lucide.Social.Search;

  protected browse(): void {
    const ref = this.modal.openModal<BoFkLookupDialog, unknown>({
      component: BoFkLookupDialog,
      inputs: {
        title: `Select ${this.referencedTable()}`,
        baseUrl: this.lookupBaseUrl(),
        referencedTable: this.referencedTable(),
        referencedColumn: this.referencedColumn(),
        engine: this.lookupEngine(),
      },
      ariaLabel: `Select ${this.referencedTable()} record`,
    });

    ref.closed.subscribe((selected) => {
      if (selected !== undefined) {
        this.value.set(String(selected));
      }
    });
  }
}
