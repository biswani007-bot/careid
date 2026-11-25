import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { PrescriptionController } from './prescription.controller';
import { PrescriptionService } from './prescription.service';
import { PrescriptionRepository } from './prescription.repository';
import { DrugInteractionService } from './drug-interaction.service';
import { PrescriptionReminderService } from './prescription-reminder.service';
import { PrescriptionReminderScheduler } from './prescription-reminder.scheduler';
import { InternalOnlyDeliveryAdapter } from './adapters/notification-delivery.adapter';

@Module({
  imports: [DatabaseModule],
  controllers: [PrescriptionController],
  providers: [
    PrescriptionService,
    PrescriptionRepository,
    DrugInteractionService,
    PrescriptionReminderService,
    PrescriptionReminderScheduler,
    {
      provide: 'INotificationDeliveryAdapter',
      useClass: InternalOnlyDeliveryAdapter,
    },
  ],
  exports: [
    PrescriptionService,
    DrugInteractionService,
    PrescriptionReminderService,
    PrescriptionReminderScheduler,
  ],
})
export class PrescriptionModule {}

