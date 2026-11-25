import { Module } from '@nestjs/common';
import { AiOcrController } from './presentation/controllers/ai-ocr.controller';
import { AiOcrService } from './application/use-cases/ai-ocr.service';
import { AiOcrRepository } from './infrastructure/database/ai-ocr.repository';
import { DatabaseModule } from '@database/database.module';
import { OcrModule } from '@modules/ocr/ocr.module';

@Module({
  imports: [DatabaseModule, OcrModule],
  controllers: [AiOcrController],
  providers: [
    AiOcrService,
    {
      provide: 'IAiOcrRepository',
      useClass: AiOcrRepository,
    },
  ],
  exports: [AiOcrService],
})
export class AiOcrModule {}
