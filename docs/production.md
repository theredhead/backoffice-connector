# Production Deployment

> **⚠ Not production-ready.** This project is still a prototype. Use these
> instructions for internal demos or controlled environments only.

This guide covers deploying Fetchlane Navigator as a Docker container and
configuring it at runtime without rebuilding the Angular bundle.

## Overview

The production image serves the Angular app through nginx. At container startup
it generates a `runtime-config.js` file from environment variables, which lets
you configure:

- Keycloak URL
- Keycloak realm
- Keycloak client ID
- available Fetchlane connections
- optional nginx proxy upstreams for `/auth` and `/api/*`

## Required Runtime Variables

- `FETCHLANE_NAVIGATOR_KEYCLOAK_URL` — Keycloak base URL such as `/auth` or `https://sso.example.com`
- `FETCHLANE_NAVIGATOR_KEYCLOAK_REALM` — Keycloak realm name
- `FETCHLANE_NAVIGATOR_KEYCLOAK_CLIENT_ID` — public SPA client ID
- `FETCHLANE_NAVIGATOR_CONNECTIONS_JSON` — JSON array of available Fetchlane backends

Example connection JSON:

```json
[
  {
    "name": "Main",
    "engine": "custom",
    "baseUrl": "https://api.example.com"
  }
]
```

## Optional Proxy Variables

Use these only if you want the app container's nginx to proxy local paths
instead of pointing the frontend directly at external URLs.

- `FETCHLANE_NAVIGATOR_POSTGRES_API_UPSTREAM` — upstream for `/api/postgres`
- `FETCHLANE_NAVIGATOR_MYSQL_API_UPSTREAM` — upstream for `/api/mysql`
- `FETCHLANE_NAVIGATOR_MSSQL_API_UPSTREAM` — upstream for `/api/mssql`
- `FETCHLANE_NAVIGATOR_KEYCLOAK_PROXY_UPSTREAM` — upstream for `/auth`

## Keycloak Requirements

Fetchlane Navigator and your Fetchlane backend must trust the same Keycloak
realm.

- Realm: `backoffice` by default
- SPA client: `backoffice-app`
- PKCE: `S256`
- Redirect URI: your deployed app URL, for example `https://navigator.example.com/*`
- Web origin: your deployed app origin, for example `https://navigator.example.com`
- API audience in access tokens: `fetchlane-api`

The example realm export lives in `src/keycloak/backoffice-realm.json`.

## Fetchlane Requirements

Your Fetchlane backend must:

- enable `oidc-jwt` authentication
- use the same issuer URL as the frontend Keycloak realm
- expect audience `fetchlane-api`
- allow CORS from your deployed frontend origin if you are not proxying through nginx

Working examples live in `src/fetchlane-config/`.

## Docker Run Example

This example points the frontend directly at an external Fetchlane backend and
an external Keycloak server.

```bash
docker run -p 80:80 \
  -e FETCHLANE_NAVIGATOR_KEYCLOAK_URL=https://sso.example.com \
  -e FETCHLANE_NAVIGATOR_KEYCLOAK_REALM=backoffice \
  -e FETCHLANE_NAVIGATOR_KEYCLOAK_CLIENT_ID=backoffice-app \
  -e 'FETCHLANE_NAVIGATOR_CONNECTIONS_JSON=[{"name":"Main","engine":"custom","baseUrl":"https://api.example.com"}]' \
  theredhead/fetchlane-navigator:latest
```

## Docker Run With nginx Proxying

This example keeps browser traffic on same-origin paths and lets the container
proxy requests to internal services.

```bash
docker run -p 80:80 \
  -e FETCHLANE_NAVIGATOR_KEYCLOAK_URL=/auth \
  -e FETCHLANE_NAVIGATOR_KEYCLOAK_REALM=backoffice \
  -e FETCHLANE_NAVIGATOR_KEYCLOAK_CLIENT_ID=backoffice-app \
  -e 'FETCHLANE_NAVIGATOR_CONNECTIONS_JSON=[{"name":"PostgreSQL","engine":"postgres","baseUrl":"/api/postgres"}]' \
  -e FETCHLANE_NAVIGATOR_POSTGRES_API_UPSTREAM=http://fetchlane-postgres:3000 \
  -e FETCHLANE_NAVIGATOR_KEYCLOAK_PROXY_UPSTREAM=http://keycloak:8080 \
  theredhead/fetchlane-navigator:latest
```

## Docker Compose Example

```yaml
services:
  app:
    image: theredhead/fetchlane-navigator:latest
    ports:
      - '80:80'
    environment:
      FETCHLANE_NAVIGATOR_KEYCLOAK_URL: /auth
      FETCHLANE_NAVIGATOR_KEYCLOAK_REALM: backoffice
      FETCHLANE_NAVIGATOR_KEYCLOAK_CLIENT_ID: backoffice-app
      FETCHLANE_NAVIGATOR_KEYCLOAK_PROXY_UPSTREAM: http://keycloak:8080
      FETCHLANE_NAVIGATOR_CONNECTIONS_JSON: >-
        [{"name":"Main","engine":"custom","baseUrl":"https://api.example.com"}]
```

## Notes

- If you use external URLs in `FETCHLANE_NAVIGATOR_CONNECTIONS_JSON`, you do not
  need the optional nginx upstream variables.
- If you use `/auth` or `/api/*` base URLs in `FETCHLANE_NAVIGATOR_CONNECTIONS_JSON`,
  you must configure the matching upstream environment variables.
- For local demo wiring, see `docker/docker-compose.demo.yml`.
