import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { writeFileSync } from 'fs';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Handlebars 설정
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('hbs');

  app.setGlobalPrefix('api', {
    exclude: ['/'], // 루트 경로는 prefix 제외 (Supabase 이메일 인증 콜백용)
  });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger 설정
  const config = new DocumentBuilder()
    .setTitle('JLPT Vocabulary API')
    .setDescription('JLPT 단어 학습을 위한 API 문서')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('https://jlpt-voca-server.vercel.app', 'Production')
    .addServer('http://localhost:3000', 'Local')
    .addTag('Auth', '인증 관련 API (회원가입, 로그인, 로그아웃)')
    .addTag('Profiles', '사용자 프로필 관리 API')
    .addTag('JLPT Vocabulary', 'JLPT 단어 조회 및 검색 API')
    .addTag('Health', '서버 상태 확인 API')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // 프로덕션 빌드 시 swagger.json 파일 생성
  if (process.env.NODE_ENV === 'production' || process.env.GENERATE_SWAGGER) {
    writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
    console.log('✅ Swagger JSON file generated at ./swagger.json');

    // Swagger 생성 후 종료
    if (process.env.GENERATE_SWAGGER) {
      console.log('✅ Swagger generation complete. Exiting...');
      process.exit(0);
    }
  }

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
