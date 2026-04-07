# Backoffice Connector

> **⚠ Not production-ready.** This project is a working prototype / demo. APIs,
> security configuration, and data handling have not been hardened for
> production use.

A database browser and record editor built with **Angular 21** (zoneless,
signal-based) that connects to multiple database engines through
[Fetchlane](https://github.com/niclas-AKB/fetchlane) REST backends, secured by
**Keycloak** OIDC authentication.

## Features

- **Multi-engine support** — browse PostgreSQL, MySQL, and SQL Server databases
  side by side via separate Fetchlane instances.
- **Table browser** — paginated table view with foreign-key link navigation.
- **Record inspector** — detail view for individual records with parent and
  child relation tabs.
- **CRUD operations** — add, edit, and delete records through auto-generated
  form dialogs derived from table schema metadata.
- **Form overrides** — global config for customising generated forms per table.
- **Schema viewer** — inspect column metadata, preview generated add/edit forms,
  and copy form JSON for override authoring.
- **Keycloak authentication** — PKCE-based OIDC login with role-based access
  (`admin` = full CRUD, `guest` = read-only).
- **Theming** — Material 3 design tokens with automatic dark mode via
  `@theredhead/ui-theme`.

## Prerequisites

- **Node.js** ≥ 20
- **npm** ≥ 10
- **Docker** & **Docker Compose** v2

The `@theredhead` UI libraries are consumed as local tarballs (see
`package.json`). Make sure the sibling `theredhead-frontend-library` repo is
built before running `npm install`.

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Start infrastructure (Keycloak + 3 databases + 3 Fetchlane instances)
npm run docker:up

# 3. Start the Angular dev server
npm start
```

Open <http://localhost:4200> and log in with one of the demo accounts:

| User    | Password | Role  |
| ------- | -------- | ----- |
| `admin` | `admin`  | admin |
| `guest` | `guest`  | guest |

### Full containerised demo

To run everything inside Docker (including the Angular app served by nginx):

```bash
npm run docker:demo
```

### Tear down

```bash
npm run docker:down        # dev infrastructure only
npm run docker:demo:down   # full demo stack
```

## Development

| Command            | Description                           |
| ------------------ | ------------------------------------- |
| `npm start`        | Dev server on `http://localhost:4200` |
| `npm run build`    | Production build → `dist/`            |
| `npm test`         | Run unit tests (Vitest)               |
| `npx tsc --noEmit` | Type-check without emitting           |

## Infrastructure

| Service            | Purpose                       | Port |
| ------------------ | ----------------------------- | ---- |
| Keycloak           | OIDC identity provider        | 8080 |
| Fetchlane Postgres | REST API → PostgreSQL Chinook | 3001 |
| Fetchlane MySQL    | REST API → MySQL Chinook      | 3002 |
| Fetchlane MSSQL    | REST API → SQL Server Chinook | 3003 |
| Angular dev server | `ng serve`                    | 4200 |
