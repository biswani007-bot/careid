import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { LaboratoryRepository } from './laboratory.repository';
import {
  CreateLaboratoryReportDto,
  UpdateLaboratoryReportDto,
  LaboratoryReportResponseDto,
  LaboratoryTestItemResponseDto,
} from './dto/laboratory.dto';

@Injectable()
export class LaboratoryService {
  constructor(private readonly repo: LaboratoryRepository) {}

  private mapDto(r: any): LaboratoryReportResponseDto {
    return {
      id: r.id,
      patientProfileId: r.patientProfileId,
      doctorId: r.doctorId || undefined,
      laboratoryName: r.laboratoryName,
      specimenType: r.specimenType || undefined,
      collectedDate: r.collectedDate instanceof Date ? r.collectedDate.toISOString() : new Date(r.collectedDate).toISOString(),
      reportedDate: r.reportedDate instanceof Date ? r.reportedDate.toISOString() : new Date(r.reportedDate).toISOString(),
      status: r.status,
      overallNotes: r.overallNotes || undefined,
      attachmentId: r.attachmentId || undefined,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : new Date(r.updatedAt).toISOString(),
      testItems: (r.testItems || []).map((ti: any): LaboratoryTestItemResponseDto => ({
        id: ti.id,
        reportId: ti.reportId,
        testName: ti.testName,
        testCategory: ti.testCategory || undefined,
        numericValue: ti.numericValue !== null ? Number(ti.numericValue) : undefined,
        textValue: ti.textValue || undefined,
        unit: ti.unit || undefined,
        referenceRange: ti.referenceRange,
        referenceLow: ti.referenceLow !== null ? Number(ti.referenceLow) : undefined,
        referenceHigh: ti.referenceHigh !== null ? Number(ti.referenceHigh) : undefined,
        flag: ti.flag,
        status: ti.status,
      })),
      attachment: r.attachment
        ? {
            id: r.attachment.id,
            fileName: r.attachment.fileName,
            originalName: r.attachment.originalName,
            fileSize: r.attachment.fileSize,
            mimeType: r.attachment.mimeType,
            storageUrl: r.attachment.storageUrl,
          }
        : undefined,
    };
  }

  async createForPatient(
    userId: string,
    patientProfileId: string,
    dto: CreateLaboratoryReportDto,
    roles: string[] = [],
  ): Promise<LaboratoryReportResponseDto> {
    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'PRACTITIONER', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized) {
      throw new ForbiddenException('Only healthcare professionals or lab staff may record laboratory results');
    }

    const patient = await this.repo.findPatientProfile(patientProfileId);
    if (!patient) {
      throw new NotFoundException(`Patient profile '${patientProfileId}' not found`);
    }

    if (!dto.testItems || dto.testItems.length === 0) {
      throw new BadRequestException('A structured laboratory report must contain at least one discrete test item');
    }

    let doctorId: string | undefined = undefined;
    const docProfile = await this.repo.findDoctorProfileByUserId(userId);
    if (docProfile) {
      doctorId = docProfile.id;
    }

    const created = await this.repo.createReport({
      patientProfileId: patient.id,
      doctorId,
      laboratoryName: dto.laboratoryName,
      specimenType: dto.specimenType,
      collectedDate: dto.collectedDate ? new Date(dto.collectedDate) : new Date(),
      reportedDate: dto.reportedDate ? new Date(dto.reportedDate) : new Date(),
      status: dto.status || 'FINAL',
      overallNotes: dto.overallNotes,
      attachmentId: dto.attachmentId,
      testItems: dto.testItems,
    });

    return this.mapDto(created);
  }

  async getPatientLabResults(
    userId: string,
    patientProfileId: string,
    roles: string[] = [],
  ): Promise<LaboratoryReportResponseDto[]> {
    const patient = await this.repo.findPatientProfile(patientProfileId);
    if (!patient) {
      throw new NotFoundException(`Patient profile '${patientProfileId}' not found`);
    }

    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized && patient.userId !== userId) {
      throw new ForbiddenException('Access to patient laboratory results denied');
    }

    const list = await this.repo.findReportsByPatient(patient.id);
    return list.map((item) => this.mapDto(item));
  }

  async getById(id: string, userId: string, roles: string[] = []): Promise<LaboratoryReportResponseDto> {
    const report = await this.repo.findReportById(id);
    if (!report) {
      throw new NotFoundException(`Laboratory report '${id}' not found`);
    }

    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized) {
      const patient = await this.repo.findPatientProfile(report.patientProfileId);
      if (!patient || patient.userId !== userId) {
        throw new ForbiddenException('Access to laboratory report denied');
      }
    }

    return this.mapDto(report);
  }

  async update(id: string, dto: UpdateLaboratoryReportDto, userId: string, roles: string[] = []): Promise<LaboratoryReportResponseDto> {
    const existing = await this.repo.findReportById(id);
    if (!existing) {
      throw new NotFoundException(`Laboratory report '${id}' not found`);
    }

    const updated = await this.repo.updateReport(id, {
      ...(dto.laboratoryName !== undefined ? { laboratoryName: dto.laboratoryName } : {}),
      ...(dto.specimenType !== undefined ? { specimenType: dto.specimenType } : {}),
      ...(dto.overallNotes !== undefined ? { overallNotes: dto.overallNotes } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    return this.mapDto(updated);
  }
}

