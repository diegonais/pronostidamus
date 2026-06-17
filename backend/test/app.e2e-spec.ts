import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/auth/status (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/auth/status')
      .expect(200)
      .expect({
        module: 'AuthModule',
        phase: 'preview',
        authentication: 'pending',
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
