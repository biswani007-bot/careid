import { Module } from '@nestjs/common';
import { SupportController } from './presentation/controllers/support.controller';
import { SupportService } from './application/use-cases/support.service';
import { SupportRepository } from './infrastructure/database/support.repository';

@Module({
  controllers: [SupportController],
  providers: [
    SupportService,
    {
      provide: 'ISupportRepository',
      useClass: SupportRepository,
    },
  ],
  exports: [SupportService, 'ISupportRepository'],
})
export class SupportModule {}

