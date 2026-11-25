import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CptController } from './cpt.controller';
import { CptService } from './cpt.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CptController],
  providers: [CptService],
  exports: [CptService],
})
export class CptModule {}

