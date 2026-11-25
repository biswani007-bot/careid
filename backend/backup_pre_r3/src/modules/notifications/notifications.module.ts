import { Module } from '@nestjs/common';
import { NotificationController } from './presentation/controllers/notification.controller';
import { NotificationTemplateController } from './presentation/controllers/notification-template.controller';
import { NotificationService } from './application/use-cases/notification.service';
import { NotificationRepository } from './infrastructure/database/notification.repository';
import { SmsGatewayService } from './infrastructure/sms-gateway.service';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [NotificationTemplateController, NotificationController],
  providers: [
    NotificationService,
    SmsGatewayService,
    {
      provide: 'INotificationRepository',
      useClass: NotificationRepository,
    },
  ],
  exports: [NotificationService, SmsGatewayService],
})
export class NotificationsModule {}
