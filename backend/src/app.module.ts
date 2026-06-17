import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { configuration } from './config/configuration';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RoomsModule } from './rooms/rooms.module';
import { MatchesModule } from './matches/matches.module';
import { PredictionsModule } from './predictions/predictions.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('database.url');
        const useSsl = configService.get<boolean>('database.ssl', false);
        const sslRejectUnauthorized = configService.get<boolean>(
          'database.sslRejectUnauthorized',
          true,
        );

        return {
          type: 'postgres',
          ...(databaseUrl
            ? {
                url: databaseUrl,
              }
            : {
                host: configService.getOrThrow<string>('database.host'),
                port: configService.getOrThrow<number>('database.port'),
                username: configService.getOrThrow<string>('database.username'),
                password: configService.getOrThrow<string>('database.password'),
                database: configService.getOrThrow<string>('database.name'),
              }),
          ssl: useSsl
            ? {
                rejectUnauthorized: sslRejectUnauthorized,
              }
            : false,
          autoLoadEntities: true,
          synchronize: configService.get<boolean>('database.synchronize', true),
          logging: configService.get<boolean>('database.logging', false),
          timezone: 'Z',
        };
      },
    }),
    AuthModule,
    UsersModule,
    RoomsModule,
    MatchesModule,
    PredictionsModule,
  ],
})
export class AppModule {}
