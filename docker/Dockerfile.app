FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx ng build --configuration production

FROM nginx:alpine

ENV FETCHLANE_NAVIGATOR_KEYCLOAK_URL=/auth \
    FETCHLANE_NAVIGATOR_KEYCLOAK_REALM=backoffice \
    FETCHLANE_NAVIGATOR_KEYCLOAK_CLIENT_ID=backoffice-app \
    FETCHLANE_NAVIGATOR_CONNECTIONS_JSON='[{"name":"PostgreSQL","engine":"postgres","baseUrl":"/api/postgres"},{"name":"MySQL","engine":"mysql","baseUrl":"/api/mysql"},{"name":"SQL Server","engine":"mssql","baseUrl":"/api/mssql"}]' \
    FETCHLANE_NAVIGATOR_POSTGRES_API_UPSTREAM=http://127.0.0.1:65535 \
    FETCHLANE_NAVIGATOR_MYSQL_API_UPSTREAM=http://127.0.0.1:65535 \
    FETCHLANE_NAVIGATOR_MSSQL_API_UPSTREAM=http://127.0.0.1:65535 \
    FETCHLANE_NAVIGATOR_KEYCLOAK_PROXY_UPSTREAM=http://127.0.0.1:65535

COPY --from=build /app/dist/fetchlane-navigator/browser /usr/share/nginx/html
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY docker/runtime-config.template.js /usr/share/nginx/html/runtime-config.template.js
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
