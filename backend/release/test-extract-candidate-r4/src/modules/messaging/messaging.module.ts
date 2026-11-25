import { Module } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { MessagingRepository } from './messaging.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [MessagingController],
  providers: [MessagingService, MessagingRepository],
  exports: [MessagingService, MessagingRepository],
})
export class MessagingModule {}

