import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

function parseBoolean(value?: string): boolean {
  return value === 'true';
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
    autoLoadEntities: true,
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
    port: configService.get<number>('DATABASE_PORT', 5432),
    username: configService.get<string>('DATABASE_USER', 'pronostidamus_user'),
    password: configService.get<string>(
      'DATABASE_PASSWORD',
      'pronostidamus_password',
    ),
    database: configService.get<string>('DATABASE_NAME', 'pronostidamus'),
  };
}
