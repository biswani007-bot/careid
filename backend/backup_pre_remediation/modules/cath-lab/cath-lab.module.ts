import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { CathLabController } from './cath-lab.controller';
import { CathLabService } from './cath-lab.service';

@Module({
  imports: [DatabaseModule],
  controllers: [CathLabController],
  providers: [CathLabService],
  exports: [CathLabService],
})
export class CathLabModule {}

