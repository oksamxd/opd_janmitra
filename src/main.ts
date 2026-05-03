import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: '*',
  });

  app.setGlobalPrefix('api');

  app.useStaticAssets(join(process.cwd(), 'frontend'), {
    prefix: '/frontend/',
  });

  await app.listen(3005, '0.0.0.0');
}

bootstrap();
