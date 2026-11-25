import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { PrescriptionController } from './prescription.controller';
import { PrescriptionService } from './prescription.service';
import { PrescriptionRepository } from './prescription.repository';
import { DrugInteractionService } from './drug-interaction.service';

@Module({
  imports: [DatabaseModule],
  controllers: [PrescriptionController],
  providers: [
    PrescriptionService,
    PrescriptionRepository,
    DrugInteractionService,
  ],
  exports: [PrescriptionService, DrugInteractionService],
})
export class PrescriptionModule {}

