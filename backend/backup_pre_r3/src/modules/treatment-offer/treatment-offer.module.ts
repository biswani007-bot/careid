import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { SmsGatewayService } from '@modules/notifications/infrastructure/sms-gateway.service';
import { TreatmentOfferController } from './presentation/controllers/treatment-offer.controller';
import { DoctorTreatmentOfferController } from './presentation/controllers/doctor-treatment-offer.controller';
import { PatientTreatmentOfferController } from './presentation/controllers/patient-treatment-offer.controller';
import { TreatmentOfferService } from './application/use-cases/treatment-offer.service';
import { TreatmentOfferRepository } from './infrastructure/database/treatment-offer.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [
    TreatmentOfferController,
    DoctorTreatmentOfferController,
    PatientTreatmentOfferController,
  ],
  providers: [
    TreatmentOfferService,
    SmsGatewayService,
    {
      provide: 'ITreatmentOfferRepository',
      useClass: TreatmentOfferRepository,
    },
  ],
  exports: [TreatmentOfferService, 'ITreatmentOfferRepository'],
})
export class TreatmentOfferModule {}

