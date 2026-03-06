import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:3000', 'https://my-lark.onrender.com'],
    credentials: true,
  });

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  app.setGlobalPrefix('api/v1', {
    exclude: ['/', '/docs', '/docs-json', '/favicon.ico', '/favicon.png'],
  });

  console.log('[Nest] Building Swagger documentation...');
  const config = new DocumentBuilder()
    .setTitle('MySlack API')
    .setDescription('MySlack API description')
    .setVersion('1.0')
    .addTag('MySlack')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  console.log('[Nest] Swagger documentation built successfully');
  const port = process.env.PORT ?? 8000;
  await app.listen(port, '0.0.0.0');

  console.log(`MySlack Server is running on: http://0.0.0.0:${port}`);
  console.log(`Swagger is running on: http://0.0.0.0:${port}/docs`);
}
bootstrap();
