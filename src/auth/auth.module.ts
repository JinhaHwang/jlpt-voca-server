import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { NaverOAuthController } from './naver-oauth.controller';
import { NaverOAuthService } from './naver-oauth.service';

@Module({
  controllers: [AuthController, NaverOAuthController],
  providers: [AuthService, NaverOAuthService],
})
export class AuthModule {}
