import { computed, Injectable, signal } from '@angular/core';

import type { ConnectionConfig } from '../models';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ConnectionManagerService {
  public readonly connections = signal<readonly ConnectionConfig[]>(
    environment.connections as ConnectionConfig[],
  );

  public readonly activeIndex = signal(this.loadActiveIndex());

  public readonly activeConnection = computed<ConnectionConfig>(
    () => this.connections()[this.activeIndex()],
  );

  public setActive(index: number): void {
    const conns = this.connections();
    if (index >= 0 && index < conns.length) {
      this.activeIndex.set(index);
      localStorage.setItem('bo-active-connection', String(index));
    }
  }

  public setActiveByEngine(engine: string): void {
    const index = this.connections().findIndex((c) => c.engine === engine);
    if (index >= 0) {
      this.activeIndex.set(index);
    }
  }

  public addConnection(config: ConnectionConfig): void {
    this.connections.update((conns) => [...conns, config]);
  }

  public removeConnection(index: number): void {
    const conns = this.connections();
    if (index >= 0 && index < conns.length) {
      this.connections.update((c) => c.filter((_, i) => i !== index));
      if (this.activeIndex() >= this.connections().length) {
        this.activeIndex.set(Math.max(0, this.connections().length - 1));
      }
    }
  }

  public updateConnection(index: number, config: ConnectionConfig): void {
    this.connections.update((conns) => conns.map((c, i) => (i === index ? config : c)));
  }

  private loadActiveIndex(): number {
    const stored = localStorage.getItem('bo-active-connection');
    if (stored !== null) {
      const index = Number(stored);
      if (
        !isNaN(index) &&
        index >= 0 &&
        index < (environment.connections as ConnectionConfig[]).length
      ) {
        return index;
      }
    }
    return 0;
  }
}
