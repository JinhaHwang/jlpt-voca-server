import {
  BadGatewayException,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { NaverOAuthService } from './naver-oauth.service';

describe('Naver OAuth adapter', () => {
  const service = new NaverOAuthService();
  const previous = { ...process.env };
  const callback = 'https://example.supabase.co/auth/v1/callback';
  const fetchMock = jest.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.NAVER_CLIENT_ID = 'client';
    process.env.NAVER_CLIENT_SECRET = 'client-secret';
    process.env.NAVER_OAUTH_STATE_SECRET =
      'test-state-secret-with-at-least-32-characters';
    process.env.NAVER_OAUTH_CALLBACK_URL =
      'https://api.example.com/api/auth/naver/callback';
    process.env.SUPABASE_URL = 'https://example.supabase.co';
    global.fetch = fetchMock;
    fetchMock.mockReset();
  });
  afterEach(() => jest.restoreAllMocks());
  afterAll(() => {
    process.env = previous;
    global.fetch = originalFetch;
  });

  function start() {
    return new URL(
      service.authorize({
        client_id: 'client',
        redirect_uri: callback,
        response_type: 'code',
        state: 'supabase-state',
      }),
    );
  }
  function authorizationCode() {
    const state = start().searchParams.get('state')!;
    const redirect = new URL(
      service.callback({ state, code: 'naver-one-use-code' }),
    );
    return { state, code: redirect.searchParams.get('code')! };
  }
  function tokenBody(code: string) {
    return {
      code,
      grant_type: 'authorization_code',
      redirect_uri: callback,
      client_id: 'client',
      client_secret: 'client-secret',
    };
  }

  it('uses a fixed provider endpoint and signs state', () => {
    const url = start();
    expect(url.origin).toBe('https://nid.naver.com');
    expect(url.searchParams.get('redirect_uri')).toBe(
      process.env.NAVER_OAUTH_CALLBACK_URL,
    );
    expect(url.searchParams.get('state')).not.toBe('supabase-state');
  });

  it.each([
    'https://evil.example/callback',
    `${callback}/../evil`,
    `${callback}?next=evil`,
  ])('rejects redirect injection: %s', (redirect_uri) => {
    expect(() =>
      service.authorize({
        client_id: 'client',
        response_type: 'code',
        state: 's',
        redirect_uri,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects unknown clients', () => {
    expect(() =>
      service.authorize({
        client_id: 'other',
        response_type: 'code',
        state: 's',
        redirect_uri: callback,
      }),
    ).toThrow(BadRequestException);
  });

  it('fails only login when configuration is absent', () => {
    delete process.env.NAVER_CLIENT_ID;
    expect(() => start()).toThrow(ServiceUnavailableException);
  });

  it('rejects tampered state and expired state', () => {
    const state = start().searchParams.get('state')!;
    expect(() => service.callback({ state: `${state}x`, code: 'c' })).toThrow(
      BadRequestException,
    );
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 601_000);
    expect(() => service.callback({ state, code: 'c' })).toThrow(
      BadRequestException,
    );
  });

  it('returns cancellation to Supabase without exposing provider messages', () => {
    const state = start().searchParams.get('state')!;
    const url = new URL(service.callback({ state, error: 'private-error' }));
    expect(url.origin).toBe('https://example.supabase.co');
    expect(url.searchParams.get('state')).toBe('supabase-state');
    expect(url.searchParams.get('error')).toBe('access_denied');
    expect(url.toString()).not.toContain('private-error');
  });

  it('restores Naver state during token exchange and omits refresh tokens', async () => {
    const { state, code } = authorizationCode();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'naver-token',
        token_type: 'bearer',
        expires_in: '3600',
        refresh_token: 'not-forwarded',
      }),
    });
    expect(await service.token(tokenBody(code))).toEqual({
      access_token: 'naver-token',
      token_type: 'Bearer',
      expires_in: 3600,
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://nid.naver.com/oauth2.0/token');
    const params = new URLSearchParams(init.body);
    expect(params.get('state')).toBe(state);
    expect(params.get('code')).toBe('naver-one-use-code');
    expect(params.get('client_secret')).toBe('client-secret');
    expect(init.redirect).toBe('error');
  });

  it('supports Supabase HTTP Basic client authentication', async () => {
    const { code } = authorizationCode();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        access_token: 'token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    });
    const { client_id, client_secret, ...body } = tokenBody(code);
    await expect(
      service.token(
        body,
        `Basic ${Buffer.from(`${client_id}:${client_secret}`).toString('base64')}`,
      ),
    ).resolves.toHaveProperty('access_token', 'token');
  });

  it('rejects secret mismatch before contacting Naver', async () => {
    const { code } = authorizationCode();
    await expect(
      service.token({ ...tokenBody(code), client_secret: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects expired and wrong-purpose codes before exchange', async () => {
    const { code, state } = authorizationCode();
    await expect(service.token(tokenBody(state))).rejects.toThrow(
      BadRequestException,
    );
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 61_000);
    await expect(service.token(tokenBody(code))).rejects.toThrow(
      BadRequestException,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects replay when Naver rejects the already consumed code', async () => {
    const { code } = authorizationCode();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ error: 'invalid_grant' }),
    });
    await expect(service.token(tokenBody(code))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('normalizes the stable profile ID without trusting email or extra fields', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        resultcode: '00',
        response: {
          id: 'stable-id',
          nickname: 'reader',
          email: 'unverified@example.com',
          birthday: '0101',
        },
      }),
    });
    expect(await service.userinfo('Bearer token')).toEqual({
      sub: 'stable-id',
      name: 'reader',
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openapi.naver.com/v1/nid/me',
      expect.objectContaining({ headers: { Authorization: 'Bearer token' } }),
    );
  });

  it('rejects missing profile credentials and malformed provider profiles', async () => {
    await expect(service.userinfo()).rejects.toThrow(UnauthorizedException);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ resultcode: '00', response: {} }),
    });
    await expect(service.userinfo('Bearer token')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('hides network error details', async () => {
    fetchMock.mockRejectedValue(new Error('sensitive-provider-detail'));
    await expect(service.userinfo('Bearer token')).rejects.toThrow(
      BadGatewayException,
    );
  });
});
