import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async signUp(signUpDto: SignUpDto) {
    const supabaseClient = this.supabaseService.getClient();
    const deployHost = this.configService.get<string>('DEPLOY_HOST');

    const { data, error } = await supabaseClient.auth.signUp({
      email: signUpDto.email,
      password: signUpDto.password,
      options: {
        emailRedirectTo: deployHost,
      },
    });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      user: data.user,
      session: data.session,
      message: '회원가입이 완료되었습니다.',
    };
  }

  async signIn(signInDto: SignInDto) {
    const supabaseClient = this.supabaseService.getClient();

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email: signInDto.email,
      password: signInDto.password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      user: data.user,
      session: data.session,
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      message: '로그인이 완료되었습니다.',
    };
  }

  async signOut(accessToken: string) {
    const supabaseClient = this.supabaseService.getClient();

    // 사용자의 액세스 토큰으로 세션 설정
    await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: '', // refresh token은 필요 없음
    });

    // 해당 세션 로그아웃
    const { error } = await supabaseClient.auth.signOut();
    return { error };
  }
}
