import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { HealthModule } from './health/health.module';
import { JlptVocaModule } from './jlpt-voca/jlpt-voca.module';
import { ProfilesModule } from './profiles/profiles.module';
import { AuthModule } from './auth/auth.module';
import { AppController } from './app.controller';
import { AiController } from './ai/ai.controller';
import { GeoModule } from './geo/geo.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
    }),
    SupabaseModule,
    AuthModule,
    ProfilesModule,
    HealthModule,
    JlptVocaModule,
    GeoModule,
  ],
  controllers: [AppController, AiController],
})
export class AppModule {}
