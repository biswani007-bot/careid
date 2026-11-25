import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
  Min,
  Max,
  IsNotEmpty,
  IsBoolean,
  IsInt,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '@common/dto/pagination.dto';

// ─── Patient Listing & Query DTOs ──────────────────────────────────────────

export class DoctorPatientsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search by patient name, MRN, phone, or email' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Search alias for search query parameter' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ description: 'Filter by patient gender (MALE, FEMALE, OTHER)' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ description: 'Filter by blood group (e.g. A+, O-, B+)' })
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional({ description: 'Filter by profile status (e.g. ACTIVE, COMPLETED, DRAFT)' })
  @IsOptional()
  @IsString()
  status?: string;
}

export class DoctorPatientSummaryDto {
  @ApiProperty({ example: 'patient-profile-uuid' })
  id!: string;

  @ApiProperty({ example: 'user-uuid' })
  userId!: string;

  @ApiProperty({ example: 'PT-360-12345', nullable: true })
  patientNumber!: string | null;

  @ApiProperty({ example: 'John', nullable: true })
  firstName!: string | null;

  @ApiProperty({ example: 'Doe', nullable: true })
  lastName!: string | null;

  @ApiProperty({ example: '1985-06-15', nullable: true })
  dateOfBirth!: string | null;

  @ApiProperty({ example: 'MALE', nullable: true })
  gender!: string | null;

  @ApiProperty({ example: 'O+', nullable: true })
  bloodGroup!: string | null;

  @ApiProperty({ example: '+1234567890', nullable: true })
  phone!: string | null;

