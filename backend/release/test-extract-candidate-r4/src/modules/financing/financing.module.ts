import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { FinancingController } from './presentation/controllers/financing.controller';
import { FinancingService } from './application/use-cases/financing.service';
import { PrismaFinancingRepository } from './infrastructure/database/prisma-financing.repository';
import { FinancingCryptoService } from './infrastructure/security/financing-crypto.service';
import { TreatmentOfferModule } from '../treatment-offer/treatment-offer.module';

@Module({
  imports: [DatabaseModule, TreatmentOfferModule],
  controllers: [FinancingController],
  providers: [
    FinancingCryptoService,
    FinancingService,
    {
      provide: 'IFinancingRepository',
      useClass: PrismaFinancingRepository,
    },
  ],
  exports: [FinancingService, FinancingCryptoService, 'IFinancingRepository'],
})
export class FinancingModule {}

