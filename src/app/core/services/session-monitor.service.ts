import { DestroyRef, effect, inject, Injectable, Injector, signal } from '@angular/core';

import { LoggerFactory } from '@theredhead/foundation';
import { ModalRef, ModalService } from '@theredhead/ui-kit';
import { AuthorizationService } from './authorization.service';
import {
  BoSessionExpiryDialog,
  type SessionExpiryAction,
} from '../../shared/session-expiry-dialog/session-expiry-dialog.component';

const WARNING_BEFORE_EXPIRY_S = 60;

@Injectable({ providedIn: 'root' })
export class SessionMonitorService {
  private readonly log = inject(LoggerFactory).createLogger('SessionMonitorService');
  private readonly auth = inject(AuthorizationService);
  private readonly modal = inject(ModalService);
  private readonly injector = inject(Injector);
  private readonly destroyRef = inject(DestroyRef);

  /** `true` once the session has expired — app content must be removed from the DOM. */
  public readonly sessionExpired = signal(false);

  private warningTimerId: ReturnType<typeof setTimeout> | null = null;
  private expiryTimerId: ReturnType<typeof setTimeout> | null = null;
  private dialogOpen = false;
  private openModalRef: ModalRef<SessionExpiryAction> | null = null;

  public start(): void {
    effect(
      () => {
        const expiresAt = this.auth.sessionExpiresAt();
        this.scheduleWarning(expiresAt);
      },
      { injector: this.injector },
    );

    this.destroyRef.onDestroy(() => this.clearTimers());
  }

  private scheduleWarning(expiresAt: number | null): void {
    this.clearTimers();

    if (expiresAt === null) {
      return;
    }

    const nowS = Math.floor(Date.now() / 1000);
    const secondsUntilExpiry = expiresAt - nowS;

    if (secondsUntilExpiry <= 0) {
      this.expire();
      return;
    }

    // Schedule the hard expiry
    this.expiryTimerId = setTimeout(() => this.expire(), secondsUntilExpiry * 1000);

    // Schedule the warning dialog
    const warningDelay = (secondsUntilExpiry - WARNING_BEFORE_EXPIRY_S) * 1000;

    if (warningDelay <= 0) {
      this.showWarningDialog();
      return;
    }

    this.log.debug(`Session warning scheduled in ${Math.round(warningDelay / 1000)}s`);
    this.warningTimerId = setTimeout(() => this.showWarningDialog(), warningDelay);
  }

  private clearTimers(): void {
    if (this.warningTimerId !== null) {
      clearTimeout(this.warningTimerId);
      this.warningTimerId = null;
    }
    if (this.expiryTimerId !== null) {
      clearTimeout(this.expiryTimerId);
      this.expiryTimerId = null;
    }
  }

  private expire(): void {
    this.clearTimers();
    this.sessionExpired.set(true);

    if (this.openModalRef) {
      this.openModalRef.close();
      this.openModalRef = null;
      this.dialogOpen = false;
    }
  }

  private showWarningDialog(): void {
    if (this.dialogOpen) {
      return;
    }
    this.dialogOpen = true;

    const ref = this.modal.openModal<BoSessionExpiryDialog, SessionExpiryAction>({
      component: BoSessionExpiryDialog,
      inputs: {},
      ariaLabel: 'Session expiring',
    });
    this.openModalRef = ref;

    ref.closed.subscribe((action) => {
      this.dialogOpen = false;
      this.openModalRef = null;

      if (action === 'extend') {
        this.auth.extendSession().then((ok) => {
          if (!ok) {
            this.auth.logout();
          }
        });
      } else if (action === 'logout') {
        this.auth.logout();
      }
    });
  }
}
