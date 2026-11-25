import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsArray,
  ValidateNested,
  IsEnum,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';

// ─── 1. Safety Time-Out (Stage 16) ──────────────────────────────────────────

export class SafetyTimeoutGatesDto {
  @ApiProperty({ description: 'Patient name, DOB, and ID verified by 2 clinical team members' })
  @IsBoolean()
  patientIdentityConfirmed!: boolean;

  @ApiProperty({ description: 'Planned procedure and anatomical indication verified' })
  @IsBoolean()
  procedureConfirmed!: boolean;

  @ApiProperty({ description: 'Vascular access site (e.g. Right Radial) confirmed and prepped' })
  @IsBoolean()
  accessSiteConfirmed!: boolean;

  @ApiProperty({ description: 'Informed consent, anticoagulation strategy, and allergies verified' })
  @IsBoolean()
  consentAndAnticoagulationVerified!: boolean;

  @ApiProperty({ description: 'Emergency equipment, defibrillator, and sterile implants ready' })
  @IsBoolean()
  equipmentAndEmergencyPrepared!: boolean;

  @ApiProperty({ description: 'Radiation safety shields positioned and ALARA protocol confirmed' })
  @IsBoolean()
  radiationAndShieldingVerified!: boolean;
}

export class SubmitSafetyTimeoutDto {
  @ApiProperty({ description: 'Associated Appointment UUID' })
  @IsNotEmpty()
  @IsUUID()
  appointmentId!: string;

  @ApiPropertyOptional({ description: 'Associated Treatment Offer UUID' })
  @IsOptional()
  @IsUUID()
  treatmentOfferId?: string;

  @ApiPropertyOptional({ description: 'Associated Clinical Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ type: SafetyTimeoutGatesDto, description: 'Mandatory 6-gate safety checklist' })
  @ValidateNested()
  @Type(() => SafetyTimeoutGatesDto)
  gates!: SafetyTimeoutGatesDto;

  @ApiPropertyOptional({ description: 'Circulating nurse user ID or staff identifier' })
  @IsOptional()
  @IsString()
  circulatingNurseId?: string;

  @ApiPropertyOptional({ description: 'Anesthesia provider user ID or staff identifier' })
  @IsOptional()
  @IsString()
  anesthesiaProviderId?: string;

  @ApiPropertyOptional({ description: 'Clinical time-out notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Set to true if amending a previously recorded timeout', default: false })
  @IsOptional()
  @IsBoolean()
  isAmendment?: boolean;

  @ApiPropertyOptional({ description: 'Clinical reason for amendment (mandatory if isAmendment is true)' })
  @IsOptional()
  @IsString()
  amendmentReason?: string;
}

// ─── 2. Safety Hold (Stage 16–17) ───────────────────────────────────────────

export enum SafetyHoldCategory {
  EQUIPMENT_MALFUNCTION = 'EQUIPMENT_MALFUNCTION',
  PATIENT_HEMODYNAMIC_INSTABILITY = 'PATIENT_HEMODYNAMIC_INSTABILITY',
  CONSENT_OR_IDENTIFICATION_DISCREPANCY = 'CONSENT_OR_IDENTIFICATION_DISCREPANCY',
  ANESTHESIA_AIRWAY_COMPROMISE = 'ANESTHESIA_AIRWAY_COMPROMISE',
  RADIATION_OR_CONTRAST_HAZARD = 'RADIATION_OR_CONTRAST_HAZARD',
  MEDICATION_ERROR = 'MEDICATION_ERROR',
  OTHER_SAFETY_HAZARD = 'OTHER_SAFETY_HAZARD',
}

export class DeclareSafetyHoldDto {
  @ApiProperty({ description: 'Appointment UUID' })
  @IsNotEmpty()
  @IsUUID()
  appointmentId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ enum: SafetyHoldCategory, description: 'Safety hazard category' })
  @IsEnum(SafetyHoldCategory)
  holdCategory!: SafetyHoldCategory;

  @ApiProperty({ description: 'Clinical reason for declaring emergency hold' })
  @IsNotEmpty()
  @IsString()
  reason!: string;

  @ApiPropertyOptional({ description: 'Additional clinical context' })
  @IsOptional()
  @IsString()
  clinicalNotes?: string;
}

export class ClearSafetyHoldDto {
  @ApiProperty({ description: 'Clinical explanation of hazard remediation' })
  @IsNotEmpty()
  @IsString()
  resolutionNotes!: string;
}

// ─── 3. Telemetry & Fluoroscopy (Stage 17–18) ───────────────────────────────

export class LogTelemetryDto {
  @ApiProperty({ description: 'Appointment UUID' })
  @IsNotEmpty()
  @IsUUID()
  appointmentId!: string;

  @ApiPropertyOptional({ description: 'Encounter UUID' })
  @IsOptional()
  @IsUUID()
  encounterId?: string;

