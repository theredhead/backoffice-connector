import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { PopoverRef, type UIPopoverContent } from '@theredhead/ui-kit';

export type UserMenuAction = 'account' | 'logout';

@Component({
  selector: 'bo-user-menu',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bo-user-menu' },
  templateUrl: './user-menu.component.html',
  styleUrl: './user-menu.component.scss',
})
export class BoUserMenu implements UIPopoverContent<UserMenuAction> {
  public readonly popoverRef = inject<PopoverRef<UserMenuAction>>(PopoverRef);

  public readonly accountUrl = input<string | null>(null);

  protected onAccount(): void {
    this.popoverRef.close('account');
  }

  protected onLogout(): void {
    this.popoverRef.close('logout');
  }
}
