import { Module } from '@nestjs/common';
import { ReportController } from './presentation/controllers/report.controller';
import { ReportService } from './application/use-cases/report.service';
import { ReportRepository } from './infrastructure/database/report.repository';
import { DatabaseModule } from '@database/database.module';
import { QrModule } from '@modules/qr/qr.module';

import { ReportAuthGuard } from './infrastructure/guards/report-auth.guard';
import { StorageModule } from '@modules/storage/storage.module';

@Module({
  imports: [DatabaseModule, QrModule, StorageModule],

  controllers: [ReportController],
  providers: [
    ReportService,
    ReportAuthGuard,
    {
      provide: 'IReportRepository',
      useClass: ReportRepository,
    },
  ],
  exports: [ReportService],
})
export class ReportModule {}
