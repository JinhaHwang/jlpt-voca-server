import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  Res,
  Req,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { SupabaseAuthGuard } from './supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { User } from '@supabase/supabase-js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('sign-up')
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('sign-in')
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  getMe(@CurrentUser() user: User) {
    return {
      user,
      message: '현재 사용자 정보를 조회했습니다.',
    };
  }

  @Post('logout')
  @UseGuards(SupabaseAuthGuard)
  async logout(@Req() req: Request, @Res() res: Response) {
    const accessToken = req.accessToken;

    if (!accessToken) {
      return res.status(401).json({ message: '인증 토큰이 없습니다.' });
    }

    const { error } = await this.authService.signOut(accessToken);

    if (error) {
      const errorMessage = error.message;
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>로그아웃 오류</title>
          </head>
          <body>
            <h1>로그아웃 오류</h1>
            <p>${errorMessage}</p>
          </body>
        </html>
      `);
    }

    return res.json({ message: '로그아웃이 완료되었습니다.' });
  }
}
