import { Module } from '@nestjs/common';
import { PetController } from './presentation/controllers/pet.controller';
import { DoctorPetController } from './presentation/controllers/doctor-pet.controller';
import { PetService } from './application/use-cases/pet.service';
import { PetRepository } from './infrastructure/database/pet.repository';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PetController, DoctorPetController],
  providers: [
    PetService,
    {
      provide: 'IPetRepository',
      useClass: PetRepository,
    },
  ],
  exports: [PetService, 'IPetRepository'],
})
export class PetModule {}

