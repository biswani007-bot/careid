import { Module } from '@nestjs/common';
import { OCRController } from './presentation/controllers/ocr.controller';
import { OCRJobService } from './application/use-cases/ocr.service';
import { PrismaOcrRepository } from './infrastructure/database/ocr.repository';
import { OcrWorkerClient } from './infrastructure/clients/ocr-worker.client';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [OCRController],
  providers: [
    OCRJobService,
    OcrWorkerClient,
    {
      provide: 'IOcrRepository',
      useClass: PrismaOcrRepository,
    },
  ],
  exports: [OCRJobService, OcrWorkerClient],
})
export class OcrModule {}