  @ApiProperty({ description: 'Elapsed fluoroscopy duration in seconds', example: 420 })
  @IsNumber()
  @Min(0)
  @Max(7200)
  fluoroscopyDurationSeconds!: number;

  @ApiProperty({ description: 'Dose Area Product (DAP) in mGy*cm2', example: 38500 })
  @IsNumber()
  @Min(0)
  doseAreaProductDap!: number;

  @ApiPropertyOptional({ description: 'Cumulative Air Kerma in mGy', example: 450 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cumulativeAirKerma?: number;

  @ApiProperty({ description: 'Contrast volume administered in mL', example: 120 })
  @IsNumber()
  @Min(0)
  @Max(1000)
  contrastVolumeMl!: number;

  @ApiPropertyOptional({ description: 'Contrast agent brand/concentration', example: 'Iohexol 350' })
  @IsOptional()
  @IsString()
  contrastAgent?: string;

  @ApiPropertyOptional({ description: 'Activated Clotting Time (ACT) in seconds', example: 285 })
  @IsOptional()
  @IsNumber()
  @Min(50)
  @Max(1000)
  activatedClottingTimeSeconds?: number;

  @ApiProperty({ description: 'Systolic Blood Pressure (mmHg)', example: 125 })
  @IsNumber()
  @Min(30)
  @Max(300)
  systolicBp!: number;

  @ApiProperty({ description: 'Diastolic Blood Pressure (mmHg)', example: 78 })
  @IsNumber()
  @Min(20)
  @Max(200)
  diastolicBp!: number;

  @ApiPropertyOptional({ description: 'Mean Arterial Pressure (mmHg)', example: 93 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(250)
  meanArterialPressure?: number;

  @ApiProperty({ description: 'Heart Rate (bpm)', example: 74 })
  @IsNumber()
  @Min(20)
  @Max(250)
  heartRate!: number;

  @ApiProperty({ description: 'Pulse Oximeter Oxygen Saturation (%)', example: 99 })
  @IsNumber()
  @Min(50)
  @Max(100)
  oxygenSaturation!: number;

  @ApiPropertyOptional({ description: 'Data source device', default: 'MANUAL_ENTRY' })
  @IsOptional()
  @IsString()
  sourceDevice?: string;

  @ApiPropertyOptional({
    description: 'Reading semantics: INCREMENTAL event vs CUMULATIVE_SNAPSHOT reading',
    example: 'INCREMENTAL',
    enum: ['INCREMENTAL', 'CUMULATIVE_SNAPSHOT'],
  })
  @IsOptional()
  @IsString()
  readingType?: 'INCREMENTAL' | 'CUMULATIVE_SNAPSHOT';

  @ApiPropertyOptional({ description: 'Observation notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

// ─── 4. Coronary Vessel Findings / QCA (Stage 18) ───────────────────────────

export enum CoronaryVesselEnum {
  LMCA = 'LMCA',
  LAD = 'LAD',
  LCX = 'LCX',
  RCA = 'RCA',
  RAMUS = 'RAMUS',
  DIAGONAL_1 = 'DIAGONAL_1',
  DIAGONAL_2 = 'DIAGONAL_2',
  OM_1 = 'OM_1',
  OM_2 = 'OM_2',
  PDA = 'PDA',
  PLV = 'PLV',
  GRAFT_SVG = 'GRAFT_SVG',
  GRAFT_LIMA = 'GRAFT_LIMA',
  GRAFT_RIMA = 'GRAFT_RIMA',
}

export enum CoronaryDominanceEnum {
  RIGHT = 'RIGHT',
  LEFT = 'LEFT',
  CO_DOMINANT = 'CO_DOMINANT',
}

export enum TimiFlowEnum {
  TIMI_0 = 'TIMI_0',
  TIMI_1 = 'TIMI_1',
  TIMI_2 = 'TIMI_2',
  TIMI_3 = 'TIMI_3',
}

export class VesselFindingItemDto {
  @ApiProperty({ enum: CoronaryVesselEnum, description: 'Coronary artery branch' })
  @IsEnum(CoronaryVesselEnum)
  vessel!: CoronaryVesselEnum;

  @ApiProperty({ example: 'PROXIMAL', description: 'Lesion segment: OSTIAL, PROXIMAL, MID, DISTAL' })
  @IsNotEmpty()
  @IsString()
  segment!: string;

  @ApiProperty({ example: 85, description: 'Visual or QCA diameter stenosis percentage (0-100)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  stenosisPercentage!: number;

  @ApiProperty({ enum: TimiFlowEnum, description: 'Baseline TIMI flow grade' })
  @IsEnum(TimiFlowEnum)
  timiFlowPre!: TimiFlowEnum;

  @ApiPropertyOptional({ enum: TimiFlowEnum, description: 'Post-intervention TIMI flow grade' })
  @IsOptional()
  @IsEnum(TimiFlowEnum)
  timiFlowPost?: TimiFlowEnum;

  @ApiPropertyOptional({ example: 'MODERATE', description: 'Calcification grade: NONE, MILD, MODERATE, SEVERE' })
  @IsOptional()
  @IsString()
  calcification?: string;

  @ApiPropertyOptional({ example: 'TYPE_B2', description: 'ACC/AHA lesion morphology classification' })
  @IsOptional()
  @IsString()
  lesionType?: string;

  @ApiProperty({ example: true, description: 'Whether angioplasty/stenting was performed' })
  @IsBoolean()
  interventionPerformed!: boolean;

  @ApiPropertyOptional({
    example: 'STENT_PLACEMENT',
    description: 'Specific interventional procedure: DIAGNOSTIC_ANGIOGRAPHY, BALLOON_ANGIOPLASTY, STENT_PLACEMENT, ATHERECTOMY, THROMBECTOMY, OTHER',
  })
  @IsOptional()
  @IsString()
  procedureType?: string;

  @ApiPropertyOptional({
    example: '92928',
    description: 'Validated CPT procedure code matching clinical intervention (e.g., 92920 for PTCA, 92928 for Stent, 92924 for Atherectomy)',
  })
  @IsOptional()
  @IsString()
  cptCode?: string;

  @ApiPropertyOptional({ example: false, description: 'Flag if finding is strictly diagnostic without therapeutic intervention' })
  @IsOptional()
  @IsBoolean()
  isDiagnosticOnly?: boolean;

  @ApiPropertyOptional({ example: '3.0 x 18 mm DES deployed at 14 atm', description: 'Implant device specifications' })
  @IsOptional()
  @IsString()
  stentDetails?: string;

  @ApiPropertyOptional({ description: 'Lesion specific notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateVesselFindingsDto {
  @ApiProperty({ enum: CoronaryDominanceEnum, description: 'Coronary arterial dominance' })
  @IsEnum(CoronaryDominanceEnum)
  coronaryDominance!: CoronaryDominanceEnum;

  @ApiPropertyOptional({ example: 55, description: 'Left Ventricular Ejection Fraction (LVEF %)' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(90)
  lvefPercentage?: number;

  @ApiPropertyOptional({ example: 'RADIAL_BAND', description: 'Hemostasis access closure method' })
  @IsOptional()
  @IsString()
  hemostasisMethod?: string;

  @ApiProperty({ type: [VesselFindingItemDto], description: 'Array of vessel lesion findings' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VesselFindingItemDto)
  findings!: VesselFindingItemDto[];

  @ApiPropertyOptional({ description: 'Overall angiographic conclusion' })
  @IsOptional()
  @IsString()
  summary?: string;
}

// ─── 5. DICOM / PACS (Stage 18) ─────────────────────────────────────────────

export class RegisterDicomSeriesDto {
  @ApiProperty({ example: '1.2.840.10008.5.1.4.1.1.12.1.20261110.001', description: 'DICOM Study Instance UID' })
  @IsNotEmpty()
  @IsString()
  studyInstanceUid!: string;

  @ApiProperty({ example: '1.2.840.10008.5.1.4.1.1.12.1.20261110.001.01', description: 'DICOM Series Instance UID' })
  @IsNotEmpty()
  @IsString()
  seriesInstanceUid!: string;

  @ApiPropertyOptional({ default: 'XA', description: 'Modality (XA: X-Ray Angiography)' })
  @IsOptional()
  @IsString()
  modality?: string = 'XA';

  @ApiProperty({ example: 'LAD Cranial 30/30 Run 02', description: 'Series acquisition description' })
  @IsNotEmpty()
  @IsString()
  seriesDescription!: string;

  @ApiProperty({ example: 64, description: 'Total number of cine frames in series' })
  @IsNumber()
  @Min(1)
  numberOfFrames!: number;

  @ApiPropertyOptional({ description: 'Permanent stable storage key / object identifier (e.g. B2 object path)' })
  @IsOptional()
  @IsString()
  storageKey?: string;

  @ApiPropertyOptional({ description: 'Storage URL or B2 attachment reference' })
  @IsOptional()
  @IsString()
  storageUrl?: string;

  @ApiPropertyOptional({ example: [16, 32, 48], description: 'Indices of key diagnostic cine frames' })
  @IsOptional()
  @IsArray()
  keyFrameNumbers?: number[];

  @ApiPropertyOptional({ example: 75, description: 'Tube potential (kVp)' })
  @IsOptional()
  @IsNumber()
  kvp?: number;

  @ApiPropertyOptional({ example: 12, description: 'Exposure time per frame in milliseconds' })
  @IsOptional()
  @IsNumber()
  exposureTimeMs?: number;
}

