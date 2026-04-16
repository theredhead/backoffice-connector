import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  viewChild,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import { LoggerFactory } from '@theredhead/lucid-foundation';
import { ConnectionManagerService } from '../../core/services/connection-manager.service';

// swagger-ui-dist ships a UMD bundle; declare the global it exposes.
declare const SwaggerUIBundle: (config: Record<string, unknown>) => unknown;

@Component({
  selector: 'bo-swagger-viewer',
  imports: [],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './swagger-viewer.component.html',
  styleUrl: './swagger-viewer.component.scss',
  host: { class: 'bo-swagger-viewer' },
})
export class BoSwaggerViewer implements AfterViewInit, OnDestroy {
  private readonly log = inject(LoggerFactory).createLogger('BoSwaggerViewer');
  private readonly http = inject(HttpClient);
  private readonly connections = inject(ConnectionManagerService);

  private readonly container = viewChild.required<ElementRef<HTMLDivElement>>('swaggerContainer');

  private scriptEl: HTMLScriptElement | null = null;
  private cssEl: HTMLLinkElement | null = null;

  public ngAfterViewInit(): void {
    this.loadAssetsAndInit().catch((err) => {
      this.log.error('Failed to initialise Swagger UI', [err]);
    });
  }

  public ngOnDestroy(): void {
    this.scriptEl?.remove();
    this.cssEl?.remove();
    this.scriptEl = null;
    this.cssEl = null;
  }

  private async loadAssetsAndInit(): Promise<void> {
    await Promise.all([this.loadCss(), this.loadScript()]);

    const baseUrl = this.connections.activeConnection().baseUrl;
    const spec = await firstValueFrom(
      this.http.get<Record<string, unknown>>(`${baseUrl}/api/docs-json`),
    );

    SwaggerUIBundle({
      spec,
      domNode: this.container().nativeElement,
      presets: [
        (SwaggerUIBundle as unknown as Record<string, Record<string, unknown>>)['presets']['apis'],
      ],
      layout: 'BaseLayout',
      deepLinking: false,
      displayRequestDuration: true,
    });

    this.log.debug('Swagger UI initialised', [baseUrl]);
  }

  private loadCss(): Promise<void> {
    return new Promise((resolve) => {
      if (document.querySelector('link[data-swagger-ui]')) {
        resolve();
        return;
      }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.dataset['swaggerUi'] = '';
      link.href = 'swagger-ui.css';
      link.onload = () => resolve();
      link.onerror = () => resolve();
      document.head.appendChild(link);
      this.cssEl = link;
    });
  }

  private loadScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof SwaggerUIBundle !== 'undefined') {
        resolve();
        return;
      }
      const existing = document.querySelector('script[data-swagger-ui]');
      if (existing) {
        existing.addEventListener('load', () => resolve());
        return;
      }
      const script = document.createElement('script');
      script.src = 'swagger-ui-bundle.js';
      script.dataset['swaggerUi'] = '';
      script.onload = () => resolve();
      script.onerror = (e) => reject(e);
      document.head.appendChild(script);
      this.scriptEl = script;
    });
  }
}
