import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthUserResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '7a5a3df3-b70a-47fb-9672-3eb1cc6a92db',
  })
  id: string;

  @ApiPropertyOptional({ example: 'learner@example.com', format: 'email' })
  email?: string;

  @ApiProperty({ example: 'authenticated' })
  role: string;

  @ApiProperty({ example: 'authenticated' })
  aud: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {},
  })
  app_metadata: Record<string, unknown>;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: {},
  })
  user_metadata: Record<string, unknown>;

  @ApiProperty({
    example: '2026-09-03T12:00:00.000Z',
    format: 'date-time',
  })
  created_at: string;
}

export class AuthSessionResponseDto {
  @ApiProperty({ description: 'Supabase access token' })
  access_token: string;

  @ApiProperty({ description: 'Supabase refresh token' })
  refresh_token: string;

  @ApiProperty({ example: 'bearer' })
  token_type: string;

  @ApiProperty({ example: 3600 })
  expires_in: number;

  @ApiPropertyOptional({ example: 1788436800 })
  expires_at?: number;

  @ApiProperty({ type: () => AuthUserResponseDto })
  user: AuthUserResponseDto;
}

export class SignUpResponseDto {
  @ApiProperty({ type: () => AuthUserResponseDto, nullable: true })
  user: AuthUserResponseDto | null;

  @ApiProperty({ type: () => AuthSessionResponseDto, nullable: true })
  session: AuthSessionResponseDto | null;

  @ApiProperty({ example: '회원가입이 완료되었습니다.' })
  message: string;
}

export class SignInResponseDto {
  @ApiProperty({ type: () => AuthUserResponseDto })
  user: AuthUserResponseDto;

  @ApiProperty({ type: () => AuthSessionResponseDto, nullable: true })
  session: AuthSessionResponseDto | null;

  @ApiProperty({ nullable: true, type: String })
  access_token: string | null;

  @ApiProperty({ nullable: true, type: String })
  refresh_token: string | null;

  @ApiProperty({ example: '로그인이 완료되었습니다.' })
  message: string;
}

export class CurrentUserResponseDto {
  @ApiProperty({ type: () => AuthUserResponseDto })
  user: AuthUserResponseDto;

  @ApiProperty({ example: '현재 사용자 정보를 조회했습니다.' })
  message: string;
}

export class LogoutResponseDto {
  @ApiProperty({ example: '로그아웃이 완료되었습니다.' })
  message: string;
}
