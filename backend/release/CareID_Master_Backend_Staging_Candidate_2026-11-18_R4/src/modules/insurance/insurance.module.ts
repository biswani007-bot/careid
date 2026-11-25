import { Module } from '@nestjs/common';
import { InsuranceController } from './presentation/controllers/insurance.controller';
import { InsuranceCardController } from './presentation/controllers/insurance-card.controller';
import { InsuranceService } from './application/use-cases/insurance.service';
import { InsuranceRepository } from './infrastructure/database/insurance.repository';
import { DatabaseModule } from '@database/database.module';
import { QrModule } from '@modules/qr/qr.module';
import { OcrModule } from '@modules/ocr/ocr.module';

@Module({
  imports: [DatabaseModule, QrModule, OcrModule],
  controllers: [InsuranceController, InsuranceCardController],
  providers: [
    InsuranceService,
    {
      provide: 'IInsuranceRepository',
      useClass: InsuranceRepository,
    },
  ],
  exports: [InsuranceService],
})
export class InsuranceModule {}
