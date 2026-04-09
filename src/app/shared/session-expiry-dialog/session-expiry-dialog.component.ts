import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';

import { UIButton, ModalRef } from '@theredhead/ui-kit';

export type SessionExpiryAction = 'extend' | 'logout';

@Component({
  selector: 'bo-session-expiry-dialog',
  imports: [UIButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'bo-session-expiry-dialog' },
  styles: `
    :host {
      display: block;
      padding: 24px;
      min-width: 340px;
      max-width: 440px;
    }
    .bo-session-title {
      font-size: 1.125rem;
      font-weight: 600;
      margin: 0 0 8px;
    }
    .bo-session-message {
      font-size: 0.875rem;
      margin: 0 0 20px;
      opacity: 0.85;
      line-height: 1.5;
    }
    .bo-session-countdown {
      font-variant-numeric: tabular-nums;
    }
    .bo-session-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
  `,
  template: `
    <h2 class="bo-session-title">Session expiring</h2>
    <p class="bo-session-message">
      Your session will expire in
      <strong class="bo-session-countdown">{{ secondsLeft() }}</strong>
      seconds.
    </p>
    <div class="bo-session-actions">
      <ui-button variant="ghost" (click)="onLogout()">Logout</ui-button>
      <ui-button color="primary" (click)="onStayLoggedIn()"> Stay logged in </ui-button>
    </div>
  `,
})
export class BoSessionExpiryDialog implements OnInit {
  public readonly modalRef = inject(ModalRef<SessionExpiryAction>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly secondsLeft = signal(60);

  private timerId: ReturnType<typeof setInterval> | null = null;

  public ngOnInit(): void {
    this.startCountdown();
  }

  protected onStayLoggedIn(): void {
    this.stopCountdown();
    this.modalRef.close('extend');
  }

  protected onLogout(): void {
    this.stopCountdown();
    this.modalRef.close('logout');
  }

  private startCountdown(): void {
    this.timerId = setInterval(() => {
      const next = this.secondsLeft() - 1;
      if (next <= 0) {
        this.stopCountdown();
        this.secondsLeft.set(0);
      } else {
        this.secondsLeft.set(next);
      }
    }, 1000);

    this.destroyRef.onDestroy(() => this.stopCountdown());
  }

  private stopCountdown(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }
}
