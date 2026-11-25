import {
  DoctorProfileEntity,
  DoctorQualificationEntity,
  DoctorCertificationEntity,
  DoctorExperienceEntity,
  DoctorDocumentEntity,
  DoctorScheduleSlotEntity,
  DoctorHistoryEntity,
  DoctorAuditLogEntity,
} from '../entities/doctor.entity';
import {
  DoctorPatientsQueryDto,
  CreateDoctorPrescriptionDto,
  CreateDoctorVitalsDto,
  UpdatePrescriptionDto,
  CreateHospitalAdmissionDto,
} from '../../presentation/dto/doctor-patient-management.dto';
import { DoctorRegisterPatientDto } from '../../presentation/dto/doctor-register-patient.dto';

export interface IDoctorRepository {
  findProfileByUserId(userId: string): Promise<DoctorProfileEntity | null>;

  createDoctor(data: any): Promise<DoctorProfileEntity>;
  findDoctorById(id: string, includeDeleted?: boolean): Promise<DoctorProfileEntity | null>;
  findDoctorByRegistrationNumber(registrationNumber: string): Promise<DoctorProfileEntity | null>;
  findDoctorByLicenseNumber(licenseNumber: string): Promise<DoctorProfileEntity | null>;
  findDoctorByProviderIdentifier(providerIdentifier: string): Promise<DoctorProfileEntity | null>;
  findDoctors(includeDeleted?: boolean, page?: number, limit?: number): Promise<DoctorProfileEntity[]>;
  findPendingDoctors(): Promise<DoctorProfileEntity[]>;
  updateDoctor(id: string, data: any): Promise<DoctorProfileEntity>;
  softDeleteDoctor(id: string): Promise<void>;
  searchDoctors(query: string): Promise<DoctorProfileEntity[]>;

  addQualification(doctorProfileId: string, data: any): Promise<DoctorQualificationEntity>;
  addCertification(doctorProfileId: string, data: any): Promise<DoctorCertificationEntity>;
  addExperience(doctorProfileId: string, data: any): Promise<DoctorExperienceEntity>;
  attachDocument(doctorProfileId: string, data: any): Promise<DoctorDocumentEntity>;
  findDocumentsByDoctorId(doctorProfileId: string): Promise<DoctorDocumentEntity[]>;

  findSlotsByDoctorId(doctorProfileId: string): Promise<DoctorScheduleSlotEntity[]>;

  createHistory(doctorProfileId: string, data: {
    action: string;
    previousStatus?: string;
    newStatus: string;
    reason?: string;
    performedBy?: string;
  }): Promise<DoctorHistoryEntity>;

  findHistoryByDoctorId(doctorProfileId: string): Promise<DoctorHistoryEntity[]>;

  createAuditLog(data: {
    doctorProfileId: string;
    action: string;
    performedBy?: string;
    details?: string;
  }): Promise<DoctorAuditLogEntity>;

  getStatistics(): Promise<{
    totalDoctors: number;
    verifiedDoctors: number;
    pendingDoctors: number;
    suspendedDoctors: number;
  }>;

  findPatientProfileById(patientProfileId: string): Promise<any | null>;
  getDoctorActiveFacilityIds(doctorId: string): Promise<string[]>;
  getUserFacilityIds(userId: string): Promise<string[]>;
  verifyDoctorPatientAccess(
    doctorId: string,
    doctorUserId: string,
    patientProfileId: string,
    activeFacilityIds: string[],
  ): Promise<{
    isAuthorized: boolean;
    authSource?: string;
    scopeRecordId?: string;
    reason?: string;
  }>;
  findPatientMedicalRecords(
    patientProfileId: string,
    options: {
      page?: number;
      limit?: number;
      status?: string;
      startDate?: Date;
      endDate?: Date;
      includeArchived?: boolean;
      scopedRecordId?: string;
    },
  ): Promise<{ items: any[]; total: number }>;
  getPatientTimeline(
    patientProfileId: string,
    options: {
      page?: number;
      limit?: number;
      scopedRecordId?: string;
    },
  ): Promise<{ items: any[]; total: number }>;
  createMedicalRecordAuditLog(data: {
    action: string;
    performedBy: string;
    details: string;
    ipAddress?: string;
    medicalRecordId?: string;
  }): Promise<any>;
  createMedicalRecord(patientProfileId: string, data: any): Promise<any>;
  findMedicalRecordById(recordId: string): Promise<any | null>;
  updateMedicalRecord(recordId: string, data: any): Promise<any>;
  createSecurityAuditLog(data: {
    userId?: string;
    action: string;
    resource: string;
    resourceId?: string;
    result: string;
    details?: string;
    ipAddress?: string;
  }): Promise<any>;

  findAuthorizedPatients(
    doctorId: string,
    doctorUserId: string,
    activeFacilityIds: string[],
    query: DoctorPatientsQueryDto,
  ): Promise<{ items: any[]; total: number }>;

  findPatientDetailsForDoctor(patientProfileId: string): Promise<any | null>;

  findPatientPrescriptions(
    patientProfileId: string,
    options: { page?: number; limit?: number },
  ): Promise<{ items: any[]; total: number }>;

  createPatientPrescription(
    patientProfileId: string,
    doctor: any,
    data: CreateDoctorPrescriptionDto,
  ): Promise<any>;

  findPatientVitals(
    patientProfileId: string,
    options: { page?: number; limit?: number },
  ): Promise<{ items: any[]; total: number }>;

  createPatientVitals(
    patientProfileId: string,
    doctor: any,
    data: CreateDoctorVitalsDto,
  ): Promise<any>;

  findPrescriptionById(prescriptionId: string): Promise<any | null>;

  updatePrescription(prescriptionId: string, data: any): Promise<any>;

  refillPrescriptionAtomic(prescriptionId: string, newNotes: string, auditData: any): Promise<any>;

  findPatientAdmissions(
    patientProfileId: string,
    options: { page?: number; limit?: number },
  ): Promise<{ items: any[]; total: number }>;

  createPatientAdmission(
    patientProfileId: string,
    doctor: any,
    data: CreateHospitalAdmissionDto,
  ): Promise<any>;

  registerPatientByDoctor(
    doctor: any,
    dto: DoctorRegisterPatientDto,
  ): Promise<any>;
}
