import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { DentalController } from './dental.controller';
import { DentalService } from './dental.service';
import { DentalRepository } from './dental.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [DentalController],
  providers: [DentalService, DentalRepository],
  exports: [DentalService, DentalRepository],
})
export class DentalModule {}

