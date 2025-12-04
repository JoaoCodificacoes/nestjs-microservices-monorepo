import { NestFactory } from '@nestjs/core';
import { AuthenticationModule } from './authentication.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AuthenticationModule,
    {
      transport: Transport.TCP,
      options: {
        host: '0.0.0.0',
        port: 3001,
      },
      bufferLogs: true,
    },
  );

  app.useLogger(app.get(Logger));

  await app.listen();

  const logger = app.get(Logger);
  logger.log('Authentication microservice started');
}

bootstrap();
