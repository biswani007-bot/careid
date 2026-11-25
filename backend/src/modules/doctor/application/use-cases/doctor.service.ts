import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { validateImageBuffer } from '@common/utils/file-security.util';
import { ClinicalPdfBuilder } from '@common/utils/clinical-pdf.builder';
import { IDoctorRepository } from '../../domain/repositories/doctor.repository.interface';
import {
  RegisterDoctorDto, AddQualificationDto, AddCertificationDto, AddExperienceDto,
  AttachDoctorDocumentDto, DoctorActionDto, RenewLicenseDto,
} from '../../presentation/dto/register-doctor.dto';
import {
  DoctorProfileFullResponseDto, DoctorDocumentResponseDto, DoctorHistoryItemDto, DoctorStatsResponseDto,
} from '../../presentation/dto/doctor-response.dto';
import { DoctorProfileResponseDto, ScheduleSlotResponseDto } from '../../presentation/dto/doctor-profile.dto';
import { DoctorPatientRecordsQueryDto } from '../../presentation/dto/doctor-patient-records.dto';
import {
  DoctorPatientsQueryDto,
  DoctorPatientSummaryDto,
  DoctorPatientDetailDto,
  CreateDoctorPrescriptionDto,
  DoctorPrescriptionResponseDto,
  CreateDoctorVitalsDto,
  DoctorVitalSignsResponseDto,
  MedicationItemDto,
  UpdatePrescriptionDto,
  PrescriptionRefillDto,
  DiscontinuePrescriptionDto,
  PrescriptionRefillItemDto,
  PrescriptionDetailDto,
  PrescriptionExportResponseDto,
  CreateHospitalAdmissionDto,
  HospitalAdmissionResponseDto,
} from '../../presentation/dto/doctor-patient-management.dto';
import {
  MedicalRecordResponseDto,
  MedicalTimelineItemDto,
} from '@modules/medical-record/presentation/dto/medical-record-response.dto';
import {
  CreateMedicalRecordDto,
  UpdateMedicalRecordDto,
} from '@modules/medical-record/presentation/dto/create-medical-record.dto';
import { PaginationQueryDto, PaginatedResponseDto, buildPaginationMeta } from '@common/dto/pagination.dto';
import { DoctorRegisterPatientDto, DoctorRegisterPatientResponseDto } from '../../presentation/dto/doctor-register-patient.dto';
import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { QrEntityType } from '@modules/qr/presentation/dto/generate-qr.dto';
import { Logger } from 'nestjs-pino';

@Injectable()
export class DoctorService {
  constructor(
    @Inject('IDoctorRepository')
    private readonly repository: IDoctorRepository,
    private readonly qrService: QrService,
    private readonly logger: Logger,
  ) {}

  private mapDoctor(d: any): DoctorProfileFullResponseDto {
    return {
      id: d.id,
      userId: d.userId,
      fullName: d.fullName,
      gender: d.gender || undefined,
      dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth).toISOString().split('T')[0] : undefined,
      profilePhotoUrl: d.profilePhotoUrl || undefined,
      digitalSignatureUrl: d.digitalSignatureUrl || undefined,
      biography: d.biography || undefined,
      professionalSummary: d.professionalSummary || undefined,
      yearsOfExperience: d.yearsOfExperience,
      primarySpecialization: d.primarySpecialization,
      secondarySpecializations: d.secondarySpecializations || [],
      clinicalPracticeType: d.clinicalPracticeType || 'HUMAN_HEALTHCARE',
      medicalCouncil: d.medicalCouncil,
      registrationNumber: d.registrationNumber,
      licenseNumber: d.licenseNumber,
      providerIdentifier: d.providerIdentifier,
      registrationState: d.registrationState || undefined,
      registrationCountry: d.registrationCountry || undefined,
      registrationIssueDate: d.registrationIssueDate ? new Date(d.registrationIssueDate).toISOString().split('T')[0] : undefined,
      registrationExpiryDate: d.registrationExpiryDate ? new Date(d.registrationExpiryDate).toISOString().split('T')[0] : undefined,
      verificationStatus: d.verificationStatus,
      verificationNotes: d.verificationNotes || undefined,
      verifiedBy: d.verifiedBy || undefined,
      verifiedAt: d.verifiedAt?.toISOString() || undefined,
      department: d.department || undefined,
      subSpecializations: d.subSpecializations || [],
      clinicalInterests: d.clinicalInterests || [],
      servicesOffered: d.servicesOffered || [],
      languagesSpoken: d.languagesSpoken || [],
      emergencyPhone: d.emergencyPhone || undefined,
      isDeleted: d.isDeleted,
      qualifications: d.qualifications?.map((q: any) => ({
        id: q.id,
        degreeName: q.degreeName,
        instituteName: q.instituteName,
        passingYear: q.passingYear,
        specialization: q.specialization || undefined,
        createdAt: q.createdAt.toISOString(),
      })) || [],
      certifications: d.certifications?.map((c: any) => ({
        id: c.id,
        title: c.title,
        issuingAuthority: c.issuingAuthority,
        issueDate: c.issueDate ? new Date(c.issueDate).toISOString().split('T')[0] : undefined,
        expiryDate: c.expiryDate ? new Date(c.expiryDate).toISOString().split('T')[0] : undefined,
        createdAt: c.createdAt.toISOString(),
      })) || [],
      experiences: d.experiences?.map((e: any) => ({
        id: e.id,
        designation: e.designation,
        hospitalName: e.hospitalName,
        startDate: new Date(e.startDate).toISOString().split('T')[0],
        endDate: e.endDate ? new Date(e.endDate).toISOString().split('T')[0] : undefined,
        isCurrent: e.isCurrent,
        createdAt: e.createdAt.toISOString(),
      })) || [],
      documents: d.documents?.map((doc: any) => ({
        id: doc.id,
        documentType: doc.documentType,
        medicalAttachmentId: doc.medicalAttachmentId || undefined,
        verificationStatus: doc.verificationStatus,
        createdAt: doc.createdAt.toISOString(),
      })) || [],
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }

  // ─── Registration & Profile Management ────────────────────────────────────

  async registerDoctor(userId: string, dto: RegisterDoctorDto): Promise<DoctorProfileFullResponseDto> {
    const existingProfile = await this.repository.findProfileByUserId(userId);
    if (existingProfile) {
      throw new ConflictException('Doctor profile already exists for this user account');
    }

    const regDup = await this.repository.findDoctorByRegistrationNumber(dto.registrationNumber);
    if (regDup) {
      throw new ConflictException('Medical registration number already registered in Master Provider Registry');
    }

    const licDup = await this.repository.findDoctorByLicenseNumber(dto.licenseNumber);
    if (licDup) {
      throw new ConflictException('Medical license number already registered');
    }

    const created = await this.repository.createDoctor({
      ...dto,
      userId,
    });

    // Request QR identity token generation from Enterprise QR Subsystem
    try {
      const qr = await this.qrService.generateQr(userId, {
        entityId: created.id,
        entityType: QrEntityType.DOCTOR_ID,
      });
      (created as any).qrToken = qr.token;
    } catch (err) {
      this.logger.warn({ msg: 'QR generation skipped for doctor profile', err });
    }

    await this.repository.createAuditLog({
      doctorProfileId: created.id,
      action: 'REGISTERED',
      performedBy: userId,
      details: `Master Doctor profile created with provider ID ${created.providerIdentifier}`,
    });

    return this.mapDoctor(created);
  }

  async getDoctors(page = 1, limit = 50, specialty?: string, search?: string): Promise<DoctorProfileFullResponseDto[]> {
    let doctors = await this.repository.findDoctors(false, page, limit);
    if (specialty) {
      const specLower = specialty.toLowerCase();
      doctors = doctors.filter((d: any) =>
        (d.specialization || '').toLowerCase().includes(specLower) ||
        (d.department || '').toLowerCase().includes(specLower),
      );
    }
    if (search) {
      const searchLower = search.toLowerCase();
      doctors = doctors.filter((d: any) =>
        `${d.firstName || ''} ${d.lastName || ''}`.toLowerCase().includes(searchLower) ||
        (d.licenseNumber || '').toLowerCase().includes(searchLower) ||
        (d.specialization || '').toLowerCase().includes(searchLower),
      );
    }
    return doctors.map((d) => this.mapDoctor(d));
  }

  async getPendingDoctors(): Promise<DoctorProfileFullResponseDto[]> {
    const doctors = await this.repository.findPendingDoctors();
    return doctors.map((d) => this.mapDoctor(d));
  }

  async getMyProfile(userId: string): Promise<DoctorProfileFullResponseDto> {
    const doctor = await this.repository.findProfileByUserId(userId);
    if (!doctor || doctor.isDeleted) {
      throw new NotFoundException('Doctor profile not found for authenticated user');
    }
    return this.mapDoctor(doctor);
  }

