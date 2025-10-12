import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';

// Swagger 문서를 저장하기 위한 WeakMap
const swaggerDocuments = new WeakMap<NestExpressApplication, any>();

/**
 * NestJS 애플리케이션 공통 설정을 담당하는 팩토리 함수
 * @param viewsDir views 디렉토리 경로 (환경에 따라 다를 수 있음)
 */
export async function createApp(viewsDir?: string) {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  // Handlebars 설정 (옵션)
  try {
    const viewPath = viewsDir || join(__dirname, '..', 'views');
    app.setBaseViewsDir(viewPath);
    app.setViewEngine('hbs');
  } catch (error) {
    console.warn('⚠️ Handlebars view engine not configured:', error.message);
  }

  // API 접두사 설정
  app.setGlobalPrefix('api', {
    exclude: ['/'], // 루트 경로는 prefix 제외 (Supabase 이메일 인증 콜백용)
  });

  // 전역 Validation Pipe 설정
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Swagger 정적 파일 리다이렉트 미들웨어 (Vercel 환경용)
  app.use('/api/docs/swagger-ui-bundle.js', (req, res) => {
    res.redirect(
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js',
    );
  });
  app.use('/api/docs/swagger-ui-standalone-preset.js', (req, res) => {
    res.redirect(
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js',
    );
  });
  app.use('/api/docs/swagger-ui-init.js', (req, res) => {
    // 빈 JavaScript를 반환하여 404 에러 방지
    res
      .type('application/javascript')
      .send('// Swagger UI initialized via CDN');
  });
  app.use('/api/docs/swagger-ui.css', (req, res) => {
    res.redirect(
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css',
    );
  });

  // Swagger 설정
  setupSwagger(app);

  return app;
}

/**
 * Swagger 문서 설정
 */
function setupSwagger(app: NestExpressApplication) {
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

  // Swagger UI 옵션 - CDN에서 정적 파일 로드 (Vercel serverless 환경 호환)
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'JLPT Vocabulary API',
    customCss: '.swagger-ui .topbar { display: none }',
    customCssUrl:
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css',
    customJs: [
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js',
      'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js',
    ],
    customfavIcon: 'https://nestjs.com/img/logo_text.svg',
  });

  // Swagger 문서를 WeakMap에 저장 (나중에 swagger.json 생성을 위해)
  swaggerDocuments.set(app, document);

  return document;
}

/**
 * 앱에서 Swagger 문서 가져오기
 */
export function getSwaggerDocument(app: NestExpressApplication) {
  return swaggerDocuments.get(app);
}
