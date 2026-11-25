import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsInt,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { AppointmentStatus, AppointmentType } from '../../domain/entities/appointment.entity';
import { PaginationQueryDto } from '@common/dto/pagination.dto';

export class CreateAppointmentDto {
  @ApiPropertyOptional({ description: 'Target Patient Profile UUID (required for staff/doctor callers; optional for patient self-booking)' })
  @IsOptional()
  @IsUUID()
  patientProfileId?: string;

  @ApiProperty({ description: 'Target Doctor Profile UUID' })
  @IsNotEmpty()
  @IsUUID()
  doctorProfileId!: string;

  @ApiPropertyOptional({ description: 'Facility UUID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Schedule UUID' })
  @IsOptional()
  @IsUUID()
  scheduleId?: string;

  @ApiPropertyOptional({ description: 'Generated Slot UUID' })
  @IsOptional()
  @IsUUID()
  slotId?: string;

  @ApiProperty({ description: 'Appointment Date (YYYY-MM-DD or ISO 8601)', example: '2026-11-15' })
  @IsNotEmpty()
  @IsDateString()
  appointmentDate!: string;

  @ApiProperty({ description: 'Start Time (HH:mm in 24h format)', example: '09:30' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime!: string;

  @ApiPropertyOptional({ description: 'End Time (HH:mm in 24h format)', example: '09:45' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes', default: 15, minimum: 5, maximum: 120 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  durationMinutes?: number;

  @ApiPropertyOptional({ enum: AppointmentType, default: AppointmentType.IN_PERSON })
  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @ApiPropertyOptional({ description: 'Clinical reason or chief complaint for booking' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiPropertyOptional({ description: 'Additional appointment notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Associated ratified Treatment Offer UUID' })
  @IsOptional()
  @IsUUID()
  treatmentOfferId?: string;

  @ApiPropertyOptional({ description: 'Active procedure suite slot hold UUID to convert to booked appointment' })
  @IsOptional()
  @IsString()
  holdId?: string;
}

export class RescheduleAppointmentDto {
  @ApiProperty({ description: 'New Appointment Date (YYYY-MM-DD or ISO 8601)', example: '2026-11-20' })
  @IsNotEmpty()
  @IsDateString()
  appointmentDate!: string;

  @ApiProperty({ description: 'New Start Time (HH:mm)', example: '10:00' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be in HH:mm 24-hour format' })
  startTime!: string;

  @ApiPropertyOptional({ description: 'New End Time (HH:mm)', example: '10:15' })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be in HH:mm 24-hour format' })
  endTime?: string;

  @ApiPropertyOptional({ description: 'New Slot UUID' })
  @IsOptional()
  @IsUUID()
  slotId?: string;

  @ApiPropertyOptional({ description: 'Reason for rescheduling' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelAppointmentDto {
  @ApiProperty({ description: 'Reason for cancellation', example: 'Patient requested reschedule due to conflict' })
  @IsNotEmpty()
  @IsString()
  cancellationReason!: string;
}

export class UpdateAppointmentStatusDto {
  @ApiProperty({ enum: AppointmentStatus, description: 'New appointment status' })
  @IsNotEmpty()
  @IsEnum(AppointmentStatus)
  status!: AppointmentStatus;

  @ApiPropertyOptional({ description: 'Optional operational or clinical notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AppointmentQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by Patient Profile UUID' })
  @IsOptional()
  @IsUUID()
  patientProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by Doctor Profile UUID' })
  @IsOptional()
  @IsUUID()
  doctorProfileId?: string;

  @ApiPropertyOptional({ description: 'Filter by Facility UUID' })
  @IsOptional()
  @IsUUID()
  facilityId?: string;

  @ApiPropertyOptional({ enum: AppointmentStatus, description: 'Filter by Appointment Status' })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;

  @ApiPropertyOptional({ enum: AppointmentType, description: 'Filter by Consultation Type' })
  @IsOptional()
  @IsEnum(AppointmentType)
  type?: AppointmentType;

  @ApiPropertyOptional({ description: 'Filter from date (inclusive, YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional({ description: 'Filter to date (inclusive, YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class PatientSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional() mrn?: string;
  @ApiPropertyOptional() gender?: string;
  @ApiPropertyOptional() phone?: string;
}

export class DoctorSummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiPropertyOptional() specialization?: string;
  @ApiPropertyOptional() registrationNumber?: string;
  @ApiPropertyOptional() phone?: string;
}

export class FacilitySummaryDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiPropertyOptional() city?: string;
  @ApiPropertyOptional() phone?: string;
}

export class AppointmentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() appointmentNumber!: string;
  @ApiProperty() patientProfileId!: string;
  @ApiProperty() doctorProfileId!: string;
  @ApiPropertyOptional() facilityId?: string;
  @ApiPropertyOptional() scheduleId?: string;
  @ApiPropertyOptional() slotId?: string;
  @ApiProperty() appointmentDate!: string;
  @ApiProperty() startTime!: string;
  @ApiProperty() endTime!: string;
  @ApiProperty() durationMinutes!: number;
  @ApiProperty({ enum: AppointmentType }) type!: AppointmentType;
  @ApiProperty({ enum: AppointmentStatus }) status!: AppointmentStatus;
  @ApiPropertyOptional() reason?: string;
  @ApiPropertyOptional() notes?: string;
  @ApiPropertyOptional() bookedBy?: string;
  @ApiPropertyOptional() cancelledAt?: string;
  @ApiPropertyOptional() cancellationReason?: string;
  @ApiPropertyOptional() cancelledBy?: string;
  @ApiPropertyOptional() rescheduledFromId?: string;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;

  @ApiPropertyOptional({ type: PatientSummaryDto })
  patient?: PatientSummaryDto;

  @ApiPropertyOptional({ type: DoctorSummaryDto })
  doctor?: DoctorSummaryDto;

  @ApiPropertyOptional({ type: FacilitySummaryDto })
  facility?: FacilitySummaryDto;
}

export class CreateSlotHoldDto {
  @ApiProperty({ description: 'Facility UUID' })
  @IsNotEmpty()
  @IsString()
  facilityId!: string;

  @ApiProperty({ description: 'Generated Slot UUID' })
  @IsNotEmpty()
  @IsString()
  slotId!: string;

  @ApiPropertyOptional({ description: 'Procedure Suite Category', example: 'CATH_LAB' })
  @IsOptional()
  @IsString()
  procedureCategory?: string;

  @ApiPropertyOptional({ description: 'Hold duration in minutes', default: 45, minimum: 5, maximum: 180 })
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  holdDurationMinutes?: number;
}

export class SlotHoldResponseDto {
  @ApiProperty() holdId!: string;
  @ApiProperty() slotId!: string;
  @ApiProperty() facilityId!: string;
  @ApiPropertyOptional() procedureCategory?: string;
  @ApiProperty() status!: string;
  @ApiProperty() heldAt!: string;
  @ApiProperty() expiresAt!: string;
  @ApiPropertyOptional() remainingSeconds?: number;
  @ApiPropertyOptional() isExpired?: boolean;
}

export class UpdateReadinessDto {
  @ApiPropertyOptional({ description: 'Fasting status confirmed' })
  @IsOptional()
  fastingConfirmed?: boolean;

  @ApiPropertyOptional({ description: 'Medication hold confirmed' })
  @IsOptional()
  medicationHoldConfirmed?: boolean;

  @ApiPropertyOptional({ description: 'Transportation arranged' })
  @IsOptional()
  transportationArranged?: boolean;

  @ApiPropertyOptional({ description: 'Surgical/Procedural consent verified' })
  @IsOptional()
  consentVerified?: boolean;

  @ApiPropertyOptional({ description: 'Vitals within clinical protocol threshold' })
  @IsOptional()
  vitalsWithinThreshold?: boolean;

  @ApiPropertyOptional({ enum: ['GO', 'NO_GO', 'CONDITIONAL_GO', 'PENDING'], default: 'PENDING' })
  @IsOptional()
  @IsString()
  decision?: string;

  @ApiPropertyOptional({ description: 'Clinical readiness notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class AppointmentCheckInDto {
  @ApiPropertyOptional({ description: 'ISO timestamp of check-in' })
  @IsOptional()
  @IsString()
  checkInTime?: string;

  @ApiPropertyOptional({ description: 'Facility UUID' })
  @IsOptional()
  @IsString()
  facilityId?: string;

  @ApiPropertyOptional({ description: 'Assigned Pre-Op Bay or Bed Number', example: 'BAY-04' })
  @IsOptional()
  @IsString()
  bedOrBayNumber?: string;

  @ApiPropertyOptional({ description: 'Check-in vitals object' })
  @IsOptional()
  vitals?: {
    bloodPressure?: string;
    heartRate?: number;
    oxygenSaturation?: number;
    temperature?: number;
  };

  @ApiPropertyOptional({ description: 'Check-in intake notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateCathLabChecklistDto {
  @ApiPropertyOptional({ description: 'WHO Sign In stage items' })
  @IsOptional()
  signIn?: {
    patientIdentityConfirmed?: boolean;
    siteMarked?: boolean;
    anesthesiaSafetyCheckCompleted?: boolean;
    pulseOximeterOn?: boolean;
    allergiesChecked?: boolean;
    completedBy?: string;
    completedAt?: string;
  };

  @ApiPropertyOptional({ description: 'WHO Time Out stage items' })
  @IsOptional()
  timeOut?: {
    allTeamMembersIntroduced?: boolean;
    patientNameProcedureSiteConfirmed?: boolean;
    anticipatedCriticalEventsReviewed?: boolean;
    antibioticProphylaxisAdministered?: boolean;
    imagingDisplayed?: boolean;
    completedBy?: string;
    completedAt?: string;
  };

  @ApiPropertyOptional({ description: 'WHO Sign Out stage items' })
  @IsOptional()
  signOut?: {
    procedureNameRecorded?: boolean;
    instrumentSpongeNeedleCountsCorrect?: boolean;
    specimenLabeled?: boolean;
    equipmentProblemsAddressed?: boolean;
    keyPostOpConcernsReviewed?: boolean;
    completedBy?: string;
    completedAt?: string;
  };

  @ApiPropertyOptional({ enum: ['INCOMPLETE', 'COMPLETED'] })
  @IsOptional()
  @IsString()
  overallStatus?: string;

  @ApiPropertyOptional({ description: 'Clinical checklist notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
