import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { createApp } from '../dist/app.factory';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let cachedApp: NestExpressApplication | null = null;

/**
 * Serverless 환경을 위한 앱 초기화
 * 콜드 스타트 최적화를 위해 앱 인스턴스를 캐싱합니다.
 */
async function bootstrap() {
  if (cachedApp) {
    return cachedApp;
  }

  // views 디렉토리 경로는 빌드된 파일 기준으로 설정
  const app = await createApp(join(__dirname, '..', 'views'));

  // Serverless 환경에서는 listen 대신 init 사용
  await app.init();

  cachedApp = app;
  return app;
}

// Serverless 함수 핸들러
export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const app = await bootstrap();
    const expressApp = app.getHttpAdapter().getInstance();

    // Express 앱을 serverless 함수 핸들러로 변환
    // VercelRequest/Response를 Express와 호환되게 처리
    await new Promise<void>((resolve, reject) => {
      expressApp(req as any, res as any, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  } catch (error) {
    console.error('Function invocation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
