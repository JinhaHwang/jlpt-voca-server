import { writeFileSync } from 'fs';
import { createApp, getSwaggerDocument } from './app.factory';

async function bootstrap() {
  const app = await createApp();

  // 프로덕션 빌드 시 swagger.json 파일 생성
  if (process.env.NODE_ENV === 'production' || process.env.GENERATE_SWAGGER) {
    const document = getSwaggerDocument(app);
    if (document) {
      writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
      console.log('✅ Swagger JSON file generated at ./swagger.json');
    }

    // Swagger 생성 후 종료
    if (process.env.GENERATE_SWAGGER) {
      console.log('✅ Swagger generation complete. Exiting...');
      process.exit(0);
    }
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
