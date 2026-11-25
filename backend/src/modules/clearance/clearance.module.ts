import { Module, forwardRef } from '@nestjs/common';
import { DatabaseModule } from '@database/database.module';
import { ClearanceService } from './clearance.service';
import { ClearanceController } from './clearance.controller';
import { SafetyHoldAdminController } from './safety-hold-admin.controller';
import { SafetyHoldAdminService } from './safety-hold-admin.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ClearanceController, SafetyHoldAdminController],
  providers: [ClearanceService, SafetyHoldAdminService],
  exports: [ClearanceService, SafetyHoldAdminService],
})
export class ClearanceModule {}
