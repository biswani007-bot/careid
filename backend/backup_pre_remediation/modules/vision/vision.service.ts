import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { VisionRepository } from './vision.repository';
import { CreateVisionRecordDto, UpdateVisionRecordDto, VisionRecordResponseDto } from './dto/vision.dto';

@Injectable()
export class VisionService {
  constructor(private readonly repo: VisionRepository) {}

  private mapDto(r: any): VisionRecordResponseDto {
    return {
      id: r.id,
      patientProfileId: r.patientProfileId,
      doctorId: r.doctorId,
      examinationDate: r.examinationDate instanceof Date ? r.examinationDate.toISOString() : new Date(r.examinationDate).toISOString(),
      odSphere: r.odSphere ?? undefined,
      odCylinder: r.odCylinder ?? undefined,
      odAxis: r.odAxis ?? undefined,
      odAddition: r.odAddition ?? undefined,
      odVisualAcuity: r.odVisualAcuity ?? undefined,
      odIopMmHg: r.odIopMmHg ?? undefined,
      osSphere: r.osSphere ?? undefined,
      osCylinder: r.osCylinder ?? undefined,
      osAxis: r.osAxis ?? undefined,
      osAddition: r.osAddition ?? undefined,
      osVisualAcuity: r.osVisualAcuity ?? undefined,
      osIopMmHg: r.osIopMmHg ?? undefined,
      contactLensBaseCurve: r.contactLensBaseCurve ?? undefined,
      contactLensDiameter: r.contactLensDiameter ?? undefined,
      clinicalNotes: r.clinicalNotes ?? undefined,
      recommendations: r.recommendations ?? undefined,
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
    dto: CreateVisionRecordDto,
    roles: string[] = [],
  ): Promise<VisionRecordResponseDto> {
    const isDoctor = roles.includes('DOCTOR') || roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
    if (!isDoctor) {
      throw new ForbiddenException('Only clinicians may author vision examination records');
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
      ...dto,
      patientProfileId: patient.id,
      doctorId,
      examinationDate: dto.examinationDate ? new Date(dto.examinationDate) : new Date(),
    });

    return this.mapDto(created);
  }

  async getPatientVisionRecords(
    userId: string,
    patientProfileId: string,
    roles: string[] = [],
    includeArchived = false,
  ): Promise<VisionRecordResponseDto[]> {
    const patient = await this.repo.findPatientProfile(patientProfileId);
    if (!patient) {
      throw new NotFoundException(`Patient profile '${patientProfileId}' not found`);
    }

    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized && patient.userId !== userId) {
      throw new ForbiddenException('You do not have access to this patient vision timeline');
    }

    const list = await this.repo.findByPatient(patient.id, includeArchived);
    return list.map((item) => this.mapDto(item));
  }

  async getById(id: string, userId: string, roles: string[] = []): Promise<VisionRecordResponseDto> {
    const rec = await this.repo.findById(id);
    if (!rec) {
      throw new NotFoundException(`Vision record '${id}' not found`);
    }

    const isAuthorized = roles.some((r) =>
      ['DOCTOR', 'STAFF', 'ADMIN', 'SUPER_ADMIN', 'FACILITY_ADMIN'].includes(r.toUpperCase()),
    );
    if (!isAuthorized) {
      const patient = await this.repo.findPatientProfile(rec.patientProfileId);
      if (!patient || patient.userId !== userId) {
        throw new ForbiddenException('Access to vision record denied');
      }
    }

    return this.mapDto(rec);
  }

  async update(id: string, dto: UpdateVisionRecordDto, userId: string, roles: string[] = []): Promise<VisionRecordResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Vision record '${id}' not found`);
    }
    if (existing.isArchived) {
      throw new BadRequestException('Archived vision records cannot be modified. Restore record first.');
    }

    const updated = await this.repo.update(id, {
      ...(dto.odSphere !== undefined ? { odSphere: dto.odSphere } : {}),
      ...(dto.odCylinder !== undefined ? { odCylinder: dto.odCylinder } : {}),
      ...(dto.odAxis !== undefined ? { odAxis: dto.odAxis } : {}),
      ...(dto.odAddition !== undefined ? { odAddition: dto.odAddition } : {}),
      ...(dto.odVisualAcuity !== undefined ? { odVisualAcuity: dto.odVisualAcuity } : {}),
      ...(dto.odIopMmHg !== undefined ? { odIopMmHg: dto.odIopMmHg } : {}),
      ...(dto.osSphere !== undefined ? { osSphere: dto.osSphere } : {}),
      ...(dto.osCylinder !== undefined ? { osCylinder: dto.osCylinder } : {}),
      ...(dto.osAxis !== undefined ? { osAxis: dto.osAxis } : {}),
      ...(dto.osAddition !== undefined ? { osAddition: dto.osAddition } : {}),
      ...(dto.osVisualAcuity !== undefined ? { osVisualAcuity: dto.osVisualAcuity } : {}),
      ...(dto.osIopMmHg !== undefined ? { osIopMmHg: dto.osIopMmHg } : {}),
      ...(dto.contactLensBaseCurve !== undefined ? { contactLensBaseCurve: dto.contactLensBaseCurve } : {}),
      ...(dto.contactLensDiameter !== undefined ? { contactLensDiameter: dto.contactLensDiameter } : {}),
      ...(dto.clinicalNotes !== undefined ? { clinicalNotes: dto.clinicalNotes } : {}),
      ...(dto.recommendations !== undefined ? { recommendations: dto.recommendations } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    return this.mapDto(updated);
  }

  async setArchiveStatus(id: string, isArchived: boolean, userId: string, roles: string[] = []): Promise<VisionRecordResponseDto> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundException(`Vision record '${id}' not found`);
    }

    const updated = await this.repo.setArchived(id, isArchived);
    return this.mapDto(updated);
  }
}

