import { environment } from '../../../environments/environment';
import type { ConnectionConfig } from '../models';

interface RuntimeKeycloakConfig {
  readonly url?: string;
  readonly realm?: string;
  readonly clientId?: string;
}

interface RuntimeConfig {
  readonly keycloak?: RuntimeKeycloakConfig;
  readonly connections?: readonly ConnectionConfig[];
}

function readRuntimeConfig(): RuntimeConfig {
  return (
    (globalThis as typeof globalThis & { readonly __boRuntimeConfig?: RuntimeConfig })
      .__boRuntimeConfig ?? {}
  );
}

function readRuntimeValue(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function readConnections(runtimeConfig: RuntimeConfig): readonly ConnectionConfig[] {
  const runtimeConnections = runtimeConfig.connections;
  return Array.isArray(runtimeConnections) && runtimeConnections.length > 0
    ? runtimeConnections
    : (environment.connections as readonly ConnectionConfig[]);
}

const runtimeConfig = readRuntimeConfig();

export const appEnvironment = {
  production: environment.production,
  keycloak: {
    url: readRuntimeValue(runtimeConfig.keycloak?.url, environment.keycloak.url),
    realm: readRuntimeValue(runtimeConfig.keycloak?.realm, environment.keycloak.realm),
    clientId: readRuntimeValue(runtimeConfig.keycloak?.clientId, environment.keycloak.clientId),
  },
  connections: readConnections(runtimeConfig),
};
