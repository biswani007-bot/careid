import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { configuration } from '@config/env.config';
import { validateEnvironment } from '@config/env.validation';
import { DatabaseModule } from '@database/database.module';
import { HealthModule } from '@core/health/health.module';

import { AuthModule } from '@modules/auth/auth.module';
import { PatientModule } from '@modules/patient/patient.module';
import { DoctorModule } from '@modules/doctor/doctor.module';
import { FacilityModule } from '@modules/facility/facility.module';
import { HealthCardModule } from '@modules/health-card/health-card.module';
import { AppointmentModule } from '@modules/appointment/appointment.module';
import { ReportModule } from '@modules/report/report.module';
import { InsuranceModule } from '@modules/insurance/insurance.module';
import { CmsModule } from '@modules/cms/cms.module';
import { AdminModule } from '@modules/admin/admin.module';
import { FamilyModule } from '@modules/family/family.module';
import { MedicalRecordModule } from '@modules/medical-record/medical-record.module';
import { QrModule } from '@modules/qr/qr.module';
import { ImmunisationModule } from '@modules/immunisation/immunisation.module';
import { StaffModule } from '@modules/staff/staff.module';
import { ScheduleModule } from '@modules/schedule/schedule.module';
import { ReportsModule } from '@modules/reports/reports.module';
import { GovernanceModule } from '@modules/governance/governance.module';
import { NotificationsModule } from '@modules/notifications/notifications.module';
import { OcrModule } from '@modules/ocr/ocr.module';
import { SecurityModule } from '@modules/security/security.module';
import { ObservabilityModule } from '@modules/observability/observability.module';
import { ReferralModule } from '@modules/referral/referral.module';
import { AiOcrModule } from '@modules/ai-ocr/ai-ocr.module';
import { StorageModule } from '@modules/storage/storage.module';
import { SupportModule } from '@modules/support/support.module';
import { PetModule } from '@modules/pet/pet.module';
import { FinancingModule } from '@modules/financing/financing.module';
import { TreatmentOfferModule } from '@modules/treatment-offer/treatment-offer.module';
import { ClearanceModule } from '@modules/clearance/clearance.module';
import { CptModule } from '@modules/cpt/cpt.module';
import { CathLabModule } from '@modules/cath-lab/cath-lab.module';
import { DentalModule } from '@modules/dental/dental.module';
import { VisionModule } from '@modules/vision/vision.module';
import { LaboratoryModule } from '@modules/laboratory/laboratory.module';
import { PrescriptionModule } from '@modules/prescription/prescription.module';
import { MessagingModule } from '@modules/messaging/messaging.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    PinoLoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
        level: process.env.LOG_LEVEL || 'info',
        redact: {
          paths: [
            'req.headers.authorization',
            'req.headers.cookie',
            'req.headers["x-api-key"]',
            'req.headers["set-cookie"]',
          ],
          censor: '[REDACTED]',
        },
      },
    }),
    DatabaseModule,
    HealthModule,

    // Enterprise Domain Modules
    AuthModule,
    PatientModule,
    ClearanceModule,
    TreatmentOfferModule, // Placed before DoctorModule so specific /doctors/treatment-offers precedes wildcard /doctors/:id
    CptModule,
    CathLabModule,
    DentalModule, // Placed before DoctorModule so specific /doctors/patients/:patientProfileId/dental-records precedes wildcard
    VisionModule, // Placed before DoctorModule so specific /doctors/patients/:patientProfileId/vision-records precedes wildcard
    LaboratoryModule, // Placed before DoctorModule so specific /doctors/patients/:patientProfileId/lab-results precedes wildcard
    PrescriptionModule, // Placed before DoctorModule so specific /doctors/patients/:patientProfileId/prescriptions precedes wildcard
    PetModule, // Placed before DoctorModule so specific /doctors/pets precedes wildcard /doctors/:id
    DoctorModule,
    FacilityModule,
    HealthCardModule,
    AppointmentModule,
    ReportsModule, // Placed before ReportModule so specific routes (/reports/definitions, /reports/generated) precede wildcard /reports/:id
    ReportModule,
    InsuranceModule,
    CmsModule,
    AdminModule,
    FamilyModule,
    MedicalRecordModule,
    QrModule,
    ImmunisationModule,
    StaffModule,
    ScheduleModule,
    GovernanceModule,
    NotificationsModule,
    OcrModule,
    SecurityModule,
    ObservabilityModule,
    ReferralModule,
    AiOcrModule,
    StorageModule,
    SupportModule,
    MessagingModule,
    FinancingModule,
  ],
})
export class AppModule {}
