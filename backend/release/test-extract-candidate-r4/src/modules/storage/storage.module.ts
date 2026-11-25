import { Module, Global } from '@nestjs/common';
import { B2StorageService } from './infrastructure/b2-storage.service';
import { AntivirusScannerService } from './infrastructure/antivirus-scanner.service';
import { DatabaseModule } from '@database/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [B2StorageService, AntivirusScannerService],
  exports: [B2StorageService, AntivirusScannerService],
})
export class StorageModule {}
