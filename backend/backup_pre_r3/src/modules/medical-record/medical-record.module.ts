import { Module } from '@nestjs/common';
import { MedicalRecordController, AttachmentController, ShareController } from './presentation/controllers/medical-record.controller';
import { EncounterController } from './presentation/controllers/encounter.controller';
import { MedicalRecordService } from './application/use-cases/medical-record.service';
import { MedicalRecordRepository } from './infrastructure/database/medical-record.repository';
import { DatabaseModule } from '@database/database.module';
import { QrModule } from '@modules/qr/qr.module';

@Module({
  imports: [DatabaseModule, QrModule],

  controllers: [MedicalRecordController, AttachmentController, EncounterController, ShareController],
  providers: [
    MedicalRecordService,
    {
      provide: 'IMedicalRecordRepository',
      useClass: MedicalRecordRepository,
    },
  ],
  exports: [MedicalRecordService],
})
export class MedicalRecordModule {}
