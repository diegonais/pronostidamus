import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'path';

function parseBoolean(value?: string): boolean {
  if (!value) {
    return false;
  }

  return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

export function getDatabaseConfig(
  configService: ConfigService,
): TypeOrmModuleOptions {
  const databaseUrl = configService.get<string>('DATABASE_URL');
  const databaseSsl = parseBoolean(configService.get<string>('DATABASE_SSL'));
  const synchronize = parseBoolean(
    configService.get<string>('DATABASE_SYNCHRONIZE'),
  );

  const baseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    entities: [join(__dirname, '..', '**', '*.entity.{js,ts}')],
    synchronize,
    ssl: databaseSsl ? { rejectUnauthorized: false } : false,
  };

  if (databaseUrl) {
    return {
      ...baseConfig,
      url: databaseUrl,
    };
  }

  return {
    ...baseConfig,
    host: configService.get<string>('DATABASE_HOST', 'localhost'),
    port: parseNumber(configService.get<string>('DATABASE_PORT'), 5432),
    username: configService.get<string>('DATABASE_USER', 'pronostidamus_user'),
    password: configService.get<string>(
      'DATABASE_PASSWORD',
      'pronostidamus_password',
    ),
    database: configService.get<string>('DATABASE_NAME', 'pronostidamus'),
  };
}
