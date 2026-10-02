import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

const authorizeSchema = z.object({
  client_id: z.string(),
  redirect_uri: z.string().url(),
  response_type: z.literal('code'),
  state: z.string().min(1).max(4096),
});
const callbackSchema = z.object({
  state: z.string().min(1).max(8192),
  code: z.string().min(1).max(4096).optional(),
  error: z.string().optional(),
});
const tokenSchema = z.object({
  grant_type: z.literal('authorization_code'),
  code: z.string().min(1).max(16384),
  redirect_uri: z.string().url(),
  client_id: z.string().optional(),
  client_secret: z.string().optional(),
});
const envelopeSchema = z.object({
  kind: z.enum(['state', 'code']),
  state: z.string(),
  code: z.string().optional(),
  expiresAt: z.number(),
});
type Envelope = z.infer<typeof envelopeSchema>;

/** Adapts Naver's token state requirement and nested profile to Supabase OAuth2. */
@Injectable()
export class NaverOAuthService {
  private config() {
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;
    const signingSecret = process.env.NAVER_OAUTH_STATE_SECRET;
    const callbackUrl = process.env.NAVER_OAUTH_CALLBACK_URL;
    const supabaseUrl = process.env.SUPABASE_URL;
    if (
      !clientId ||
      !clientSecret ||
      !signingSecret ||
      signingSecret.length < 32 ||
      !callbackUrl ||
      !supabaseUrl
    ) {
      throw new ServiceUnavailableException('Naver login is not configured.');
    }
    return {
      clientId,
      clientSecret,
      signingSecret,
      callbackUrl,
      supabaseCallback: `${supabaseUrl.replace(/\/$/, '')}/auth/v1/callback`,
    };
  }

  authorize(input: unknown): string {
    const query = authorizeSchema.safeParse(input);
    if (!query.success) throw new BadRequestException('Invalid OAuth request.');
    const config = this.config();
    if (
      query.data.client_id !== config.clientId ||
      query.data.redirect_uri !== config.supabaseCallback
    ) {
      throw new BadRequestException('Invalid OAuth client or redirect URI.');
    }
    const url = new URL('https://nid.naver.com/oauth2.0/authorize');
    url.search = new URLSearchParams({
      response_type: 'code',
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      state: this.sign({
        kind: 'state',
        state: query.data.state,
        expiresAt: Date.now() + 600_000,
      }),
    }).toString();
    return url.toString();
  }

  callback(input: unknown): string {
    const query = callbackSchema.safeParse(input);
    if (!query.success)
      throw new BadRequestException('Invalid OAuth callback.');
    const state = this.verify(query.data.state, 'state');
    const url = new URL(this.config().supabaseCallback);
    url.searchParams.set('state', state.state);
    if (query.data.error || !query.data.code) {
      url.searchParams.set('error', 'access_denied');
    } else {
      url.searchParams.set(
        'code',
        this.sign({
          kind: 'code',
          code: query.data.code,
          state: query.data.state,
          expiresAt: Math.min(state.expiresAt, Date.now() + 60_000),
        }),
      );
    }
    return url.toString();
  }

  async token(
    input: unknown,
    authorization?: string,
  ): Promise<{
    access_token: string;
    token_type: 'Bearer';
    expires_in: number;
  }> {
    const parsed = tokenSchema.safeParse(input);
    if (!parsed.success)
      throw new BadRequestException('Invalid token request.');
    const body = parsed.data;
    const config = this.config();
    let clientId = body.client_id;
    let clientSecret = body.client_secret;
    if (authorization?.startsWith('Basic ')) {
      try {
        const credentials = Buffer.from(
          authorization.slice(6),
          'base64',
        ).toString('utf8');
        const separator = credentials.indexOf(':');
        if (separator < 0) throw new Error('Invalid credentials');
        clientId = decodeURIComponent(credentials.slice(0, separator));
        clientSecret = decodeURIComponent(credentials.slice(separator + 1));
      } catch {
        throw new UnauthorizedException('Invalid OAuth client.');
      }
    }
    if (
      clientId !== config.clientId ||
      !clientSecret ||
      !this.equal(clientSecret, config.clientSecret)
    ) {
      throw new UnauthorizedException('Invalid OAuth client.');
    }
    if (body.redirect_uri !== config.supabaseCallback)
      throw new BadRequestException('Invalid redirect URI.');
    const envelope = this.verify(body.code, 'code');
    if (!envelope.code)
      throw new BadRequestException('Invalid authorization code.');
    this.verify(envelope.state, 'state');
    const response = await this.request(
      'https://nid.naver.com/oauth2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code: envelope.code,
          state: envelope.state,
          redirect_uri: config.callbackUrl,
        }).toString(),
      },
    );
    const token = z
      .object({
        access_token: z.string().min(1),
        token_type: z
          .string()
          .refine((value) => value.toLowerCase() === 'bearer'),
        expires_in: z.coerce.number().positive(),
      })
      .safeParse(response);
    if (!token.success)
      throw new BadRequestException('Naver authorization failed.');
    // Naver enforces one-use codes. Supabase manages its own refresh tokens.
    return {
      access_token: token.data.access_token,
      token_type: 'Bearer',
      expires_in: token.data.expires_in,
    };
  }

  async userinfo(
    authorization?: string,
  ): Promise<{ sub: string; name?: string }> {
    if (!authorization || !/^Bearer [^\s]+$/i.test(authorization)) {
      throw new UnauthorizedException('Missing provider access token.');
    }
    const response = await this.request('https://openapi.naver.com/v1/nid/me', {
      headers: { Authorization: authorization },
    });
    const profile = z
      .object({
        resultcode: z.literal('00'),
        response: z.object({
          id: z.string().min(1),
          nickname: z.string().optional(),
        }),
      })
      .safeParse(response);
    if (!profile.success)
      throw new UnauthorizedException('Invalid Naver profile.');
    // The stable provider ID is the identity. Do not auto-link via an unverified email.
    return {
      sub: profile.data.response.id,
      name: profile.data.response.nickname,
    };
  }

  private async request(url: string, init: RequestInit): Promise<unknown> {
    try {
      const response = await fetch(url, {
        ...init,
        redirect: 'error',
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error('Provider error');
      return await response.json();
    } catch {
      throw new BadGatewayException('Naver request failed.');
    }
  }

  private sign(value: Envelope): string {
    const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
    const signature = createHmac('sha256', this.config().signingSecret)
      .update(payload)
      .digest('base64url');
    return `${payload}.${signature}`;
  }

  private verify(value: string, kind: Envelope['kind']): Envelope {
    const [payload, signature, extra] = value.split('.');
    const expected = createHmac('sha256', this.config().signingSecret)
      .update(payload ?? '')
      .digest('base64url');
    if (extra !== undefined || !signature || !this.equal(signature, expected)) {
      throw new BadRequestException('Invalid OAuth state.');
    }
    try {
      const envelope = envelopeSchema.parse(
        JSON.parse(Buffer.from(payload, 'base64url').toString()),
      );
      if (envelope.kind !== kind || envelope.expiresAt <= Date.now())
        throw new Error('Expired');
      return envelope;
    } catch {
      throw new BadRequestException('Invalid or expired OAuth state.');
    }
  }

  private equal(left: string, right: string): boolean {
    const a = Buffer.from(left);
    const b = Buffer.from(right);
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
