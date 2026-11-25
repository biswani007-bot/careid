import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { LaboratoryController } from './laboratory.controller';
import { LaboratoryService } from './laboratory.service';
import { LaboratoryRepository } from './laboratory.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [LaboratoryController],
  providers: [LaboratoryService, LaboratoryRepository],
  exports: [LaboratoryService, LaboratoryRepository],
})
export class LaboratoryModule {}

