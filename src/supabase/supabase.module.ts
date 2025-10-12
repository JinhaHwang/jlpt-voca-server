import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_CLIENT } from './constants';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SUPABASE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const url = configService.get<string>('SUPABASE_URL');
        const serviceRoleSecret = configService.get<string>(
          'SUPABASE_SERVICE_ROLE_SECRET',
        );

        if (!url || !serviceRoleSecret) {
          throw new Error(
            'Missing Supabase configuration. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_SECRET.',
          );
        }

        return createClient(url, serviceRoleSecret, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });
      },
    },
    SupabaseService,
  ],
  exports: [SupabaseService],
})
export class SupabaseModule {}
