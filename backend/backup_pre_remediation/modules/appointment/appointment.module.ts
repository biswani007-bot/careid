import { Module } from '@nestjs/common';
import { AppointmentController } from './presentation/controllers/appointment.controller';
import { AppointmentService } from './application/use-cases/appointment.service';
import { AppointmentRepository } from './infrastructure/database/appointment.repository';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AppointmentController],
  providers: [
    AppointmentService,
    AppointmentRepository,
    {
      provide: 'IAppointmentRepository',
      useClass: AppointmentRepository,
    },
  ],
  exports: [AppointmentService, 'IAppointmentRepository'],
})
export class AppointmentModule {}
