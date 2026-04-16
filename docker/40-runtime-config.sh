#!/bin/sh
set -eu

: "${FETCHLANE_NAVIGATOR_KEYCLOAK_URL:=/auth}"
: "${FETCHLANE_NAVIGATOR_KEYCLOAK_REALM:=backoffice}"
: "${FETCHLANE_NAVIGATOR_KEYCLOAK_CLIENT_ID:=backoffice-app}"
: "${FETCHLANE_NAVIGATOR_CONNECTIONS_JSON:=[{\"name\":\"PostgreSQL\",\"engine\":\"postgres\",\"baseUrl\":\"/api/postgres\"},{\"name\":\"MySQL\",\"engine\":\"mysql\",\"baseUrl\":\"/api/mysql\"},{\"name\":\"SQL Server\",\"engine\":\"mssql\",\"baseUrl\":\"/api/mssql\"}]}"
: "${FETCHLANE_NAVIGATOR_POSTGRES_API_UPSTREAM:=http://127.0.0.1:65535}"
: "${FETCHLANE_NAVIGATOR_MYSQL_API_UPSTREAM:=http://127.0.0.1:65535}"
: "${FETCHLANE_NAVIGATOR_MSSQL_API_UPSTREAM:=http://127.0.0.1:65535}"
: "${FETCHLANE_NAVIGATOR_KEYCLOAK_PROXY_UPSTREAM:=http://127.0.0.1:65535}"

envsubst '${FETCHLANE_NAVIGATOR_KEYCLOAK_URL} ${FETCHLANE_NAVIGATOR_KEYCLOAK_REALM} ${FETCHLANE_NAVIGATOR_KEYCLOAK_CLIENT_ID} ${FETCHLANE_NAVIGATOR_CONNECTIONS_JSON}' \
  < /usr/share/nginx/html/runtime-config.template.js \
  > /usr/share/nginx/html/runtime-config.js
