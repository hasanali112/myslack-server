import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WsAdapter } from '@nestjs/platform-ws';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }));

  console.log('[Nest] Building Swagger documentation...');
  const config = new DocumentBuilder()
    .setTitle('Slack API')
    .setDescription('Slack API description')
    .setVersion('1.0')
    .addTag('slack')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);
  console.log('[Nest] Swagger documentation built successfully');
  app.useWebSocketAdapter(new WsAdapter(app));
  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Slack Server is running on: http://localhost:${port}`);
  console.log(`Swagger is running on: http://localhost:${port}/docs`);
}
bootstrap();