  @ApiProperty({ example: 'john.doe@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: 'https://cdn.careid.com/photos/profile.jpg', nullable: true })
  photoUrl!: string | null;

  @ApiProperty({ example: 'APPOINTMENT', description: 'Authorization source: APPOINTMENT, REFERRAL, or CONSENT' })
  authSource!: string;

  @ApiProperty({ example: '2026-01-15T10:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-02-01T15:30:00.000Z' })
  updatedAt!: string;
}

export class DoctorPatientAddressDto {
  @ApiPropertyOptional({ example: '123 Main Street' })
  line1?: string | null;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  line2?: string | null;

  @ApiPropertyOptional({ example: 'Metropolis' })
  city?: string | null;

  @ApiPropertyOptional({ example: 'NY' })
  state?: string | null;

  @ApiPropertyOptional({ example: 'Central' })
  district?: string | null;

  @ApiPropertyOptional({ example: '10001' })
  postalCode?: string | null;

  @ApiPropertyOptional({ example: 'USA' })
  country?: string | null;
}

export class DoctorPatientEmergencyContactDto {
  @ApiProperty({ example: 'contact-uuid' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  name!: string;

  @ApiProperty({ example: 'SPOUSE' })
  relationship!: string;

  @ApiProperty({ example: '+1987654321' })
  phone!: string;
}

export class DoctorPatientDetailDto extends DoctorPatientSummaryDto {
  @ApiProperty({ example: 'American', nullable: true })
  nationality!: string | null;

  @ApiProperty({ example: 'Software Engineer', nullable: true })
  occupation!: string | null;

  @ApiProperty({ example: 'MARRIED', nullable: true })
  maritalStatus!: string | null;

  @ApiProperty({ example: ['English', 'Spanish'], type: [String] })
  languages!: string[];

  @ApiProperty({ example: '123 Main Street, Metropolis', nullable: true })
  address!: string | null;

  @ApiPropertyOptional({ type: DoctorPatientAddressDto, nullable: true })
  currentAddress?: DoctorPatientAddressDto | null;

  @ApiPropertyOptional({ type: DoctorPatientAddressDto, nullable: true })
  permanentAddress?: DoctorPatientAddressDto | null;

  @ApiProperty({ example: ['Penicillin', 'Peanuts'], type: [String] })
  knownAllergies!: string[];

  @ApiProperty({ example: ['Hypertension', 'Asthma'], type: [String] })
  chronicConditions!: string[];

  @ApiProperty({ example: [], type: [String] })
  disabilities!: string[];

  @ApiProperty({ example: 'PHONE', nullable: true })
  prefContactMethod!: string | null;

  @ApiPropertyOptional({ type: DoctorPatientEmergencyContactDto, nullable: true })
  emergencyContact?: DoctorPatientEmergencyContactDto | null;
}

// ─── Prescription DTOs ─────────────────────────────────────────────────────

export class MedicationItemDto {
  @ApiProperty({ example: 'Amoxicillin' })
  @IsNotEmpty()
  @IsString()
  name!: string;

  @ApiProperty({ example: '500mg' })
  @IsNotEmpty()
  @IsString()
  dosage!: string;

  @ApiProperty({ example: 'Three times daily (TID)' })
  @IsNotEmpty()
  @IsString()
  frequency!: string;

  @ApiProperty({ example: '7 days' })
  @IsNotEmpty()
  @IsString()
  duration!: string;

  @ApiPropertyOptional({ example: 'Take after meals with plenty of water' })
  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreateDoctorPrescriptionDto {
  @ApiProperty({ example: 'Prescription for Acute Upper Respiratory Infection' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({ example: 'Patient presented with 3-day history of cough, fever, and pharyngitis.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [MedicationItemDto], description: 'List of prescribed medications' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationItemDto)
  medications!: MedicationItemDto[];

  @ApiPropertyOptional({ example: 'Avoid alcohol and complete the full course of antibiotics.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Acute Pharyngitis (ICD-10 J02.9)' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'Metro Health Hospital' })
  @IsOptional()
  @IsString()
  facilityName?: string;

  @ApiPropertyOptional({ example: '2026-11-05T09:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  reportDate?: string;

  @ApiPropertyOptional({ example: true, description: 'CR-08: Whether patient should receive pharmacy pickup reminder' })
  @IsOptional()
  @IsBoolean()
  pickupReminderEnabled?: boolean;

  @ApiPropertyOptional({ example: 2, description: 'CR-08: Reminder interval in hours post-consultation' })
  @IsOptional()
  @IsInt()
  pickupReminderHours?: number;
}

export class DoctorPrescriptionResponseDto {
  @ApiProperty({ example: 'prescription-uuid' })
  id!: string;

  @ApiProperty({ example: 'patient-profile-uuid' })
  patientProfileId!: string;

  @ApiProperty({ example: 'Prescription for Acute Upper Respiratory Infection' })
  title!: string;

  @ApiProperty({ example: 'Patient presented with 3-day history of cough, fever...', nullable: true })
  description!: string | null;

  @ApiProperty({ example: 'PRESCRIPTION' })
  category!: string;

  @ApiProperty({ example: 'UPLOADED' })
  status!: string;

  @ApiProperty({ example: '2026-11-05T09:00:00.000Z', nullable: true })
  reportDate!: string | null;

  @ApiProperty({ example: 'Dr. Evelyn Reed', nullable: true })
  prescribedBy!: string | null;

  @ApiProperty({ example: 'Dr. Evelyn Reed', nullable: true })
  doctorName!: string | null;

  @ApiProperty({ example: 'General Medicine', nullable: true })
  providerName!: string | null;

  @ApiProperty({ example: 'Metro Health Hospital', nullable: true })
  facilityName!: string | null;

  @ApiProperty({ type: [MedicationItemDto] })
  medications!: MedicationItemDto[];

  @ApiProperty({ example: ['Amoxicillin'], type: [String] })
  tags!: string[];

  @ApiProperty({ example: 'Avoid alcohol and complete course.', nullable: true })
  notes!: string | null;

  @ApiProperty({ example: 'VERIFIED' })
  verificationStatus!: string;

  @ApiProperty({ example: 'doctor-user-uuid', nullable: true })
  verifiedBy!: string | null;

  @ApiProperty({ example: '2026-11-05T09:10:00.000Z', nullable: true })
  verifiedAt!: string | null;

  @ApiProperty({ example: [], type: [Object] })
  attachments!: any[];

  @ApiProperty({ example: '2026-11-05T09:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-05T09:00:00.000Z' })
  updatedAt!: string;

  @ApiPropertyOptional({ example: true, description: 'CR-08: Whether patient pharmacy pickup reminder is active' })
  pickupReminderEnabled?: boolean;

  @ApiPropertyOptional({ example: 2, description: 'CR-08: Reminder interval in hours post-consultation' })
  pickupReminderHours?: number;

  @ApiPropertyOptional({ example: false, description: 'CR-08: Whether prescription has been marked collected by patient/pharmacy' })
  collected?: boolean;

  @ApiPropertyOptional({ example: '2026-11-22T12:00:00.000Z', nullable: true, description: 'CR-08: Timestamp when prescription was marked collected' })
  collectedAt?: string | null;
}

// ─── Vitals DTOs ───────────────────────────────────────────────────────────

export class CreateDoctorVitalsDto {
  @ApiPropertyOptional({ example: 175.5, description: 'Height in cm (30 - 300)' })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  heightCm?: number;

  @ApiPropertyOptional({ example: 70.0, description: 'Weight in kg (1 - 500)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  weightKg?: number;

  @ApiPropertyOptional({ example: 120, description: 'Systolic blood pressure in mmHg (50 - 300)' })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(300)
  systolicBp?: number;

  @ApiPropertyOptional({ example: 80, description: 'Diastolic blood pressure in mmHg (30 - 200)' })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(200)
  diastolicBp?: number;

  @ApiPropertyOptional({ example: 72, description: 'Pulse rate in bpm (30 - 250)' })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(250)
  pulseBpm?: number;

  @ApiPropertyOptional({ example: 16, description: 'Respiration rate in breaths per min (5 - 60)' })
  @IsOptional()
  @IsNumber()
  @Min(5)
  @Max(60)
  respirationRate?: number;

  @ApiPropertyOptional({ example: 36.8, description: 'Body temperature in Celsius (25 - 45)' })
  @IsOptional()
  @IsNumber()
  @Min(25)
  @Max(45)
  temperatureC?: number;

  @ApiPropertyOptional({ example: 95.0, description: 'Blood glucose level in mg/dL (20 - 1000)' })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(1000)
  bloodSugarMgDl?: number;

  @ApiPropertyOptional({ example: 98.0, description: 'Oxygen saturation SpO2 percentage (50 - 100)' })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(100)
  oxygenSaturation?: number;

  @ApiPropertyOptional({ example: 'medical-record-uuid', description: 'Optional medical record to associate vitals with' })
  @IsOptional()
  @IsString()
  medicalRecordId?: string;

  @ApiPropertyOptional({ example: '2026-11-05T09:30:00.000Z', description: 'Timestamp when vitals were recorded' })
  @IsOptional()
  @IsDateString()
  recordedAt?: string;
}

export class DoctorVitalSignsResponseDto {
  @ApiProperty({ example: 'vitals-uuid' })
  id!: string;

  @ApiProperty({ example: 'medical-record-uuid' })
  medicalRecordId!: string;

  @ApiProperty({ example: 175.5, nullable: true })
  heightCm!: number | null;

  @ApiProperty({ example: 70.0, nullable: true })
  weightKg!: number | null;

  @ApiProperty({ example: 22.72, nullable: true, description: 'Calculated Body Mass Index' })
  bmi!: number | null;

  @ApiProperty({ example: 120, nullable: true })
  systolicBp!: number | null;

  @ApiProperty({ example: 80, nullable: true })
  diastolicBp!: number | null;

  @ApiProperty({ example: '120/80 mmHg', nullable: true })
  bloodPressure!: string | null;

  @ApiProperty({ example: 72, nullable: true })
  pulseBpm!: number | null;

  @ApiProperty({ example: 16, nullable: true })
  respirationRate!: number | null;

  @ApiProperty({ example: 36.8, nullable: true })
  temperatureC!: number | null;

  @ApiProperty({ example: 95.0, nullable: true })
  bloodSugarMgDl!: number | null;

  @ApiProperty({ example: 98.0, nullable: true })
  oxygenSaturation!: number | null;

  @ApiProperty({ example: '2026-11-05T09:30:00.000Z' })
  recordedAt!: string;

  @ApiPropertyOptional({
    example: { id: 'doctor-uuid', fullName: 'Dr. Evelyn Reed' },
    nullable: true,
  })
  recordedBy?: {
    id: string;
    fullName?: string;
  } | null;
}

// ─── Standalone Prescription Management DTOs ───────────────────────────────

export class UpdatePrescriptionDto {
  @ApiPropertyOptional({ example: 'Prescription for Acute Upper Respiratory Infection (Updated)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Updated medication instructions and extended course.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [MedicationItemDto], description: 'Updated list of prescribed medications' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MedicationItemDto)
  medications?: MedicationItemDto[];

  @ApiPropertyOptional({ example: 'Take with food. Patient tolerated initial dosage.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Metro Health Hospital' })
  @IsOptional()
  @IsString()
  facilityName?: string;

  @ApiPropertyOptional({ example: 'Acute Pharyngitis (ICD-10 J02.9)' })
  @IsOptional()
  @IsString()
  diagnosis?: string;
}

export class PrescriptionRefillDto {
  @ApiPropertyOptional({ example: 1, description: 'Refill quantity or count' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ example: 'Standard 30-day refill authorized by clinic' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DiscontinuePrescriptionDto {
  @ApiProperty({ example: 'Patient experienced adverse skin rash; switching to alternative antibiotic.' })
  @IsNotEmpty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ example: 'Discontinued after consultation on 2026-11-05' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PrescriptionRefillItemDto {
  @ApiProperty({ example: 'refill-uuid' })
  id!: string;

  @ApiProperty({ example: 1 })
  refillNumber!: number;

  @ApiProperty({ example: '2026-11-05T10:00:00.000Z' })
  refilledAt!: string;

  @ApiProperty({ example: 'user-uuid' })
  refilledBy!: string;

  @ApiPropertyOptional({ example: 'Dr. Evelyn Reed' })
  refilledByName?: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiPropertyOptional({ example: 'Standard refill authorized' })
  notes?: string;
}

export class PrescriptionDetailDto extends DoctorPrescriptionResponseDto {
  @ApiProperty({ type: [PrescriptionRefillItemDto] })
  refills!: PrescriptionRefillItemDto[];

  @ApiProperty({ example: 1 })
  refillCount!: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  maxRefills?: number | null;

  @ApiProperty({ example: false })
  isDiscontinued!: boolean;

  @ApiPropertyOptional({ example: null, nullable: true })
  discontinuedAt?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  discontinuedBy?: string | null;

  @ApiPropertyOptional({ example: null, nullable: true })
  discontinueReason?: string | null;
}

export class PrescriptionExportResponseDto {
  @ApiProperty({ example: 'prescription-uuid' })
  prescriptionId!: string;

  @ApiProperty({ example: 'RX-2026-00123' })
  rxNumber!: string;

  @ApiProperty({ example: '2026-11-05T09:00:00.000Z' })
  issuedAt!: string;

  @ApiProperty({ example: { id: 'patient-uuid', fullName: 'John Doe', mrn: 'PT-360-12345' } })
  patient!: any;

  @ApiProperty({ example: { id: 'doctor-uuid', fullName: 'Dr. Evelyn Reed', specialization: 'General Medicine' } })
  prescriber!: any;

  @ApiProperty({ example: 'Metro Health Hospital' })
  facilityName!: string;

  @ApiProperty({ type: [MedicationItemDto] })
  medications!: MedicationItemDto[];

  @ApiProperty({ example: 'Avoid alcohol and take with food.' })
  instructions!: string | null;

  @ApiProperty({ example: 1 })
  refillCount!: number;

  @ApiPropertyOptional({ example: null, nullable: true })
  maxRefills?: number | null;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ example: 'CareID Digital Health Platform — Clinically Verified' })
  disclaimer!: string;
}

// ─── Hospital Admissions DTOs ───────────────────────────────────────────────

export class CreateHospitalAdmissionDto {
  @ApiPropertyOptional({ example: 'Hospital Admission - Inpatient Care' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: '2026-11-05T08:00:00.000Z', description: 'Admission start date/time' })
  @IsOptional()
  @IsDateString()
  admissionDate?: string;

  @ApiPropertyOptional({ example: '2026-11-10T12:00:00.000Z', description: 'Expected or actual discharge date/time' })
  @IsOptional()
  @IsDateString()
  dischargeDate?: string;

  @ApiPropertyOptional({ example: 'EMERGENCY', description: 'EMERGENCY, ELECTIVE, URGENT, OBSERVATION' })
  @IsOptional()
  @IsString()
  admissionType?: string;

  @ApiPropertyOptional({ example: 'Severe acute chest pain radiating to left arm' })
  @IsOptional()
  @IsString()
  reasonForAdmission?: string;

  @ApiPropertyOptional({ example: 'Acute Coronary Syndrome (ICD-10 I20.0)' })
  @IsOptional()
  @IsString()
  admittingDiagnosis?: string;

  @ApiPropertyOptional({ example: 'Cardiology - ICU' })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiPropertyOptional({ example: 'Bed 4B' })
  @IsOptional()
  @IsString()
  roomBed?: string;

  @ApiPropertyOptional({ example: 'Metro Health Hospital' })
  @IsOptional()
  @IsString()
  facilityName?: string;

  @ApiPropertyOptional({ example: 'Dr. Evelyn Reed' })
  @IsOptional()
  @IsString()
  attendingDoctorName?: string;

  @ApiPropertyOptional({ example: 'Patient admitted via ED; continuous telemetry monitoring initiated.' })
  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @ApiPropertyOptional({ example: 'Serial troponin tests, 12-lead ECG, cardiology consult.' })
  @IsOptional()
  @IsString()
  treatmentPlan?: string;
}

export class HospitalAdmissionResponseDto {
  @ApiProperty({ example: 'admission-encounter-uuid' })
  id!: string;

  @ApiProperty({ example: 'medical-record-uuid' })
  medicalRecordId!: string;

  @ApiProperty({ example: 'patient-profile-uuid' })
  patientProfileId!: string;

  @ApiProperty({ example: 'Hospital Admission - Inpatient Care' })
  title!: string;

  @ApiProperty({ example: 'ADMISSION' })
  encounterType!: string;

  @ApiProperty({ example: '2026-11-05T08:00:00.000Z' })
  encounterDate!: string;

  @ApiProperty({ example: 'Metro Health Hospital', nullable: true })
  facilityName!: string | null;

  @ApiProperty({ example: 'Dr. Evelyn Reed', nullable: true })
  providerName!: string | null;

  @ApiProperty({ example: 'Severe acute chest pain radiating to left arm', nullable: true })
  chiefComplaint!: string | null;

  @ApiProperty({ example: 'Patient admitted via ED...', nullable: true })
  clinicalNotes!: string | null;

  @ApiProperty({ example: 'Serial troponin tests...', nullable: true })
  treatmentPlan!: string | null;

  @ApiProperty({ example: 'FINAL' })
  status!: string;

  @ApiProperty({ example: [], type: [Object] })
  diagnoses!: any[];

  @ApiProperty({ example: '2026-11-05T08:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-11-05T08:00:00.000Z' })
  updatedAt!: string;
}

export class UpdateClinicalAlertsDto {
  @ApiPropertyOptional({ example: ['Penicillin', 'Peanuts'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  knownAllergies?: string[];

  @ApiPropertyOptional({ example: ['Type 2 Diabetes', 'Hypertension'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  chronicConditions?: string[];

  @ApiPropertyOptional({ example: ['Hearing Impairment'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disabilities?: string[];
}


