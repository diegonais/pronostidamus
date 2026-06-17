export const configuration = () => ({
  app: {
    port: parseInt(process.env.PORT ?? '3000', 10),
    timezone: process.env.TZ ?? 'America/La_Paz',
  },
  database: {
    url: process.env.DATABASE_URL?.trim() || undefined,
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    name: process.env.DB_NAME ?? 'pronostidamus',
    ssl: (process.env.DB_SSL ?? 'false') === 'true',
    sslRejectUnauthorized:
      (process.env.DB_SSL_REJECT_UNAUTHORIZED ?? 'true') === 'true',
    synchronize: (process.env.DB_SYNCHRONIZE ?? 'true') === 'true',
    logging: (process.env.DB_LOGGING ?? 'false') === 'true',
  },
});
