import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: unknown }>();
    const accessToken = this.extractAccessToken(request);

    const supabaseClient = this.supabaseService.getClient();
    const { data, error } = await supabaseClient.auth.getUser(accessToken);

    if (error || !data?.user) {
      throw new UnauthorizedException('Invalid or expired Supabase token.');
    }

    request.user = data.user;
    return true;
  }

  private extractAccessToken(request: Request): string {
    const header = request.headers.authorization;

    if (!header) {
      throw new UnauthorizedException('Authorization header missing.');
    }

    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Authorization header is malformed.');
    }

    return token;
  }
}
