import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Query,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { NaverOAuthService } from './naver-oauth.service';

// Provider protocol endpoints, consumed by Supabase rather than the app API client.
@ApiExcludeController()
@Controller('auth/naver')
export class NaverOAuthController {
  constructor(private readonly naver: NaverOAuthService) {}

  @Get('authorize')
  authorize(@Query() query: unknown, @Res() response: Response): void {
    response.set({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    response.redirect(this.naver.authorize(query));
  }

  @Get('callback')
  callback(@Query() query: unknown, @Res() response: Response): void {
    response.set({
      'Cache-Control': 'no-store',
      'Referrer-Policy': 'no-referrer',
    });
    response.redirect(this.naver.callback(query));
  }

  @Post('token')
  async token(
    @Body() body: unknown,
    @Headers('authorization') authorization: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    response.set('Cache-Control', 'no-store');
    try {
      response.status(200).json(await this.naver.token(body, authorization));
    } catch (error) {
      const invalidClient = error instanceof UnauthorizedException;
      response
        .status(invalidClient ? 401 : 400)
        .json({ error: invalidClient ? 'invalid_client' : 'invalid_grant' });
    }
  }

  @Get('userinfo')
  async userinfo(
    @Headers('authorization') authorization: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    response.set('Cache-Control', 'no-store');
    response.json(await this.naver.userinfo(authorization));
  }
}
