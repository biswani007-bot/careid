import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { VisionController } from './vision.controller';
import { VisionService } from './vision.service';
import { VisionRepository } from './vision.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [VisionController],
  providers: [VisionService, VisionRepository],
  exports: [VisionService, VisionRepository],
})
export class VisionModule {}

