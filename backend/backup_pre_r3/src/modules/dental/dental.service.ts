import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { DentalRepository } from './dental.repository';
import { CreateDentalRecordDto, UpdateDentalRecordDto, DentalRecordResponseDto } from './dto/dental.dto';

@Injectable()
export class DentalService {
  constructor(private readonly repo: DentalRepository) {}

  private mapDto(r: any): DentalRecordResponseDto {
    return {
      id: r.id,
      patientProfileId: r.patientProfileId,
      doctorId: r.doctorId,
      toothNumber: r.toothNumber || undefined,
      toothSurface: r.toothSurface || undefined,
      procedureName: r.procedureName,
      procedureCode: r.procedureCode || undefined,
      clinicalFindings: r.clinicalFindings || undefined,
      treatmentDate: r.treatmentDate instanceof Date ? r.treatmentDate.toISOString() : new Date(r.treatmentDate).toISOString(),
      followUpDate: r.followUpDate ? (r.followUpDate instanceof Date ? r.followUpDate.toISOString() : new Date(r.followUpDate).toISOString()) : undefined,
      status: r.status,
      isArchived: r.isArchived,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : new Date(r.createdAt).toISOString(),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : new Date(r.updatedAt).toISOString(),
      attachments: (r.attachments || []).map((att: any) => ({
        id: att.id,
        fileName: att.fileName,
        originalName: att.originalName,
        fileSize: att.fileSize,
        mimeType: att.mimeType,
        category: att.category,
        storageUrl: att.storageUrl,
      })),
    };
  }

  async createForPatient(
    userId: string,
    patientProfileId: string,
    dto: CreateDentalRecordDto,
    roles: string[] = [],
  ): Promise<DentalRecordResponseDto> {
    const isDoctor = roles.includes('DOCTOR') || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
    if (!isDoctor) {
      throw new ForbiddenException('Only clinicians may author dental treatment records');
    }

    const patient = await this.repo.findPatientProfile(patientProfileId);
    if (!patient) {
      throw new NotFoundException(`Patient profile '${patientProfileId}' not found`);
    }

    let doctorId = userId;
    const docProfile = await this.repo.findDoctorProfileByUserId(userId);
    if (docProfile) {
      doctorId = docProfile.id;
    }

    const created = await this.repo.create({
      patientProfileId: patient.id,
      doctorId,
      toothNumber: dto.toothNumber,
      toothSurface: dto.toothSurface,
      procedureName: dto.procedureName,
      procedureCode: dto.procedureCode,
      clinicalFindings: dto.clinicalFindings,
      treatmentDate: dto.treatmentDate ? new Date(dto.treatmentDate) : new Date(),
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      status: dto.status || 'COMPLETED',
    });

    return this.mapDto(created);
  }

  async getPatientDentalRecords(
    userId: string,
    patientProfileId: string,
    roles: string[] = [],
    includeArchived = false,
  ): Promise<DentalRecordResponseDto[]> {
    const patient = await this.repo.findPatientProfile(patientProfileId);
    if (!patient) {
      throw new NotFoundException(`Patient profile '${patientProfileId}' not found`);
    }

    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized && patient.userId !== userId) {
      throw new ForbiddenException('You do not have access to this patient dental timeline');
    }

    const list = await this.repo.findByPatient(patient.id, includeArchived);
    return list.map((item) => this.mapDto(item));
  }

  async getById(id: string, userId: string, roles: string[] = []): Promise<DentalRecordResponseDto> {
    const rec = await this.repo.findById(id);
    if (!rec) {
      throw new NotFoundException(`Dental record '${id}' not found`);
    }

    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized) {
      const patient = await this.repo.findPatientProfile(rec.patientProfileId);
      if (!patient || patient.userId !== userId) {
        throw new ForbiddenException('Access to dental record denied');
      }
    }

    return this.mapDto(rec);
  }

  async update(id: string, dto: UpdateDentalRecordDto, userId: string, roles: string[] = []): Promise<DentalRecordResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Dental record '${id}' not found`);
    }
    if (existing.isArchived) {
      throw new BadRequestException('Archived dental records cannot be modified. Restore record first.');
    }

    const updated = await this.repo.update(id, {
      ...(dto.toothNumber !== undefined ? { toothNumber: dto.toothNumber } : {}),
      ...(dto.toothSurface !== undefined ? { toothSurface: dto.toothSurface } : {}),
      ...(dto.procedureName !== undefined ? { procedureName: dto.procedureName } : {}),
      ...(dto.procedureCode !== undefined ? { procedureCode: dto.procedureCode } : {}),
      ...(dto.clinicalFindings !== undefined ? { clinicalFindings: dto.clinicalFindings } : {}),
      ...(dto.followUpDate !== undefined ? { followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    return this.mapDto(updated);
  }

  async setArchiveStatus(id: string, isArchived: boolean, userId: string, roles: string[] = []): Promise<DentalRecordResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Dental record '${id}' not found`);
    }

    const updated = await this.repo.setArchived(id, isArchived);
    return this.mapDto(updated);
  }
}

