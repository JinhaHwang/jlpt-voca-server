import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { NaverOAuthController } from '../src/auth/naver-oauth.controller';
import { NaverOAuthService } from '../src/auth/naver-oauth.service';

describe('Naver OAuth protocol', () => {
  let app: INestApplication;
  const previous = { ...process.env };
  const originalFetch = global.fetch;
  const fetchMock = jest.fn();

  beforeAll(async () => {
    Object.assign(process.env, {
      SUPABASE_URL: 'https://example.supabase.co',
      NAVER_CLIENT_ID: 'client',
      NAVER_CLIENT_SECRET: 'secret',
      NAVER_OAUTH_STATE_SECRET: 'test-state-secret-at-least-32-characters',
      NAVER_OAUTH_CALLBACK_URL:
        'https://api.example.com/api/auth/naver/callback',
    });
    global.fetch = fetchMock;
    const module = await Test.createTestingModule({
      controllers: [NaverOAuthController],
      providers: [NaverOAuthService],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
    process.env = previous;
    global.fetch = originalFetch;
  });

  it('completes redirects, form-encoded token exchange and normalized userinfo', async () => {
    const start = await request(app.getHttpServer())
      .get('/api/auth/naver/authorize')
      .query({
        client_id: 'client',
        redirect_uri: 'https://example.supabase.co/auth/v1/callback',
        response_type: 'code',
        state: 'supabase-state',
      })
      .expect(302)
      .expect('Cache-Control', 'no-store');
    const state = new URL(start.headers.location).searchParams.get('state');
    const callback = await request(app.getHttpServer())
      .get('/api/auth/naver/callback')
      .query({ state, code: 'naver-code' })
      .expect(302);
    const redirect = new URL(callback.headers.location);
    expect(redirect.searchParams.get('state')).toBe('supabase-state');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'token',
        token_type: 'bearer',
        expires_in: '3600',
      }),
    });
    const token = await request(app.getHttpServer())
      .post('/api/auth/naver/token')
      .auth('client', 'secret')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: redirect.searchParams.get('code'),
        redirect_uri: 'https://example.supabase.co/auth/v1/callback',
      })
      .expect(200)
      .expect('Cache-Control', 'no-store');
    expect(token.body.access_token).toBe('token');
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ resultcode: '00', response: { id: 'user' } }),
    });
    const user = await request(app.getHttpServer())
      .get('/api/auth/naver/userinfo')
      .set('Authorization', 'Bearer token')
      .expect(200);
    expect(user.body).toEqual({ sub: 'user' });
  });

  it('returns OAuth errors without reflecting supplied credentials', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/naver/token')
      .type('form')
      .send({
        grant_type: 'authorization_code',
        code: 'invalid',
        redirect_uri: 'https://example.supabase.co/auth/v1/callback',
        client_id: 'client',
        client_secret: 'wrong-secret',
      })
      .expect(401);
    expect(response.body).toEqual({ error: 'invalid_client' });
  });
});
