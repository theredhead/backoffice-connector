export const environment = {
  production: true,
  keycloak: {
    url: 'http://localhost:8080',
    realm: 'backoffice',
    clientId: 'backoffice-app',
  },
  connections: [
    { name: 'PostgreSQL', engine: 'postgres', baseUrl: 'http://localhost:3001' },
    { name: 'MySQL', engine: 'mysql', baseUrl: 'http://localhost:3002' },
    { name: 'SQL Server', engine: 'mssql', baseUrl: 'http://localhost:3003' },
  ],
};
