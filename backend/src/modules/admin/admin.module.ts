import { Module } from '@nestjs/common';
import { AdminController } from './presentation/controllers/admin.controller';
import { ClinicalPracticeTypesController } from './presentation/controllers/clinical-practice-type.controller';
import { AdminService } from './application/use-cases/admin.service';
import { AdminRepository } from './infrastructure/database/admin.repository';
import { DatabaseModule } from '@database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AdminController, ClinicalPracticeTypesController],
  providers: [
    AdminService,
    {
      provide: 'IAdminRepository',
      useClass: AdminRepository,
    },
  ],
  exports: [AdminService],
})
export class AdminModule {}
