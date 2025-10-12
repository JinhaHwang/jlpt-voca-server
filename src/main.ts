import { NestFactory } from '@nestjs/core';
import { writeFileSync } from 'fs';
import { createApp, getSwaggerDocument } from './app.factory';

async function bootstrap() {
  const app = await createApp();

  // Swagger 생성 모드 (로컬 개발용)
  if (process.env.GENERATE_SWAGGER) {
    const document = getSwaggerDocument(app);
    if (document) {
      try {
        writeFileSync('./swagger.json', JSON.stringify(document, null, 2));
        console.log('✅ Swagger JSON file generated at ./swagger.json');
      } catch (error) {
        console.warn('⚠️ Could not write swagger.json (read-only filesystem)');
      }
    }
    console.log('✅ Swagger generation complete. Exiting...');
    process.exit(0);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Application is running on: http://localhost:${port}`);
}

bootstrap();