  async getDoctorById(id: string): Promise<DoctorProfileFullResponseDto> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found in Master Registry');
    }
    return this.mapDoctor(doctor);
  }

  async updateDoctor(
    id: string,
    dto: Partial<RegisterDoctorDto>,
    caller?: { userId: string; roles: string[] },
  ): Promise<DoctorProfileFullResponseDto> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    if (caller) {
      const isSuperAdmin = caller.roles?.includes('SUPER_ADMIN');
      const isAdmin = caller.roles?.includes('ADMIN');
      const isOwner = doctor.userId === caller.userId;

      if (!isSuperAdmin && !isAdmin && !isOwner) {
        throw new ForbiddenException('You are not authorized to update another doctor\'s profile');
      }

      if (!isSuperAdmin && !isAdmin) {
        if ((dto as any).clinicalPracticeType !== undefined) {
          throw new ForbiddenException(
            'Clinicians are strictly prohibited from altering their clinical practice type or authorization scope',
          );
        }
      }
    }

    const updated = await this.repository.updateDoctor(id, dto);

    await this.repository.createAuditLog({
      doctorProfileId: id,
      action: 'UPDATED',
      performedBy: caller?.userId,
      details: 'Updated master doctor profile details',
    });

    return this.mapDoctor(updated);
  }

  async softDeleteDoctor(id: string): Promise<{ message: string }> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    await this.repository.softDeleteDoctor(id);
    return { message: 'Doctor profile soft-deleted from active registry' };
  }

  // ─── Verification Workflow ───────────────────────────────────────────────

  async verifyDoctor(id: string, dto: DoctorActionDto, verifierUserId?: string): Promise<DoctorProfileFullResponseDto> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const prevStatus = doctor.verificationStatus;
    const updated = await this.repository.updateDoctor(id, {
      verificationStatus: 'VERIFIED',
      verificationNotes: dto.reason || 'Medical credentials verified by admin',
      verifiedBy: verifierUserId || 'ADMIN',
      verifiedAt: new Date(),
    });

    await this.repository.createHistory(id, {
      action: 'VERIFIED',
      previousStatus: prevStatus,
      newStatus: 'VERIFIED',
      reason: dto.reason || 'Credentials verified',
      performedBy: verifierUserId || 'ADMIN',
    });

    await this.repository.createAuditLog({
      doctorProfileId: id,
      action: 'VERIFIED',
      performedBy: verifierUserId,
      details: 'Doctor profile status set to VERIFIED',
    });

    return this.mapDoctor(updated);
  }

  async rejectDoctor(id: string, dto: DoctorActionDto, verifierUserId?: string): Promise<DoctorProfileFullResponseDto> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const prevStatus = doctor.verificationStatus;
    const note = dto.reason || dto.notes;
    const updated = await this.repository.updateDoctor(id, {
      verificationStatus: 'REJECTED',
      verificationNotes: note || 'Credentials verification rejected',
    });

    await this.repository.createHistory(id, {
      action: 'REJECTED',
      previousStatus: prevStatus,
      newStatus: 'REJECTED',
      reason: note || 'Verification rejected',
      performedBy: verifierUserId || 'ADMIN',
    });

    return this.mapDoctor(updated);
  }

  async suspendDoctor(id: string, dto: DoctorActionDto, adminUserId?: string): Promise<DoctorProfileFullResponseDto> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const prevStatus = doctor.verificationStatus;
    const note = dto.reason || dto.notes;
    const updated = await this.repository.updateDoctor(id, {
      verificationStatus: 'SUSPENDED',
      verificationNotes: note || 'Practice suspended',
    });

    await this.repository.createHistory(id, {
      action: 'SUSPENDED',
      previousStatus: prevStatus,
      newStatus: 'SUSPENDED',
      reason: note || 'Registration suspended',
      performedBy: adminUserId || 'ADMIN',
    });

    return this.mapDoctor(updated);
  }

  async restoreDoctor(
    id: string,
    dto: DoctorActionDto,
    caller?: { userId: string; roles?: string[] } | string,
  ): Promise<DoctorProfileFullResponseDto> {
    const callerUserId = typeof caller === 'string' ? caller : caller?.userId;
    const callerRoles = typeof caller === 'string' ? [] : (caller?.roles || []);

    const doctor = await this.repository.findDoctorById(id, true);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const isSuperAdmin = callerRoles.includes('SUPER_ADMIN');
    const isAdmin = callerRoles.includes('ADMIN');
    const isFacilityAdmin = callerRoles.includes('FACILITY_ADMIN');

    if (callerRoles.length > 0 && !isSuperAdmin && !isAdmin && isFacilityAdmin) {
      const adminFacilityIds = await this.repository.getUserFacilityIds(callerUserId || '');
      const doctorFacilityIds = await this.repository.getDoctorActiveFacilityIds(id);

      const hasSharedFacility =
        adminFacilityIds.length > 0 &&
        doctorFacilityIds.some((facId) => adminFacilityIds.includes(facId));

      if (!hasSharedFacility) {
        throw new ForbiddenException(
          'Facility administrators can only restore doctors affiliated with their facility',
        );
      }
    }

    const prevStatus = doctor.verificationStatus;
    const note = dto.reason || dto.notes;

    // Avoid direct transition to VERIFIED without checking whether credentials were ever verified
    const wasPreviouslyVerified = Boolean(doctor.verifiedAt && doctor.verifiedBy);
    const targetStatus = wasPreviouslyVerified ? 'VERIFIED' : 'PENDING';

    const updated = await this.repository.updateDoctor(id, {
      verificationStatus: targetStatus,
      isDeleted: false,
      deletedAt: null,
    });

    await this.repository.createHistory(id, {
      action: 'RESTORED',
      previousStatus: prevStatus,
      newStatus: targetStatus,
      reason:
        note ||
        (wasPreviouslyVerified
          ? 'Registration restored'
          : 'Registration restored to pending credential verification'),
      performedBy: callerUserId || 'ADMIN',
    });

    await this.repository.createAuditLog({
      doctorProfileId: id,
      action: 'RESTORED',
      performedBy: callerUserId,
      details: `Doctor registration restored to ${targetStatus}`,
    });

    return this.mapDoctor(updated);
  }

  async renewLicense(id: string, dto: RenewLicenseDto, adminUserId?: string): Promise<DoctorProfileFullResponseDto> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const prevExpiry = doctor.registrationExpiryDate;
    const updated = await this.repository.updateDoctor(id, {
      registrationExpiryDate: new Date(dto.newExpiryDate),
      verificationStatus: 'VERIFIED',
    });

    await this.repository.createHistory(id, {
      action: 'LICENSE_RENEWED',
      newStatus: 'VERIFIED',
      reason: dto.reason || `License extended to ${dto.newExpiryDate}`,
      performedBy: adminUserId || 'ADMIN',
    });

    return this.mapDoctor(updated);
  }

  // ─── Sub-entity Management (Qualifications & Documents) ────────────────────

  async addQualification(id: string, dto: AddQualificationDto): Promise<DoctorProfileFullResponseDto> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    await this.repository.addQualification(id, dto);
    const updated = await this.repository.findDoctorById(id);
    return this.mapDoctor(updated!);
  }

  async addCertification(id: string, dto: AddCertificationDto): Promise<DoctorProfileFullResponseDto> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    await this.repository.addCertification(id, dto);
    const updated = await this.repository.findDoctorById(id);
    return this.mapDoctor(updated!);
  }

  async addExperience(id: string, dto: AddExperienceDto): Promise<DoctorProfileFullResponseDto> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    await this.repository.addExperience(id, dto);
    const updated = await this.repository.findDoctorById(id);
    return this.mapDoctor(updated!);
  }

  async attachDocument(id: string, dto: AttachDoctorDocumentDto): Promise<DoctorDocumentResponseDto> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const doc = await this.repository.attachDocument(id, dto);

    await this.repository.createAuditLog({
      doctorProfileId: id,
      action: 'DOCUMENT_ATTACHED',
      details: `Attached ${dto.documentType} document using MedicalAttachment ${dto.medicalAttachmentId}`,
    });

    return {
      id: doc.id,
      documentType: doc.documentType,
      medicalAttachmentId: doc.medicalAttachmentId || undefined,
      verificationStatus: doc.verificationStatus,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  async getDocuments(id: string): Promise<DoctorDocumentResponseDto[]> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const docs = await this.repository.findDocumentsByDoctorId(id);
    return docs.map((d) => ({
      id: d.id,
      documentType: d.documentType,
      medicalAttachmentId: d.medicalAttachmentId || undefined,
      verificationStatus: d.verificationStatus,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async generateQr(userId: string, id: string): Promise<{ doctorId: string; qrToken: string }> {
    const doctor = await this.repository.findDoctorById(id);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const qr = await this.qrService.generateQr(userId, {
      entityId: id,
      entityType: QrEntityType.DOCTOR_ID,
    });

    return { doctorId: id, qrToken: qr.token };
  }

  async getHistory(id: string): Promise<DoctorHistoryItemDto[]> {
    const doctor = await this.repository.findDoctorById(id, true);
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const history = await this.repository.findHistoryByDoctorId(id);
    return history.map((h) => ({
      id: h.id,
      doctorProfileId: h.doctorProfileId,
      action: h.action,
      previousStatus: h.previousStatus || undefined,
      newStatus: h.newStatus,
      reason: h.reason || undefined,
      performedBy: h.performedBy || undefined,
      createdAt: h.createdAt.toISOString(),
    }));
  }

  // ─── Search & Statistics ──────────────────────────────────────────────────

  async searchDoctors(query: string): Promise<DoctorProfileFullResponseDto[]> {
    if (!query || query.trim().length === 0) return [];
    const doctors = await this.repository.searchDoctors(query.trim());
    return doctors.map((d) => this.mapDoctor(d));
  }

  async getStatistics(): Promise<DoctorStatsResponseDto> {
    return this.repository.getStatistics();
  }

  // ─── Legacy Method Hooks (Backward Compatibility) ──────────────────────────

  async getDoctorProfile(doctorId: string): Promise<DoctorProfileResponseDto> {
    const doctor = await this.repository.findDoctorById(doctorId);
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    return {
      id: doctor.id,
      fullName: doctor.fullName,
      specialization: doctor.primarySpecialization,
      credentials: doctor.medicalCouncil || 'MD',
    };
  }

  async getDoctorSlots(doctorId: string): Promise<ScheduleSlotResponseDto[]> {
    const doctor = await this.repository.findDoctorById(doctorId);
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }

    const slots = await this.repository.findSlotsByDoctorId(doctorId);
    return slots.map((s) => ({
      id: s.id,
      startTime: s.startTime,
      endTime: s.endTime,
      isBooked: s.isBooked,
    }));
  }

  // ─── Doctor Access to Patient Medical Records & Timeline ────────────────────

  private isPureVeterinarian(doctor: any): boolean {
    if (!doctor) return false;
    if (doctor.clinicalPracticeType === 'VETERINARY_MEDICINE') return true;
    if (doctor.clinicalPracticeType === 'HUMAN_HEALTHCARE') return false;

    const terms: string[] = [
      doctor.primarySpecialization,
      doctor.department,
      ...(doctor.secondarySpecializations || []),
      ...(doctor.subSpecializations || []),
    ].filter(Boolean).map((s: string) => String(s).toUpperCase());

    const hasVet = terms.some((t: string) =>
      t.includes('VET') || t.includes('VETERINAR') || t.includes('ANIMAL') || t.includes('ZOOLOGICAL'),
    );
    if (!hasVet) return false;

    const humanTerms = [
      'CARDIOLOGY', 'GENERAL MEDICINE', 'INTERNAL MEDICINE', 'PEDIATRICS',
      'SURGERY', 'DERMATOLOGY', 'NEUROLOGY', 'ORTHOPEDICS', 'ONCOLOGY',
    ];
    const hasHuman = terms.some((t: string) => humanTerms.some((h) => t.includes(h)));
    return hasVet && !hasHuman;
  }

  private async verifyDoctorPatientAccess(
    userId: string,
    patientProfileId: string,
    ipAddress?: string,
  ): Promise<{ doctor: any; patient: any; authSource: string; scopedRecordId?: string }> {
    const doctor = await this.repository.findProfileByUserId(userId);
    if (!doctor) {
      await this.repository.createSecurityAuditLog({
        userId,
        action: 'CLINICAL_ACCESS_DENIED',
        resource: 'PATIENT_MEDICAL_RECORDS',
        resourceId: patientProfileId,
        result: 'DENIED',
        details: 'User with DOCTOR role has no DoctorProfile record',
        ipAddress,
      });
      throw new NotFoundException('Doctor profile not found');
    }

    if (this.isPureVeterinarian(doctor)) {
      await this.repository.createSecurityAuditLog({
        userId,
        action: 'CLINICAL_ACCESS_DENIED',
        resource: 'PATIENT_MEDICAL_RECORDS',
        resourceId: patientProfileId,
        result: 'DENIED',
        details: `Veterinarian doctor ${doctor.id} attempted to access human patient clinical records`,
        ipAddress,
      });
      throw new ForbiddenException(
        'Access denied: Veterinarians are not authorized to access human patient clinical records',
      );
    }

    if (doctor.verificationStatus === 'SUSPENDED') {
      await this.repository.createSecurityAuditLog({
        userId,
        action: 'CLINICAL_ACCESS_DENIED',
        resource: 'PATIENT_MEDICAL_RECORDS',
        resourceId: patientProfileId,
        result: 'DENIED',
        details: `Suspended doctor ${doctor.id} attempted to access patient ${patientProfileId}`,
        ipAddress,
      });
      throw new ForbiddenException('Doctor registration is currently suspended');
    }

    if (doctor.verificationStatus === 'REJECTED') {
      await this.repository.createSecurityAuditLog({
        userId,
        action: 'CLINICAL_ACCESS_DENIED',
        resource: 'PATIENT_MEDICAL_RECORDS',
        resourceId: patientProfileId,
        result: 'DENIED',
        details: `Rejected doctor ${doctor.id} attempted to access patient ${patientProfileId}`,
        ipAddress,
      });
      throw new ForbiddenException('Doctor registration was rejected');
    }

    const activeFacilityIds = await this.repository.getDoctorActiveFacilityIds(doctor.id);
    if (!activeFacilityIds || activeFacilityIds.length === 0) {
      await this.repository.createSecurityAuditLog({
        userId,
        action: 'CLINICAL_ACCESS_DENIED',
        resource: 'PATIENT_MEDICAL_RECORDS',
        resourceId: patientProfileId,
        result: 'DENIED',
        details: `Doctor ${doctor.id} has no active facility affiliations`,
        ipAddress,
      });
      throw new ForbiddenException('Active healthcare facility affiliation is required to access patient records');
    }

    const patient = await this.repository.findPatientProfileById(patientProfileId);
    if (!patient) {
      await this.repository.createSecurityAuditLog({
        userId,
        action: 'CLINICAL_ACCESS_DENIED',
        resource: 'PATIENT_MEDICAL_RECORDS',
        resourceId: patientProfileId,
        result: 'DENIED',
        details: `Target patient not found for identifier: ${patientProfileId}`,
        ipAddress,
      });
      throw new NotFoundException(`Patient not found for identifier: ${patientProfileId}`);
    }

    const authResult = await this.repository.verifyDoctorPatientAccess(
      doctor.id,
      doctor.userId,
      patient.id,
      activeFacilityIds,
    );

    if (!authResult.isAuthorized) {
      await this.repository.createSecurityAuditLog({
        userId,
        action: 'CLINICAL_ACCESS_DENIED',
        resource: 'PATIENT_MEDICAL_RECORDS',
        resourceId: patient.id,
        result: 'DENIED',
        details: `Doctor ${doctor.fullName} (${doctor.id}) denied access to patient ${patient.id}: ${authResult.reason}`,
        ipAddress,
      });
      throw new ForbiddenException('Access denied: You do not have valid clinical authorization to access this patient\'s records');
    }

    return {
      doctor,
      patient,
      authSource: authResult.authSource || 'AUTHORIZED',
      scopedRecordId: authResult.scopeRecordId,
    };
  }

  async getPatientMedicalRecords(
    userId: string,
    patientProfileId: string,
    query: DoctorPatientRecordsQueryDto,
    ipAddress?: string,
  ): Promise<PaginatedResponseDto<MedicalRecordResponseDto>> {
    const { doctor, patient, authSource, scopedRecordId } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    const page = query.page || 1;
    const limit = query.limit || 20;
    const startDate = query.startDate ? new Date(query.startDate) : undefined;
    const endDate = query.endDate ? new Date(query.endDate) : undefined;

    const result = await this.repository.findPatientMedicalRecords(patient.id, {
      page,
      limit,
      status: query.status,
      startDate,
      endDate,
      includeArchived: query.includeArchived,
      scopedRecordId,
    });

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_PATIENT_RECORDS_VIEWED',
      performedBy: userId,
      details: `Doctor ${doctor.fullName} (${doctor.id}) retrieved medical records for patient ${patient.id} via ${authSource}`,
      ipAddress,
    });

    const mappedData = result.items.map((r) => this.mapMedicalRecord(r));

    return {
      data: mappedData,
      meta: buildPaginationMeta(result.total, page, limit),
    };
  }

  async getPatientTimeline(
    userId: string,
    patientProfileId: string,
    query: PaginationQueryDto,
    ipAddress?: string,
  ): Promise<PaginatedResponseDto<MedicalTimelineItemDto>> {
    const { doctor, patient, authSource, scopedRecordId } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    const page = query.page || 1;
    const limit = query.limit || 20;

    const result = await this.repository.getPatientTimeline(patient.id, {
      page,
      limit,
      scopedRecordId,
    });

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_PATIENT_TIMELINE_VIEWED',
      performedBy: userId,
      details: `Doctor ${doctor.fullName} (${doctor.id}) retrieved medical timeline for patient ${patient.id} via ${authSource}`,
      ipAddress,
    });

    const mappedItems: MedicalTimelineItemDto[] = result.items.map((item) => ({
      id: item.id,
      eventType: item.type || item.eventType || 'MEDICAL_RECORD',
      title: item.title,
      status: item.status || undefined,
      category: item.category || undefined,
      date: new Date(item.date).toISOString(),
      details: item.details || {},
    }));

    return {
      data: mappedItems,
      meta: buildPaginationMeta(result.total, page, limit),
    };
  }

  async createPatientEncounter(
    userId: string,
    patientProfileId: string,
    dto: CreateMedicalRecordDto,
    ipAddress?: string,
  ): Promise<MedicalRecordResponseDto> {
    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    // Calculate BMI if height and weight are provided
    if (dto.vitalSigns && dto.vitalSigns.heightCm && dto.vitalSigns.weightKg && dto.vitalSigns.heightCm > 0) {
      const heightM = dto.vitalSigns.heightCm / 100;
      (dto.vitalSigns as any).bmi = Math.round((dto.vitalSigns.weightKg / (heightM * heightM)) * 10) / 10;
    }

    // Default provider name if not explicitly set
    const encounterData = dto.encounter ? { ...dto.encounter } : {
      providerName: doctor.fullName,
      encounterType: 'CONSULTATION',
      encounterDate: new Date().toISOString(),
    };
    if (!encounterData.providerName) {
      encounterData.providerName = doctor.fullName;
    }

    const record = await this.repository.createMedicalRecord(patient.id, {
      ...dto,
      encounter: encounterData,
      createdById: doctor.userId,
    });

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_ENCOUNTER_CREATED',
      performedBy: userId,
      details: `Doctor ${doctor.fullName} (${doctor.id}) documented encounter for patient ${patient.id} via ${authSource}`,
      ipAddress,
      medicalRecordId: record.id,
    });

    return this.mapMedicalRecord(record);
  }

  async updatePatientMedicalRecord(
    userId: string,
    patientProfileId: string,
    recordId: string,
    dto: UpdateMedicalRecordDto,
    ipAddress?: string,
  ): Promise<MedicalRecordResponseDto> {
    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    const record = await this.repository.findMedicalRecordById(recordId);
    if (!record || record.patientProfileId !== patient.id) {
      throw new NotFoundException(`Medical record '${recordId}' not found for patient`);
    }

    if (record.status === 'ARCHIVED') {
      throw new BadRequestException('Archived medical records are immutable and cannot be updated');
    }

    // Verify authorship: doctor can only update records they authored
    if (record.createdById && record.createdById !== doctor.userId) {
      throw new ForbiddenException('You can only update clinical records that you authored');
    }

    const updated = await this.repository.updateMedicalRecord(recordId, dto);

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_RECORD_UPDATED',
      performedBy: userId,
      details: `Doctor ${doctor.fullName} (${doctor.id}) updated medical record ${recordId} via ${authSource}`,
      ipAddress,
      medicalRecordId: recordId,
    });

    return this.mapMedicalRecord(updated);
  }

  private mapMedicalRecord(r: any): MedicalRecordResponseDto {
    const toSafeIso = (d: any, fallback = new Date().toISOString()): string => {
      if (!d) return fallback;
      try {
        const parsed = d instanceof Date ? d : new Date(d);
        return isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
      } catch {
        return fallback;
      }
    };

    return {
      id: r.id,
      patientProfileId: r.patientProfileId,
      title: r.title,
      chiefComplaint: r.chiefComplaint || undefined,
      clinicalNotes: r.clinicalNotes || undefined,
      treatmentPlan: r.treatmentPlan || undefined,
      followUpInstructions: r.followUpInstructions || undefined,
      status: r.status,
      isDeleted: Boolean(r.isDeleted),
      deletedAt: r.deletedAt ? toSafeIso(r.deletedAt) : undefined,
      encounters: Array.isArray(r.encounters) ? r.encounters : [],
      diagnoses: Array.isArray(r.diagnoses) ? r.diagnoses : [],
      vitalSigns: Array.isArray(r.vitalSigns) ? r.vitalSigns : [],
      procedures: Array.isArray(r.procedures) ? r.procedures : [],
      attachments: (Array.isArray(r.attachments) ? r.attachments : []).map((a: any) => ({
        id: a.id,
        medicalRecordId: a.medicalRecordId || undefined,
        patientProfileId: a.patientProfileId,
        fileName: a.fileName,
        originalName: a.originalName,
        fileSize: a.fileSize !== null && a.fileSize !== undefined ? Number(a.fileSize) : 0,
        mimeType: a.mimeType,
        category: a.category,
        storageKey: '', // Suppressed for security credentials isolation
        storageUrl: a.storageUrl,
        checksum: a.checksum || undefined,
        version: a.version || 1,
        isDeleted: Boolean(a.isDeleted),
        virusScanStatus: a.virusScanStatus,
        createdAt: toSafeIso(a.createdAt),
        updatedAt: toSafeIso(a.updatedAt),
      })),
      createdAt: toSafeIso(r.createdAt),
      updatedAt: toSafeIso(r.updatedAt),
    };
  }

  // ─── Doctor Patient Management APIs ──────────────────────────────────────────

  async registerPatientByDoctor(
    userId: string,
    dto: DoctorRegisterPatientDto,
    ipAddress?: string,
  ): Promise<DoctorRegisterPatientResponseDto> {
    const doctor = await this.repository.findProfileByUserId(userId);
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }
    if (doctor.verificationStatus === 'SUSPENDED') {
      throw new ForbiddenException('Doctor registration is currently suspended');
    }
    if (doctor.verificationStatus === 'REJECTED') {
      throw new ForbiddenException('Doctor registration was rejected');
    }
    if (this.isPureVeterinarian(doctor)) {
      throw new ForbiddenException('Access denied: Veterinarians are not authorized to register human patients');
    }

    if (!dto.firstName || !dto.lastName || !dto.phone) {
      throw new BadRequestException('Patient first name, last name, and phone number are required');
    }

    const cleanPhone = dto.phone.trim();
    if (cleanPhone.length < 8) {
      throw new BadRequestException('Invalid patient phone number format');
    }

    const result = await this.repository.registerPatientByDoctor(doctor, dto);

    await this.repository.createSecurityAuditLog({
      userId,
      action: 'DOCTOR_REGISTERED_PATIENT',
      resource: 'PATIENT_PROFILE',
      resourceId: result.patientProfile.id,
      result: 'SUCCESS',
      details: `Doctor ${doctor.fullName} (${doctor.id}) initiated registration for patient ${result.patientProfile.firstName} ${result.patientProfile.lastName} [existing=${result.isExistingPatient}] from IP ${ipAddress || 'unknown'}`,
    });

    return result;
  }

  async getAuthorizedPatients(
    userId: string,
    query: DoctorPatientsQueryDto,
    ipAddress?: string,
  ): Promise<PaginatedResponseDto<DoctorPatientSummaryDto>> {
    const doctor = await this.repository.findProfileByUserId(userId);
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found');
    }
    if (doctor.verificationStatus === 'SUSPENDED') {
      throw new ForbiddenException('Doctor registration is currently suspended');
    }
    if (doctor.verificationStatus === 'REJECTED') {
      throw new ForbiddenException('Doctor registration was rejected');
    }
    if (this.isPureVeterinarian(doctor)) {
      throw new ForbiddenException('Access denied: Veterinarians are not authorized to access human patient clinical records');
    }

    const activeFacilityIds = await this.repository.getDoctorActiveFacilityIds(doctor.id);

    const safePage = Math.max(1, query.page || 1);
    const safeLimit = Math.min(Math.max(1, query.limit || 20), 100);

    const { items, total } = await this.repository.findAuthorizedPatients(
      doctor.id,
      doctor.userId,
      activeFacilityIds,
      query,
    );

    const mappedData: DoctorPatientSummaryDto[] = items.map((p: any) => {
      let dob: string | null = null;
      if (p.dateOfBirth) {
        const d = new Date(p.dateOfBirth);
        if (!isNaN(d.getTime())) {
          dob = d.toISOString().split('T')[0];
        }
      }

      let createdIso: string;
      if (p.createdAt) {
        const d = new Date(p.createdAt);
        createdIso = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
      } else {
        createdIso = new Date().toISOString();
      }

      let updatedIso: string;
      if (p.updatedAt) {
        const d = new Date(p.updatedAt);
        updatedIso = !isNaN(d.getTime()) ? d.toISOString() : new Date().toISOString();
      } else {
        updatedIso = new Date().toISOString();
      }

      return {
        id: p.id,
        userId: p.userId,
        patientNumber: p.user?.phone || p.id,
        firstName: p.firstName ?? null,
        lastName: p.lastName ?? null,
        dateOfBirth: dob,
        gender: p.gender ?? null,
        bloodGroup: p.bloodGroup ?? null,
        phone: p.user?.phone ?? null,
        email: p.user?.email ?? null,
        status: p.status || 'ACTIVE',
        photoUrl: p.photoUrl ?? null,
        authSource: p.authSource || 'AUTHORIZED',
        createdAt: createdIso,
        updatedAt: updatedIso,
      };
    });

    try {
      await this.repository.createSecurityAuditLog({
        userId,
        action: 'DOCTOR_PATIENTS_LIST_VIEWED',
        resource: 'PATIENTS',
        result: 'SUCCESS',
        details: `Doctor ${doctor.fullName} (${doctor.id}) viewed authorized patients list (total: ${total})`,
        ipAddress,
      });
    } catch (auditError) {
      this.logger.warn(`Non-blocking audit log creation failed: ${(auditError as Error)?.message}`);
    }

    return {
      data: mappedData,
      meta: buildPaginationMeta(total, safePage, safeLimit),
    };
  }

  async getPatientProfile(
    userId: string,
    patientProfileId: string,
    ipAddress?: string,
  ): Promise<DoctorPatientDetailDto> {
    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    const fullPatient = await this.repository.findPatientDetailsForDoctor(patient.id);
    if (!fullPatient) {
      throw new NotFoundException(`Patient details not found for ID: ${patientProfileId}`);
    }

    await this.repository.createSecurityAuditLog({
      userId,
      action: 'DOCTOR_PATIENT_PROFILE_VIEWED',
      resource: 'PATIENT_PROFILE',
      resourceId: fullPatient.id,
      result: 'SUCCESS',
      details: `Doctor ${doctor.fullName} (${doctor.id}) viewed patient profile for ${fullPatient.id} via ${authSource}`,
      ipAddress,
    });

    return {
      id: fullPatient.id,
      userId: fullPatient.userId,
      patientNumber: fullPatient.user?.phone || fullPatient.id,
      firstName: fullPatient.firstName ?? null,
      lastName: fullPatient.lastName ?? null,
      dateOfBirth: fullPatient.dateOfBirth ? new Date(fullPatient.dateOfBirth).toISOString().split('T')[0] : null,
      gender: fullPatient.gender ?? null,
      bloodGroup: fullPatient.bloodGroup ?? null,
      nationality: fullPatient.nationality ?? null,
      occupation: fullPatient.occupation ?? null,
      maritalStatus: fullPatient.maritalStatus ?? null,
      languages: fullPatient.languages || [],
      phone: fullPatient.user?.phone ?? null,
      email: fullPatient.user?.email ?? null,
      address: fullPatient.address ?? null,
      currentAddress: fullPatient.currentAddressLine1 || fullPatient.currentCity ? {
        line1: fullPatient.currentAddressLine1 ?? null,
        line2: fullPatient.currentAddressLine2 ?? null,
        city: fullPatient.currentCity ?? null,
        state: fullPatient.currentState ?? null,
        district: fullPatient.currentDistrict ?? null,
        postalCode: fullPatient.currentPostalCode ?? null,
        country: fullPatient.currentCountry ?? null,
      } : null,
      permanentAddress: fullPatient.permanentAddressLine1 || fullPatient.permanentCity ? {
        line1: fullPatient.permanentAddressLine1 ?? null,
        line2: fullPatient.permanentAddressLine2 ?? null,
        city: fullPatient.permanentCity ?? null,
        state: fullPatient.permanentState ?? null,
        postalCode: fullPatient.permanentPostalCode ?? null,
        country: fullPatient.permanentCountry ?? null,
      } : null,
      photoUrl: fullPatient.photoUrl ?? null,
      knownAllergies: fullPatient.knownAllergies || [],
      chronicConditions: fullPatient.chronicConditions || [],
      disabilities: fullPatient.disabilities || [],
      prefContactMethod: fullPatient.prefContactMethod ?? null,
      emergencyContact: fullPatient.emergencyContact ? {
        id: fullPatient.emergencyContact.id,
        name: fullPatient.emergencyContact.name,
        relationship: fullPatient.emergencyContact.relationship,
        phone: fullPatient.emergencyContact.phone,
      } : null,
      status: fullPatient.status || 'ACTIVE',
      authSource,
      createdAt: new Date(fullPatient.createdAt).toISOString(),
      updatedAt: new Date(fullPatient.updatedAt).toISOString(),
    };
  }

  async updatePatientClinicalAlerts(
    userId: string,
    patientProfileId: string,
    dto: { knownAllergies?: string[]; chronicConditions?: string[]; disabilities?: string[] },
    ipAddress?: string,
  ): Promise<DoctorPatientDetailDto> {
    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    await this.repository.updatePatientClinicalAlerts(patient.id, dto);

    await this.repository.createSecurityAuditLog({
      userId,
      action: 'DOCTOR_PATIENT_CLINICAL_ALERTS_UPDATED',
      resource: 'PATIENT_PROFILE',
      resourceId: patient.id,
      result: 'SUCCESS',
      details: `Doctor ${doctor.fullName} (${doctor.id}) updated clinical alerts (allergies: ${dto.knownAllergies?.join(', ') || 'none'}, chronic: ${dto.chronicConditions?.join(', ') || 'none'}) via ${authSource}`,
      ipAddress,
    });

    return this.getPatientProfile(userId, patient.id, ipAddress);
  }

  async getPatientPrescriptions(
    userId: string,
    patientProfileId: string,
    query: PaginationQueryDto,
    ipAddress?: string,
  ): Promise<PaginatedResponseDto<DoctorPrescriptionResponseDto>> {
    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    const safePage = Math.max(1, query.page || 1);
    const safeLimit = Math.min(Math.max(1, query.limit || 20), 100);

    const { items, total } = await this.repository.findPatientPrescriptions(patient.id, {
      page: safePage,
      limit: safeLimit,
    });

    const mappedData = items.map((r: any) => this.mapPrescription(r));

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_PATIENT_PRESCRIPTIONS_VIEWED',
      performedBy: userId,
      details: `Doctor ${doctor.fullName} (${doctor.id}) viewed prescriptions for patient ${patient.id} via ${authSource}`,
      ipAddress,
    });

    return {
      data: mappedData,
      meta: buildPaginationMeta(total, safePage, safeLimit),
    };
  }

  async createPatientPrescription(
    userId: string,
    patientProfileId: string,
    dto: CreateDoctorPrescriptionDto,
    ipAddress?: string,
  ): Promise<DoctorPrescriptionResponseDto> {
    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    if (!dto.medications || dto.medications.length === 0) {
      throw new BadRequestException('Prescription must include at least one medication item');
    }

    const created = await this.repository.createPatientPrescription(patient.id, doctor, dto);

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_PRESCRIPTION_CREATED',
      performedBy: userId,
      details: `Doctor ${doctor.fullName} (${doctor.id}) created prescription '${dto.title}' for patient ${patient.id} via ${authSource}`,
      ipAddress,
    });

    return this.mapPrescription(created);
  }

  async getPatientVitals(
    userId: string,
    patientProfileId: string,
    query: PaginationQueryDto,
    ipAddress?: string,
  ): Promise<PaginatedResponseDto<DoctorVitalSignsResponseDto>> {
    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    const safePage = Math.max(1, query.page || 1);
    const safeLimit = Math.min(Math.max(1, query.limit || 20), 100);

    const { items, total } = await this.repository.findPatientVitals(patient.id, {
      page: safePage,
      limit: safeLimit,
    });

    const mappedData = items.map((v: any) => this.mapVitalSigns(v));

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_PATIENT_VITALS_VIEWED',
      performedBy: userId,
      details: `Doctor ${doctor.fullName} (${doctor.id}) viewed vitals for patient ${patient.id} via ${authSource}`,
      ipAddress,
    });

    return {
      data: mappedData,
      meta: buildPaginationMeta(total, safePage, safeLimit),
    };
  }

  async createPatientVitals(
    userId: string,
    patientProfileId: string,
    dto: CreateDoctorVitalsDto,
    ipAddress?: string,
  ): Promise<DoctorVitalSignsResponseDto> {
    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    const hasAnyMetric =
      dto.heightCm !== undefined ||
      dto.weightKg !== undefined ||
      dto.systolicBp !== undefined ||
      dto.diastolicBp !== undefined ||
      dto.pulseBpm !== undefined ||
      dto.respirationRate !== undefined ||
      dto.temperatureC !== undefined ||
      dto.bloodSugarMgDl !== undefined ||
      dto.oxygenSaturation !== undefined;

    if (!hasAnyMetric) {
      throw new BadRequestException('At least one vital sign metric must be provided');
    }

    const created = await this.repository.createPatientVitals(patient.id, doctor, dto);

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_VITALS_RECORDED',
      performedBy: userId,
      details: `Doctor ${doctor.fullName} (${doctor.id}) recorded vitals for patient ${patient.id} via ${authSource}`,
      ipAddress,
    });

    return this.mapVitalSigns(created);
  }

  private parsePrescriptionNotes(rawNotes: string | null): {
    cleanNotes: string | null;
    medications: MedicationItemDto[];
    refills: PrescriptionRefillItemDto[];
    discontinuation: {
      isDiscontinued: boolean;
      discontinuedAt: string | null;
      discontinuedBy: string | null;
      discontinueReason: string | null;
    };
    pickupReminder: {
      enabled: boolean;
      hours: number;
      collected?: boolean;
      collectedAt?: string | null;
    };
  } {
    let medications: MedicationItemDto[] = [];
    let refills: PrescriptionRefillItemDto[] = [];
    let discontinuation = {
      isDiscontinued: false,
      discontinuedAt: null as string | null,
      discontinuedBy: null as string | null,
      discontinueReason: null as string | null,
    };
    let pickupReminder: {
      enabled: boolean;
      hours: number;
      collected?: boolean;
      collectedAt?: string | null;
    } = {
      enabled: false,
      hours: 2,
      collected: false,
      collectedAt: null,
    };

    if (!rawNotes) {
      return { cleanNotes: null, medications, refills, discontinuation, pickupReminder };
    }

    if (rawNotes.trim().startsWith('{') && rawNotes.trim().endsWith('}')) {
      try {
        const obj = JSON.parse(rawNotes.trim());
        if (Array.isArray(obj.medications)) medications = obj.medications;
        if (Array.isArray(obj.refills)) refills = obj.refills;
        if (obj.discontinuation) {
          discontinuation = {
            isDiscontinued: !!obj.discontinuation.isDiscontinued,
            discontinuedAt: obj.discontinuation.discontinuedAt || null,
            discontinuedBy: obj.discontinuation.discontinuedBy || null,
            discontinueReason: obj.discontinuation.discontinueReason || obj.discontinuation.reason || null,
          };
        }
        if (obj.pickupReminder) {
          const isCollected = !!obj.pickupReminder.collected;
          pickupReminder = {
            enabled: !!obj.pickupReminder.enabled && !isCollected,
            hours: obj.pickupReminder.hours || 2,
            collected: isCollected,
            collectedAt: obj.pickupReminder.collectedAt || null,
          };
        }
        return {
          cleanNotes: obj.userNotes || null,
          medications,
          refills,
          discontinuation,
          pickupReminder,
        };
      } catch {}
    }

    if (rawNotes.includes('[JSON_MEDICATIONS]:')) {
      try {
        const after = rawNotes.split('[JSON_MEDICATIONS]:')[1];
        const jsonStr = after.split(/\[JSON_REFILLS\]:|\[DISCONTINUED\]:/)[0].trim();
        medications = JSON.parse(jsonStr);
      } catch {
        medications = [];
      }
    }

    if (rawNotes.includes('[JSON_REFILLS]:')) {
      try {
        const after = rawNotes.split('[JSON_REFILLS]:')[1];
        const jsonStr = after.split(/\[JSON_MEDICATIONS\]:|\[DISCONTINUED\]:/)[0].trim();
        refills = JSON.parse(jsonStr);
      } catch {
        refills = [];
      }
    }

    if (rawNotes.includes('[DISCONTINUED]:')) {
      try {
        const after = rawNotes.split('[DISCONTINUED]:')[1];
        const jsonStr = after.split(/\[JSON_MEDICATIONS\]:|\[JSON_REFILLS\]:|\[PICKUP_REMINDER\]:/)[0].trim();
        const parsed = JSON.parse(jsonStr);
        discontinuation = {
          isDiscontinued: true,
          discontinuedAt: parsed.discontinuedAt || null,
          discontinuedBy: parsed.discontinuedBy || null,
          discontinueReason: parsed.reason || parsed.discontinueReason || null,
        };
      } catch {
        discontinuation.isDiscontinued = true;
      }
    }

    if (rawNotes.includes('[PICKUP_REMINDER]:')) {
      try {
        const after = rawNotes.split('[PICKUP_REMINDER]:')[1];
        const jsonStr = after.split(/\[JSON_MEDICATIONS\]:|\[JSON_REFILLS\]:|\[DISCONTINUED\]:/)[0].trim();
        const parsed = JSON.parse(jsonStr);
        const isCollected = !!parsed.collected;
        pickupReminder = {
          enabled: !!parsed.enabled && !isCollected,
          hours: parsed.hours || 2,
          collected: isCollected,
          collectedAt: parsed.collectedAt || null,
        };
      } catch {
        pickupReminder = { enabled: true, hours: 2, collected: false, collectedAt: null };
      }
    }

    const cleanNotes = rawNotes
      .split(/\[JSON_MEDICATIONS\]:|\[JSON_REFILLS\]:|\[DISCONTINUED\]:|\[PICKUP_REMINDER\]:/)[0]
      .trim();

    return {
      cleanNotes: cleanNotes || null,
      medications,
      refills,
      discontinuation,
      pickupReminder,
    };
  }

  private buildPrescriptionNotes(
    userNotes: string | null,
    medications: any[],
    refills: any[],
    discontinuation?: any,
    pickupReminder?: any,
  ): string {
    let result = (userNotes || '').trim();
    if (medications && medications.length > 0) {
      result += `\n[JSON_MEDICATIONS]:${JSON.stringify(medications)}`;
    }
    if (refills && refills.length > 0) {
      result += `\n[JSON_REFILLS]:${JSON.stringify(refills)}`;
    }
    if (discontinuation && discontinuation.isDiscontinued) {
      result += `\n[DISCONTINUED]:${JSON.stringify(discontinuation)}`;
    }
    if (pickupReminder) {
      result += `\n[PICKUP_REMINDER]:${JSON.stringify(pickupReminder)}`;
    }
    return result.trim();
  }

  private mapPrescription(r: any): DoctorPrescriptionResponseDto {
    const { cleanNotes, medications, discontinuation, pickupReminder } = this.parsePrescriptionNotes(r.notes);

    return {
      id: r.id,
      patientProfileId: r.patientProfileId,
      title: r.title,
      description: r.description ?? null,
      category: r.category || 'PRESCRIPTION',
      status: discontinuation.isDiscontinued ? 'DISCONTINUED' : r.status,
      reportDate: r.reportDate ? new Date(r.reportDate).toISOString() : null,
      prescribedBy: r.prescribedBy ?? null,
      doctorName: r.doctorName ?? null,
      providerName: r.providerName ?? null,
      facilityName: r.facilityName ?? null,
      medications,
      tags: r.tags || [],
      notes: cleanNotes,
      verificationStatus: r.verificationStatus,
      verifiedBy: r.verifiedBy ?? null,
      verifiedAt: r.verifiedAt ? new Date(r.verifiedAt).toISOString() : null,
      attachments: r.attachments || [],
      pickupReminderEnabled: pickupReminder?.enabled,
      pickupReminderHours: pickupReminder?.hours,
      collected: pickupReminder?.collected || false,
      collectedAt: pickupReminder?.collectedAt || null,
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
    };
  }

  private mapPrescriptionDetails(r: any): PrescriptionDetailDto {
    const { cleanNotes, medications, refills, discontinuation, pickupReminder } = this.parsePrescriptionNotes(r.notes);

    return {
      id: r.id,
      patientProfileId: r.patientProfileId,
      title: r.title,
      description: r.description ?? null,
      category: r.category || 'PRESCRIPTION',
      status: discontinuation.isDiscontinued ? 'DISCONTINUED' : r.status,
      reportDate: r.reportDate ? new Date(r.reportDate).toISOString() : null,
      prescribedBy: r.prescribedBy ?? null,
      doctorName: r.doctorName ?? null,
      providerName: r.providerName ?? null,
      facilityName: r.facilityName ?? null,
      medications,
      tags: r.tags || [],
      notes: cleanNotes,
      pickupReminderEnabled: pickupReminder?.enabled,
      pickupReminderHours: pickupReminder?.hours,
      collected: pickupReminder?.collected || false,
      collectedAt: pickupReminder?.collectedAt || null,
      verificationStatus: r.verificationStatus,
      verifiedBy: r.verifiedBy ?? null,
      verifiedAt: r.verifiedAt ? new Date(r.verifiedAt).toISOString() : null,
      attachments: r.attachments || [],
      createdAt: new Date(r.createdAt).toISOString(),
      updatedAt: new Date(r.updatedAt).toISOString(),
      refills,
      refillCount: refills.length,
      maxRefills: (r as any).maxRefills ?? null,
      isDiscontinued: discontinuation.isDiscontinued,
      discontinuedAt: discontinuation.discontinuedAt,
      discontinuedBy: discontinuation.discontinuedBy,
      discontinueReason: discontinuation.discontinueReason,
    };
  }

  async getPrescriptionDetails(
    userId: string,
    prescriptionId: string,
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<PrescriptionDetailDto> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(prescriptionId)) {
      throw new BadRequestException('Invalid prescription ID format. Must be a valid UUID.');
    }

    const prescription = await this.repository.findPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${prescriptionId} not found`);
    }

    const isDoctor = roles.includes('DOCTOR') || roles.includes('PRACTITIONER');
    const isAdmin = roles.includes('ADMIN') || roles.includes('STAFF') || roles.includes('SUPER_ADMIN');
    const isPatient = roles.includes('PATIENT');

    if (isDoctor) {
      if (prescription.verifiedBy !== userId) {
        await this.verifyDoctorPatientAccess(userId, prescription.patientProfileId, ipAddress);
      }
    } else if (isAdmin) {
      // Authorized administrative access
    } else if (isPatient) {
      if (
        prescription.patientProfile?.userId !== userId &&
        prescription.patientProfileId !== userId
      ) {
        throw new ForbiddenException('Access denied: You do not have permission to view this prescription');
      }
    } else {
      throw new ForbiddenException('Access denied: You do not have permission to view this prescription');
    }

    await this.repository.createMedicalRecordAuditLog({
      action: 'PRESCRIPTION_VIEWED',
      performedBy: userId,
      details: `User ${userId} viewed prescription ${prescriptionId}`,
      ipAddress,
    });

    return this.mapPrescriptionDetails(prescription);
  }

  async updatePrescription(
    userId: string,
    prescriptionId: string,
    dto: UpdatePrescriptionDto,
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<PrescriptionDetailDto> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(prescriptionId)) {
      throw new BadRequestException('Invalid prescription ID format. Must be a valid UUID.');
    }

    const prescription = await this.repository.findPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${prescriptionId} not found`);
    }

    if (prescription.status === 'DISCONTINUED') {
      throw new BadRequestException('Cannot update a discontinued prescription');
    }

    const { cleanNotes, medications, refills, discontinuation } = this.parsePrescriptionNotes(prescription.notes);
    if (discontinuation.isDiscontinued) {
      throw new BadRequestException('Cannot update a discontinued prescription');
    }

    if (prescription.verifiedBy !== userId) {
      await this.verifyDoctorPatientAccess(userId, prescription.patientProfileId, ipAddress);
    }

    const updatedMeds = dto.medications && dto.medications.length > 0 ? dto.medications : medications;
    const updatedUserNotes = dto.notes !== undefined ? dto.notes : cleanNotes;
    const newNotes = this.buildPrescriptionNotes(updatedUserNotes, updatedMeds, refills, discontinuation);

    const updateData: any = {
      notes: newNotes,
      updatedAt: new Date(),
    };
    if (dto.title) updateData.title = dto.title;
    if (dto.description) updateData.description = dto.description;
    if (dto.facilityName) updateData.facilityName = dto.facilityName;
    if (dto.medications && dto.medications.length > 0) {
      const tags = dto.medications.map((m) => m.name);
      if (dto.diagnosis) tags.push(dto.diagnosis);
      updateData.tags = tags;
    }

    const updated = await this.repository.updatePrescription(prescriptionId, updateData);

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_PRESCRIPTION_UPDATED',
      performedBy: userId,
      details: `Doctor ${userId} updated prescription ${prescriptionId}`,
      ipAddress,
    });

    return this.mapPrescriptionDetails(updated);
  }

  async refillPrescription(
    userId: string,
    prescriptionId: string,
    dto: PrescriptionRefillDto,
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<PrescriptionDetailDto> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(prescriptionId)) {
      throw new BadRequestException('Invalid prescription ID format. Must be a valid UUID.');
    }

    const prescription = await this.repository.findPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${prescriptionId} not found`);
    }

    if (prescription.status === 'DISCONTINUED') {
      throw new BadRequestException('Cannot refill a discontinued prescription');
    }

    const { cleanNotes, medications, refills, discontinuation } = this.parsePrescriptionNotes(prescription.notes);
    if (discontinuation.isDiscontinued) {
      throw new BadRequestException('Cannot refill a discontinued prescription');
    }

    const designatedMaxRefills = (prescription as any).maxRefills;
    if (typeof designatedMaxRefills === 'number' && refills.length >= designatedMaxRefills) {
      throw new BadRequestException(`Maximum refills (${designatedMaxRefills}) reached for this prescription`);
    }

    const isDoctor = roles.includes('DOCTOR') || roles.includes('PRACTITIONER');
    const isAdmin = roles.includes('ADMIN') || roles.includes('STAFF') || roles.includes('SUPER_ADMIN');
    const isPatient = roles.includes('PATIENT');

    if (isDoctor) {
      if (prescription.verifiedBy !== userId) {
        await this.verifyDoctorPatientAccess(userId, prescription.patientProfileId, ipAddress);
      }
    } else if (isAdmin) {
      // Authorized administrative access
    } else if (isPatient) {
      if (
        prescription.patientProfile?.userId !== userId &&
        prescription.patientProfileId !== userId
      ) {
        throw new ForbiddenException('Access denied: You do not have permission to refill this prescription');
      }
    } else {
      throw new ForbiddenException('Access denied: You do not have permission to refill this prescription');
    }

    const refillQty = dto?.quantity !== undefined && dto?.quantity !== null ? Number(dto.quantity) : 1;
    if (isNaN(refillQty) || refillQty <= 0) {
      throw new BadRequestException('Refill quantity must be a positive integer');
    }

    // Duplicate request protection (Idempotency / Anti-replay within 30 seconds)
    const thirtySecondsAgo = new Date(Date.now() - 30 * 1000).toISOString();
    const duplicate = refills.find(
      (r) =>
        r.refilledBy === userId &&
        r.quantity === refillQty &&
        r.refilledAt >= thirtySecondsAgo,
    );
    if (duplicate) {
      throw new ConflictException(
        `Duplicate refill request detected. Refill #${duplicate.refillNumber} was already recorded at ${duplicate.refilledAt}.`,
      );
    }

    let callerName: string | undefined;
    try {
      if (isDoctor) {
        const doc = await this.repository.findProfileByUserId(userId);
        if (doc) callerName = doc.fullName;
      } else if (isPatient) {
        const patProfile = prescription.patientProfile;
        const patUser = patProfile?.user;
        const fName = patProfile?.firstName || patUser?.firstName || '';
        const lName = patProfile?.lastName || patUser?.lastName || '';
        if (fName || lName) callerName = `${fName} ${lName}`.trim();
      }
    } catch {
      // ignore
    }

    const newRefill: PrescriptionRefillItemDto = {
      id: randomUUID(),
      refillNumber: refills.length + 1,
      refilledAt: new Date().toISOString(),
      refilledBy: userId,
      refilledByName: callerName || 'Authorized User',
      quantity: refillQty,
      notes: dto?.notes || 'Standard prescription refill authorized',
    };

    const updatedRefills = [...refills, newRefill];
    const newNotes = this.buildPrescriptionNotes(cleanNotes, medications, updatedRefills, discontinuation);

    const auditData = {
      action: 'PRESCRIPTION_REFILLED',
      performedBy: userId,
      details: `Prescription ${prescriptionId} refilled (Refill #${newRefill.refillNumber}, Qty: ${newRefill.quantity}) by user ${userId}`,
      ipAddress,
    };

    let updated: any;
    if (typeof this.repository.refillPrescriptionAtomic === 'function') {
      updated = await this.repository.refillPrescriptionAtomic(prescriptionId, newNotes, auditData);
    } else {
      updated = await this.repository.updatePrescription(prescriptionId, {
        notes: newNotes,
        updatedAt: new Date(),
      });
      try {
        await this.repository.createMedicalRecordAuditLog(auditData);
      } catch {}
    }

    return this.mapPrescriptionDetails(updated);
  }

  async discontinuePrescription(
    userId: string,
    prescriptionId: string,
    dto: DiscontinuePrescriptionDto,
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<PrescriptionDetailDto> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(prescriptionId)) {
      throw new BadRequestException('Invalid prescription ID format. Must be a valid UUID.');
    }

    if (!dto.reason || dto.reason.trim() === '') {
      throw new BadRequestException('Clinical reason is required to discontinue a prescription');
    }

    const prescription = await this.repository.findPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${prescriptionId} not found`);
    }

    if (prescription.status === 'DISCONTINUED') {
      throw new BadRequestException('Prescription is already discontinued');
    }

    const { cleanNotes, medications, refills, discontinuation } = this.parsePrescriptionNotes(prescription.notes);
    if (discontinuation.isDiscontinued) {
      throw new BadRequestException('Prescription is already discontinued');
    }

    if (prescription.verifiedBy !== userId) {
      await this.verifyDoctorPatientAccess(userId, prescription.patientProfileId, ipAddress);
    }

    const newDiscontinuation = {
      isDiscontinued: true,
      discontinuedAt: new Date().toISOString(),
      discontinuedBy: userId,
      discontinueReason: dto.reason,
      notes: dto.notes || null,
    };

    const newNotes = this.buildPrescriptionNotes(cleanNotes, medications, refills, newDiscontinuation);

    const updated = await this.repository.updatePrescription(prescriptionId, {
      notes: newNotes,
      updatedAt: new Date(),
    });

    await this.repository.createMedicalRecordAuditLog({
      action: 'PRESCRIPTION_DISCONTINUED',
      performedBy: userId,
      details: `Prescription ${prescriptionId} discontinued by doctor ${userId}. Reason: ${dto.reason}`,
      ipAddress,
    });

    return this.mapPrescriptionDetails(updated);
  }

  // ─── CR-08 Prescription Collection Lifecycle ───────────────────────────────

  async markPrescriptionCollected(
    userId: string,
    prescriptionId: string,
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<PrescriptionDetailDto> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(prescriptionId)) {
      throw new BadRequestException('Invalid prescription ID format. Must be a valid UUID.');
    }

    const prescription = await this.repository.findPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${prescriptionId} not found`);
    }

    const { cleanNotes, medications, refills, discontinuation, pickupReminder } = this.parsePrescriptionNotes(prescription.notes);

    const now = new Date().toISOString();
    const updatedPickupReminder = {
      enabled: false, // CR-08: Terminates further automated reminders
      hours: pickupReminder.hours || 2,
      collected: true,
      collectedAt: now,
    };

    const newNotes = this.buildPrescriptionNotes(
      cleanNotes,
      medications,
      refills,
      discontinuation,
      updatedPickupReminder,
    );

    const updated = await this.repository.updatePrescription(prescriptionId, {
      notes: newNotes,
      updatedAt: new Date(),
    });

    try {
      await this.repository.createMedicalRecordAuditLog({
        action: 'PRESCRIPTION_COLLECTED',
        performedBy: userId,
        details: `Prescription ${prescriptionId} marked as collected by user ${userId}. Automated pharmacy pickup reminders terminated.`,
        ipAddress,
      });
    } catch {}

    return this.mapPrescriptionDetails(updated);
  }

  async exportPrescription(
    userId: string,
    prescriptionId: string,
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<PrescriptionExportResponseDto> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(prescriptionId)) {
      throw new BadRequestException('Invalid prescription ID format. Must be a valid UUID.');
    }

    const prescription = await this.repository.findPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${prescriptionId} not found`);
    }

    const isDoctor = roles.includes('DOCTOR') || roles.includes('PRACTITIONER');
    const isAdmin = roles.includes('ADMIN') || roles.includes('STAFF') || roles.includes('SUPER_ADMIN');
    const isPatient = roles.includes('PATIENT');

    if (isDoctor) {
      if (prescription.verifiedBy !== userId) {
        await this.verifyDoctorPatientAccess(userId, prescription.patientProfileId, ipAddress);
      }
    } else if (isAdmin) {
      // Authorized administrative access
    } else if (isPatient) {
      if (
        prescription.patientProfile?.userId !== userId &&
        prescription.patientProfileId !== userId
      ) {
        throw new ForbiddenException('Access denied: You do not have permission to export this prescription');
      }
    } else {
      throw new ForbiddenException('Access denied: You do not have permission to export this prescription');
    }

    const { cleanNotes, medications, refills, discontinuation } = this.parsePrescriptionNotes(prescription.notes);

    const patProfile = prescription.patientProfile;
    const patUser = patProfile?.user;
    const fName = patProfile?.firstName || patUser?.firstName || '';
    const lName = patProfile?.lastName || patUser?.lastName || '';
    const patientFullName = (fName || lName) ? `${fName} ${lName}`.trim() : 'Patient';

    await this.repository.createMedicalRecordAuditLog({
      action: 'PRESCRIPTION_EXPORTED',
      performedBy: userId,
      details: `Prescription ${prescriptionId} exported by user ${userId}`,
      ipAddress,
    });

    return {
      prescriptionId: prescription.id,
      rxNumber: `RX-${prescription.id.substring(0, 8).toUpperCase()}`,
      issuedAt: prescription.reportDate
        ? new Date(prescription.reportDate).toISOString()
        : new Date(prescription.createdAt).toISOString(),
      patient: {
        id: prescription.patientProfile?.id,
        patientNumber: prescription.patientProfile?.patientNumber,
        fullName: patientFullName,
        phone: patUser?.phone || null,
        email: patUser?.email || null,
        gender: patProfile?.gender || null,
        dateOfBirth: patProfile?.dateOfBirth ? new Date(patProfile.dateOfBirth).toISOString() : null,
      },
      prescriber: {
        fullName: prescription.prescribedBy || prescription.doctorName || 'Attending Physician',
        specialization: prescription.providerName || 'General Practitioner',
        verifiedBy: prescription.verifiedBy,
      },
      facilityName: prescription.facilityName || 'CareID Health Facility',
      medications,
      instructions: cleanNotes,
      refillCount: refills.length,
      maxRefills: (prescription as any).maxRefills ?? null,
      status: discontinuation.isDiscontinued ? 'DISCONTINUED' : prescription.status,
      disclaimer: 'Clinically verified digital prescription generated by CareID. Valid with participating pharmacies and health networks.',
    };
  }

  async exportPrescriptionPdf(
    userId: string,
    prescriptionId: string,
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<Buffer> {
    const data = await this.exportPrescription(userId, prescriptionId, roles, ipAddress);
    return ClinicalPdfBuilder.generatePrescriptionPdf(data);
  }

  async getPrescriptionRefills(
    userId: string,
    prescriptionId: string,
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<{ prescriptionId: string; refillCount: number; maxRefills?: number | null; refills: PrescriptionRefillItemDto[] }> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(prescriptionId)) {
      throw new BadRequestException('Invalid prescription ID format. Must be a valid UUID.');
    }

    const prescription = await this.repository.findPrescriptionById(prescriptionId);
    if (!prescription) {
      throw new NotFoundException(`Prescription with ID ${prescriptionId} not found`);
    }

    const isDoctor = roles.includes('DOCTOR') || roles.includes('PRACTITIONER');
    const isAdmin = roles.includes('ADMIN') || roles.includes('STAFF') || roles.includes('SUPER_ADMIN');
    const isPatient = roles.includes('PATIENT');

    if (isDoctor) {
      if (prescription.verifiedBy !== userId) {
        await this.verifyDoctorPatientAccess(userId, prescription.patientProfileId, ipAddress);
      }
    } else if (isAdmin) {
      // Admin access granted
    } else if (isPatient) {
      if (
        prescription.patientProfile?.userId !== userId &&
        prescription.patientProfileId !== userId
      ) {
        throw new ForbiddenException('Access denied');
      }
    } else {
      throw new ForbiddenException('Access denied');
    }

    const { refills } = this.parsePrescriptionNotes(prescription.notes);
    return {
      prescriptionId: prescription.id,
      refillCount: refills.length,
      maxRefills: (prescription as any).maxRefills ?? null,
      refills,
    };
  }

  async getPatientAdmissions(
    userId: string,
    patientProfileId: string,
    query: PaginationQueryDto,
    ipAddress?: string,
  ): Promise<PaginatedResponseDto<HospitalAdmissionResponseDto>> {
    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    const safePage = Math.max(1, query.page || 1);
    const safeLimit = Math.min(Math.max(1, query.limit || 20), 100);

    const { items, total } = await this.repository.findPatientAdmissions(patient.id, {
      page: safePage,
      limit: safeLimit,
    });

    const mappedData: HospitalAdmissionResponseDto[] = items.map((enc: any) => ({
      id: enc.id,
      medicalRecordId: enc.medicalRecordId,
      patientProfileId: enc.medicalRecord?.patientProfileId || patient.id,
      title: enc.medicalRecord?.title || 'Hospital Admission',
      encounterType: enc.encounterType,
      encounterDate: new Date(enc.encounterDate).toISOString(),
      facilityName: enc.facilityName ?? null,
      providerName: enc.providerName ?? null,
      chiefComplaint: enc.medicalRecord?.chiefComplaint ?? null,
      clinicalNotes: enc.medicalRecord?.clinicalNotes ?? null,
      treatmentPlan: enc.medicalRecord?.treatmentPlan ?? null,
      status: enc.medicalRecord?.status || 'FINAL',
      diagnoses: enc.medicalRecord?.diagnoses || [],
      createdAt: new Date(enc.createdAt).toISOString(),
      updatedAt: new Date(enc.updatedAt).toISOString(),
    }));

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_PATIENT_ADMISSIONS_VIEWED',
      performedBy: userId,
      details: `Doctor ${doctor.fullName} (${doctor.id}) viewed admissions for patient ${patient.id} via ${authSource}`,
      ipAddress,
    });

    return {
      data: mappedData,
      meta: buildPaginationMeta(total, safePage, safeLimit),
    };
  }

  async createPatientAdmission(
    userId: string,
    patientProfileId: string,
    dto: CreateHospitalAdmissionDto,
    ipAddress?: string,
  ): Promise<HospitalAdmissionResponseDto> {
    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    if (!dto.reasonForAdmission && !dto.admittingDiagnosis && !dto.title) {
      throw new BadRequestException('Admission must specify a reason, admitting diagnosis, or title');
    }

    const admDate = dto.admissionDate ? new Date(dto.admissionDate) : new Date();
    if (isNaN(admDate.getTime())) {
      throw new BadRequestException('Invalid admission date format');
    }
    if (dto.dischargeDate) {
      const disDate = new Date(dto.dischargeDate);
      if (isNaN(disDate.getTime())) {
        throw new BadRequestException('Invalid discharge date format');
      }
      if (disDate < admDate) {
        throw new BadRequestException('Discharge date cannot be earlier than admission date');
      }
    }

    const created = await this.repository.createPatientAdmission(patient.id, doctor, dto);

    await this.repository.createMedicalRecordAuditLog({
      action: 'DOCTOR_ADMISSION_CREATED',
      performedBy: userId,
      details: `Doctor ${doctor.fullName} (${doctor.id}) recorded admission for patient ${patient.id} via ${authSource}`,
      ipAddress,
    });

    return {
      id: created.id,
      medicalRecordId: created.medicalRecordId,
      patientProfileId: created.medicalRecord?.patientProfileId || patient.id,
      title: created.medicalRecord?.title || 'Hospital Admission',
      encounterType: created.encounterType,
      encounterDate: new Date(created.encounterDate).toISOString(),
      facilityName: created.facilityName ?? null,
      providerName: created.providerName ?? null,
      chiefComplaint: created.medicalRecord?.chiefComplaint ?? null,
      clinicalNotes: created.medicalRecord?.clinicalNotes ?? null,
      treatmentPlan: created.medicalRecord?.treatmentPlan ?? null,
      status: created.medicalRecord?.status || 'FINAL',
      diagnoses: created.medicalRecord?.diagnoses || [],
      createdAt: new Date(created.createdAt).toISOString(),
      updatedAt: new Date(created.updatedAt).toISOString(),
    };
  }

  private mapVitalSigns(v: any): DoctorVitalSignsResponseDto {
    const bp =
      v.systolicBp && v.diastolicBp ? `${v.systolicBp}/${v.diastolicBp} mmHg` : null;

    return {
      id: v.id,
      medicalRecordId: v.medicalRecordId,
      heightCm: v.heightCm ?? null,
      weightKg: v.weightKg ?? null,
      bmi: v.bmi ?? null,
      systolicBp: v.systolicBp ?? null,
      diastolicBp: v.diastolicBp ?? null,
      bloodPressure: bp,
      pulseBpm: v.pulseBpm ?? null,
      respirationRate: v.respirationRate ?? null,
      temperatureC: v.temperatureC ?? null,
      bloodSugarMgDl: v.bloodSugarMgDl ?? null,
      oxygenSaturation: v.oxygenSaturation ?? null,
      recordedAt: new Date(v.recordedAt).toISOString(),
      recordedBy: v.medicalRecord?.createdById
        ? { id: v.medicalRecord.createdById }
        : null,
    };
  }

  async exportPatientMedicalRecords(
    userId: string,
    patientProfileId: string,
    format: string = 'JSON',
    roles: string[] = [],
    ipAddress?: string,
  ): Promise<{ format: string; buffer?: Buffer; data?: any }> {
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_REGEX.test(patientProfileId)) {
      throw new BadRequestException('Invalid patient profile ID format. Must be a valid UUID.');
    }

    const { doctor, patient, authSource } = await this.verifyDoctorPatientAccess(
      userId,
      patientProfileId,
      ipAddress,
    );

    const [prescriptionsRes, recordsRes, timelineRes, admissionsRes] = await Promise.all([
      this.repository.findPatientPrescriptions(patient.id, { page: 1, limit: 50 }),
      this.repository.findPatientMedicalRecords(patient.id, { page: 1, limit: 50 }),
      this.repository.getPatientTimeline(patient.id, { page: 1, limit: 50 }),
      this.repository.findPatientAdmissions(patient.id, { page: 1, limit: 50 }),
    ]);

    const mappedPrescriptions = (prescriptionsRes?.items || []).map((p: any) => this.mapPrescription(p));
    const mappedRecords = (recordsRes?.items || []).map((r: any) => ({
      id: r.id,
      title: r.title,
      encounterDate: r.encounterDate,
      chiefComplaint: r.chiefComplaint,
      clinicalNotes: r.clinicalNotes,
      treatmentPlan: r.treatmentPlan,
      status: r.status,
      diagnoses: r.diagnoses || [],
    }));
    const mappedAdmissions = (admissionsRes?.items || []).map((a: any) => ({
      id: a.id,
      encounterDate: a.encounterDate,
      facilityName: a.facilityName,
      chiefComplaint: a.medicalRecord?.chiefComplaint,
      status: a.medicalRecord?.status,
    }));

    await this.repository.createMedicalRecordAuditLog({
      action: 'CLINICAL_EXPORT_GENERATED',
      performedBy: userId,
      details: `Unified clinical record exported (Format: ${format.toUpperCase()}) for patient ${patient.id} by doctor ${doctor.fullName} via ${authSource}`,
      ipAddress,
    });

    const isPdf = format.toUpperCase() === 'PDF';
    if (isPdf) {
      const buffer = ClinicalPdfBuilder.generateUnifiedClinicalRecordPdf({
        patient,
        doctor,
        prescriptions: mappedPrescriptions,
        medicalRecords: mappedRecords,
        timeline: timelineRes?.items || [],
        admissions: mappedAdmissions,
      });
      return { format: 'PDF', buffer };
    }

    return {
      format: 'JSON',
      data: {
        exportedAt: new Date().toISOString(),
        patient: {
          id: patient.id,
          patientNumber: patient.patientNumber,
          fullName: patient.user ? `${patient.user.firstName || ''} ${patient.user.lastName || ''}`.trim() : patient.fullName,
          dateOfBirth: patient.user?.dateOfBirth || patient.dateOfBirth,
          gender: patient.user?.gender || patient.gender,
          phone: patient.user?.phone || patient.phone,
          email: patient.user?.email || patient.email,
        },
        clinician: {
          id: doctor.id,
          fullName: doctor.fullName,
          specialization: doctor.primarySpecialization,
        },
        prescriptions: mappedPrescriptions,
        medicalRecords: mappedRecords,
        timeline: timelineRes?.items || [],
        admissions: mappedAdmissions,
      },
    };
  }

  // ─── Specialties Catalogue Management ─────────────────────────────────────

  async getActiveClinicalPracticeTypes(): Promise<any[]> {
    const db = (this.repository as any).db;
    if (db?.clinicalPracticeType) {
      return db.clinicalPracticeType.findMany({
        where: {
          isDeleted: false,
          status: 'ACTIVE',
        },
        orderBy: [{ sortOrder: 'asc' }, { displayName: 'asc' }],
      });
    }
    return [];
  }

  async getSpecialties(activeOnly = true, search?: string, practiceType?: string): Promise<any[]> {
    if (this.repository.getSpecialties) {
      return this.repository.getSpecialties(activeOnly, search, practiceType);
    }
    return [];
  }

  async addSpecialty(name: string, description?: string, callerUserId?: string): Promise<any> {
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new BadRequestException('Specialty name must be at least 2 characters');
    }
    if (this.repository.addSpecialty) {
      return this.repository.addSpecialty(name, description);
    }
    throw new BadRequestException('Specialties catalogue repository not configured');
  }

  async updateSpecialty(id: string, data: any, callerUserId?: string): Promise<any> {
    if (this.repository.updateSpecialty) {
      return this.repository.updateSpecialty(id, data);
    }
    throw new BadRequestException('Specialties catalogue repository not configured');
  }

  async deleteSpecialty(id: string, callerUserId?: string): Promise<any> {
    if (this.repository.deleteSpecialty) {
      return this.repository.deleteSpecialty(id);
    }
    throw new BadRequestException('Specialties catalogue repository not configured');
  }

  // ─── Doctor Photo Upload & Serving ────────────────────────────────────────

  async uploadDoctorPhoto(
    doctorId: string,
    callerUserId: string,
    roles: string[] = [],
    file?: any,
  ): Promise<any> {
    const doctor = await this.repository.findDoctorById(doctorId);
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found in Master Registry');
    }

    const isSuperAdmin = roles.includes('SUPER_ADMIN');
    const isAdmin = roles.includes('ADMIN');
    const isOwner = doctor.userId === callerUserId;

    if (!isSuperAdmin && !isAdmin && !isOwner) {
      throw new ForbiddenException('You are not authorized to upload photo for another doctor');
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('Image file is required');
    }

    if (file.size > 2 * 1024 * 1024) {
      throw new BadRequestException(`Profile photo size exceeds maximum limit of 2MB (${file.size} bytes provided)`);
    }

    const mime = (file.mimetype || '').toLowerCase();
    if (!['image/jpeg', 'image/png'].includes(mime)) {
      throw new BadRequestException('Only JPG and PNG image files are supported');
    }

    const detectedExt = validateImageBuffer(file.buffer);
    if (!['jpg', 'jpeg', 'png'].includes(detectedExt.toLowerCase())) {
      throw new BadRequestException('Invalid image buffer: must be a genuine JPEG or PNG image');
    }

    const safeExt = detectedExt.toLowerCase() === 'png' ? 'png' : 'jpg';
    const safeFilename = `doctor-${doctor.id}-${Date.now()}.${safeExt}`;
    const uploadDir = path.join(process.cwd(), 'data', 'uploads', 'photos');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const targetDiskPath = path.join(uploadDir, safeFilename);
    fs.writeFileSync(targetDiskPath, file.buffer);

    const photoUrl = `/api/v1/doctors/photo/file/${safeFilename}`;

    const updated = await this.repository.updateDoctor(doctor.id, {
      profilePhotoUrl: photoUrl,
    });

    await this.repository.createAuditLog({
      doctorProfileId: doctor.id,
      action: 'PHOTO_UPLOADED',
      performedBy: callerUserId,
      details: `Doctor profile photo uploaded (${safeFilename})`,
    });

    return {
      success: true,
      photoUrl,
      doctor: this.mapDoctor(updated),
    };
  }

  async serveDoctorPhotoFile(filename: string, res: any): Promise<void> {
    if (!filename || !/^doctor-[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
      throw new BadRequestException('Invalid filename format or disallowed extension');
    }

    const cleanFilename = path.basename(filename);
    const filePath = path.join(process.cwd(), 'data', 'uploads', 'photos', cleanFilename);

    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('Profile photo file not found');
    }

    const ext = path.extname(cleanFilename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    const contentType = mimeTypes[ext] || 'image/jpeg';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Accept-Ranges', 'bytes');

    fs.createReadStream(filePath).pipe(res);
  }
}
