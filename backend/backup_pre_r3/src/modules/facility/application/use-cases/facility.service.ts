import { Injectable, NotFoundException, ConflictException, ForbiddenException, Inject } from '@nestjs/common';
import { IFacilityRepository } from '../../domain/repositories/facility.repository.interface';
import {
  RegisterFacilityDto, CreateDepartmentDto, CreateRoomDto, AddFacilityLicenseDto,
  AddFacilityAccreditationDto, AttachFacilityDocumentDto, AssignDoctorToFacilityDto, FacilityActionDto,
} from '../../presentation/dto/register-facility.dto';
import {
  FacilityFullResponseDto, FullDepartmentResponseDto, RoomResponseDto,
  FacilityDocumentResponseDto, FacilityHistoryItemDto, FacilityStatsResponseDto,
} from '../../presentation/dto/facility-response.dto';
import { FacilityResponseDto, DepartmentResponseDto } from '../../presentation/dto/facility.dto';
import { DoctorProfileResponseDto } from '../../../doctor/presentation/dto/doctor-profile.dto';
import { QrService } from '@modules/qr/application/use-cases/qr.service';
import { QrEntityType } from '@modules/qr/presentation/dto/generate-qr.dto';
import { Logger } from 'nestjs-pino';

@Injectable()
export class FacilityService {
  constructor(
    @Inject('IFacilityRepository')
    private readonly repository: IFacilityRepository,
    private readonly qrService: QrService,
    private readonly logger: Logger,
  ) {}

  private mapFacility(f: any): FacilityFullResponseDto {
    return {
      id: f.id,
      name: f.name,
      legalName: f.legalName || undefined,
      facilityCode: f.facilityCode,
      registrationNumber: f.registrationNumber,
      facilityType: f.facilityType,
      ownershipType: f.ownershipType,
      buildingName: f.buildingName || undefined,
      streetAddress: f.streetAddress,
      city: f.city,
      district: f.district || undefined,
      state: f.state,
      country: f.country,
      pinCode: f.pinCode || undefined,
      latitude: f.latitude ?? undefined,
      longitude: f.longitude ?? undefined,
      timezone: f.timezone,
      phone: f.phone,
      emergencyPhone: f.emergencyPhone || undefined,
      email: f.email || undefined,
      website: f.website || undefined,
      profilePhotoUrl: f.profilePhotoUrl || undefined,
      verificationStatus: f.verificationStatus,
      verificationNotes: f.verificationNotes || undefined,
      verifiedBy: f.verifiedBy || undefined,
      verifiedAt: f.verifiedAt?.toISOString() || undefined,
      isDeleted: f.isDeleted,
      branches: f.branches?.map((b: any) => ({
        id: b.id,
        branchName: b.branchName,
        branchCode: b.branchCode || undefined,
        address: b.address,
        city: b.city,
        state: b.state,
        phone: b.phone || undefined,
      })) || [],
      departments: f.departments?.map((d: any) => ({
        id: d.id,
        facilityId: d.facilityId,
        name: d.name,
        code: d.code || undefined,
        description: d.description || undefined,
        departmentHead: d.departmentHead || undefined,
        operatingHours: d.operatingHours || undefined,
        createdAt: d.createdAt.toISOString(),
      })) || [],
      rooms: f.rooms?.map((r: any) => ({
        id: r.id,
        facilityId: r.facilityId,
        departmentId: r.departmentId || undefined,
        roomNumber: r.roomNumber,
        roomName: r.roomName || undefined,
        building: r.building || undefined,
        block: r.block || undefined,
        floor: r.floor || undefined,
        wing: r.wing || undefined,
        roomCategory: r.roomCategory,
        capacity: r.capacity,
        isOperational: r.isOperational,
        createdAt: r.createdAt.toISOString(),
      })) || [],
      licenses: f.licenses?.map((l: any) => ({
        id: l.id,
        licenseType: l.licenseType,
        licenseNumber: l.licenseNumber,
        issuingAuthority: l.issuingAuthority,
        issueDate: l.issueDate ? new Date(l.issueDate).toISOString().split('T')[0] : undefined,
        expiryDate: l.expiryDate ? new Date(l.expiryDate).toISOString().split('T')[0] : undefined,
        renewalDate: l.renewalDate ? new Date(l.renewalDate).toISOString().split('T')[0] : undefined,
        verificationStatus: l.verificationStatus,
      })) || [],
      accreditations: f.accreditations?.map((a: any) => ({
        id: a.id,
        accreditationBody: a.accreditationBody,
        certificateNumber: a.certificateNumber,
        validFrom: a.validFrom ? new Date(a.validFrom).toISOString().split('T')[0] : undefined,
        validTo: a.validTo ? new Date(a.validTo).toISOString().split('T')[0] : undefined,
        status: a.status,
      })) || [],
      documents: f.documents?.map((doc: any) => ({
        id: doc.id,
        documentType: doc.documentType,
        medicalAttachmentId: doc.medicalAttachmentId || undefined,
        verificationStatus: doc.verificationStatus,
        createdAt: doc.createdAt.toISOString(),
      })) || [],
      createdAt: f.createdAt.toISOString(),
      updatedAt: f.updatedAt.toISOString(),
    };
  }

  // ─── Registration & Profile Management ────────────────────────────────────

  async registerFacility(userId: string, dto: RegisterFacilityDto): Promise<FacilityFullResponseDto> {
    const regDup = await this.repository.findFacilityByRegistrationNumber(dto.registrationNumber);
    if (regDup) {
      throw new ConflictException('Facility registration number already registered');
    }

    const created = await this.repository.createFacility({
      ...dto,
      registeredBy: userId,
    });

    // Issue QR digital verification identity
    try {
      const qr = await this.qrService.generateQr(userId, {
        entityId: created.id,
        entityType: QrEntityType.FACILITY_ID,
      });
      (created as any).qrToken = qr.token;
    } catch (err) {
      this.logger.warn({ msg: 'QR generation skipped for facility', err });
    }

    await this.repository.createAuditLog({
      facilityId: created.id,
      action: 'REGISTERED',
      performedBy: userId,
      details: `Facility profile created with code ${created.facilityCode}`,
    });

    return this.mapFacility(created);
  }

  async getFacilities(page = 1, limit = 50): Promise<FacilityFullResponseDto[]> {
    const facilities = await this.repository.findAllFacilities(false, page, limit);
    return facilities.map((f) => this.mapFacility(f));
  }

  async getFacilityById(id: string): Promise<FacilityFullResponseDto> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) {
      throw new NotFoundException('Facility profile not found in Master Registry');
    }
    return this.mapFacility(facility);
  }

  async updateFacility(
    id: string,
    dto: Partial<RegisterFacilityDto>,
    caller?: { userId: string; roles: string[] },
  ): Promise<FacilityFullResponseDto> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    if (caller) {
      const isSuperAdmin = caller.roles?.includes('SUPER_ADMIN');
      const isAdmin = caller.roles?.includes('ADMIN');
      if (!isSuperAdmin && !isAdmin) {
        const isFacilityAdmin = caller.roles?.includes('FACILITY_ADMIN');
        if (!isFacilityAdmin) {
          throw new ForbiddenException('Insufficient permissions to update facility details');
        }
        const isAffiliated = await this.repository.isUserAffiliatedWithFacility(id, caller.userId);
        if (!isAffiliated) {
          throw new ForbiddenException('You are not authorized to update details for a facility you are not affiliated with');
        }
      }
    }

    const updated = await this.repository.updateFacility(id, dto);

    await this.repository.createAuditLog({
      facilityId: id,
      action: 'UPDATED',
      performedBy: caller?.userId,
      details: 'Updated facility profile details',
    });

    return this.mapFacility(updated);
  }

  async softDeleteFacility(id: string): Promise<{ message: string }> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    await this.repository.softDeleteFacility(id);
    return { message: 'Facility soft-deleted from active registry' };
  }

  // ─── Verification Workflow ───────────────────────────────────────────────

  async verifyFacility(id: string, dto: FacilityActionDto, adminUserId?: string): Promise<FacilityFullResponseDto> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const prevStatus = facility.verificationStatus;
    const updated = await this.repository.updateFacility(id, {
      verificationStatus: 'VERIFIED',
      verificationNotes: dto.reason || 'Government & Healthcare Commission licenses verified',
      verifiedBy: adminUserId || 'ADMIN',
      verifiedAt: new Date(),
    });

    await this.repository.createHistory(id, {
      action: 'VERIFIED',
      previousStatus: prevStatus,
      newStatus: 'VERIFIED',
      reason: dto.reason || 'Licenses & accreditations verified',
      performedBy: adminUserId || 'ADMIN',
    });

    return this.mapFacility(updated);
  }

  async suspendFacility(id: string, dto: FacilityActionDto, adminUserId?: string): Promise<FacilityFullResponseDto> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const prevStatus = facility.verificationStatus;
    const updated = await this.repository.updateFacility(id, {
      verificationStatus: 'SUSPENDED',
      verificationNotes: dto.reason || 'Operations suspended by authority',
    });

    await this.repository.createHistory(id, {
      action: 'SUSPENDED',
      previousStatus: prevStatus,
      newStatus: 'SUSPENDED',
      reason: dto.reason || 'Operations suspended',
      performedBy: adminUserId || 'ADMIN',
    });

    return this.mapFacility(updated);
  }

  async restoreFacility(id: string, dto: FacilityActionDto, adminUserId?: string): Promise<FacilityFullResponseDto> {
    const facility = await this.repository.findFacilityById(id, true);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const prevStatus = facility.verificationStatus;
    const updated = await this.repository.updateFacility(id, {
      verificationStatus: 'VERIFIED',
      isDeleted: false,
      deletedAt: null,
    });

    await this.repository.createHistory(id, {
      action: 'RESTORED',
      previousStatus: prevStatus,
      newStatus: 'VERIFIED',
      reason: dto.reason || 'Facility restored',
      performedBy: adminUserId || 'ADMIN',
    });

    return this.mapFacility(updated);
  }

  // ─── Sub-entities (Departments, Rooms, Documents, Doctors) ───────────────

  async createDepartment(id: string, dto: CreateDepartmentDto): Promise<FullDepartmentResponseDto> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const dept = await this.repository.createDepartment(id, dto);
    return {
      id: dept.id,
      facilityId: dept.facilityId,
      name: dept.name,
      code: dept.code || undefined,
      description: dept.description || undefined,
      departmentHead: dept.departmentHead || undefined,
      operatingHours: dept.operatingHours || undefined,
      createdAt: dept.createdAt.toISOString(),
    };
  }

  async getDepartments(id: string): Promise<FullDepartmentResponseDto[]> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const depts = await this.repository.findDepartmentsByFacilityId(id);
    return depts.map((d) => ({
      id: d.id,
      facilityId: d.facilityId,
      name: d.name,
      code: d.code || undefined,
      description: d.description || undefined,
      departmentHead: d.departmentHead || undefined,
      operatingHours: d.operatingHours || undefined,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async createRoom(id: string, dto: CreateRoomDto): Promise<RoomResponseDto> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const existingRooms = await this.repository.findRoomsByFacilityId(id);
    const isDuplicate = existingRooms.some(
      (r) => r.roomNumber.trim().toLowerCase() === dto.roomNumber.trim().toLowerCase(),
    );
    if (isDuplicate) {
      throw new ConflictException(`Room number '${dto.roomNumber}' already exists in this facility`);
    }

    const room = await this.repository.createRoom(id, dto);
    return {
      id: room.id,
      facilityId: room.facilityId,
      departmentId: room.departmentId || undefined,
      roomNumber: room.roomNumber,
      roomName: room.roomName || undefined,
      building: room.building || undefined,
      block: room.block || undefined,
      floor: room.floor || undefined,
      wing: room.wing || undefined,
      roomCategory: room.roomCategory,
      capacity: room.capacity,
      isOperational: room.isOperational,
      createdAt: room.createdAt.toISOString(),
    };
  }

  async getRooms(id: string): Promise<RoomResponseDto[]> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const rooms = await this.repository.findRoomsByFacilityId(id);
    return rooms.map((r) => ({
      id: r.id,
      facilityId: r.facilityId,
      departmentId: r.departmentId || undefined,
      roomNumber: r.roomNumber,
      roomName: r.roomName || undefined,
      building: r.building || undefined,
      block: r.block || undefined,
      floor: r.floor || undefined,
      wing: r.wing || undefined,
      roomCategory: r.roomCategory,
      capacity: r.capacity,
      isOperational: r.isOperational,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  async attachDocument(id: string, dto: AttachFacilityDocumentDto): Promise<FacilityDocumentResponseDto> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const doc = await this.repository.attachDocument(id, dto);

    await this.repository.createAuditLog({
      facilityId: id,
      action: 'DOCUMENT_ATTACHED',
      details: `Attached ${dto.documentType} using MedicalAttachment ${dto.medicalAttachmentId}`,
    });

    return {
      id: doc.id,
      documentType: doc.documentType,
      medicalAttachmentId: doc.medicalAttachmentId || undefined,
      verificationStatus: doc.verificationStatus,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  async getDocuments(id: string): Promise<FacilityDocumentResponseDto[]> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const docs = await this.repository.findDocumentsByFacilityId(id);
    return docs.map((d) => ({
      id: d.id,
      documentType: d.documentType,
      medicalAttachmentId: d.medicalAttachmentId || undefined,
      verificationStatus: d.verificationStatus,
      createdAt: d.createdAt.toISOString(),
    }));
  }

  async assignDoctor(id: string, dto: AssignDoctorToFacilityDto): Promise<any> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    return this.repository.assignDoctor(id, dto);
  }

  async generateQr(userId: string, id: string): Promise<{ facilityId: string; qrToken: string }> {
    const facility = await this.repository.findFacilityById(id);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const qr = await this.qrService.generateQr(userId, {
      entityId: id,
      entityType: QrEntityType.FACILITY_ID,
    });

    return { facilityId: id, qrToken: qr.token };
  }

  async getHistory(id: string): Promise<FacilityHistoryItemDto[]> {
    const facility = await this.repository.findFacilityById(id, true);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const history = await this.repository.findHistoryByFacilityId(id);
    return history.map((h) => ({
      id: h.id,
      facilityId: h.facilityId,
      action: h.action,
      previousStatus: h.previousStatus || undefined,
      newStatus: h.newStatus,
      reason: h.reason || undefined,
      performedBy: h.performedBy || undefined,
      createdAt: h.createdAt.toISOString(),
    }));
  }

  // ─── Search & Stats ───────────────────────────────────────────────────────

  async searchFacilities(query: string): Promise<FacilityFullResponseDto[]> {
    if (!query || query.trim().length === 0) return [];
    const facilities = await this.repository.searchFacilities(query.trim());
    return facilities.map((f) => this.mapFacility(f));
  }

  async getStatistics(): Promise<FacilityStatsResponseDto> {
    return this.repository.getStatistics();
  }

  // ─── Legacy Method Hooks (Backward Compatibility) ──────────────────────────

  async listFacilities(): Promise<FacilityResponseDto[]> {
    const list = await this.repository.findAllFacilities();
    return list.map((f) => ({
      id: f.id,
      name: f.name,
      address: f.streetAddress,
      phone: f.phone,
    }));
  }

  async getFacilityDetails(facilityId: string): Promise<FacilityResponseDto> {
    const facility = await this.repository.findFacilityById(facilityId);
    if (!facility) throw new NotFoundException('Facility not found');
    return {
      id: facility.id,
      name: facility.name,
      address: facility.streetAddress,
      phone: facility.phone,
    };
  }

  async listDepartments(facilityId: string): Promise<DepartmentResponseDto[]> {
    const facility = await this.repository.findFacilityById(facilityId);
    if (!facility) throw new NotFoundException('Facility not found');

    const list = await this.repository.findDepartmentsByFacilityId(facilityId);
    return list.map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description || undefined,
    }));
  }

  async listDoctors(facilityId: string): Promise<DoctorProfileResponseDto[]> {
    const facility = await this.repository.findFacilityById(facilityId);
    if (!facility) throw new NotFoundException('Facility not found');

    const list = await this.repository.findDoctorsByFacilityId(facilityId);
    return list.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      specialization: d.primarySpecialization || 'General',
      credentials: d.medicalCouncil || 'MD',
    }));
  }

  async getChargemaster(facilityId: string): Promise<any> {
    const facility = await this.repository.findFacilityById(facilityId);
    if (!facility) throw new NotFoundException('Facility profile not found');

    const defaultItems = [
      {
        cptCode: '93458',
        procedureName: 'Left Heart Catheterization with Coronary Angiography',
        category: 'CARDIOLOGY',
        department: 'Cath Lab',
        standardCharge: 150000,
        discountedCashPrice: 135000,
        insuredPrice: 142500,
        status: 'ACTIVE',
      },
      {
        cptCode: '93454',
        procedureName: 'Coronary Angiography (Isolated)',
        category: 'CARDIOLOGY',
        department: 'Cath Lab',
        standardCharge: 120000,
        discountedCashPrice: 108000,
        insuredPrice: 114000,
        status: 'ACTIVE',
      },
      {
        cptCode: '92928',
        procedureName: 'Percutaneous Transcatheter Coronary Stent Placement',
        category: 'CARDIOLOGY',
        department: 'Cath Lab',
        standardCharge: 275000,
        discountedCashPrice: 247500,
        insuredPrice: 261250,
        status: 'ACTIVE',
      },
      {
        cptCode: '93000',
        procedureName: '12-Lead Electrocardiogram (ECG/EKG)',
        category: 'DIAGNOSTIC_CARDIOLOGY',
        department: 'Cardiology Non-Invasive',
        standardCharge: 3500,
        discountedCashPrice: 3000,
        insuredPrice: 3300,
        status: 'ACTIVE',
      },
      {
        cptCode: '93306',
        procedureName: 'Transthoracic Echocardiography (TTE)',
        category: 'DIAGNOSTIC_CARDIOLOGY',
        department: 'Cardiology Non-Invasive',
        standardCharge: 18000,
        discountedCashPrice: 16000,
        insuredPrice: 17100,
        status: 'ACTIVE',
      },
      {
        cptCode: '33533',
        procedureName: 'Coronary Artery Bypass Graft (CABG), Single Arterial',
        category: 'CARDIOVASCULAR_SURGERY',
        department: 'Cardiothoracic OR',
        standardCharge: 750000,
        discountedCashPrice: 675000,
        insuredPrice: 712500,
        status: 'ACTIVE',
      },
      {
        cptCode: '99213',
        procedureName: 'Outpatient Clinical Consultation (Level 3)',
        category: 'EVALUATION_MANAGEMENT',
        department: 'Outpatient Clinics',
        standardCharge: 4000,
        discountedCashPrice: 3500,
        insuredPrice: 3800,
        status: 'ACTIVE',
      },
      {
        cptCode: '80053',
        procedureName: 'Comprehensive Metabolic Panel (CMP)',
        category: 'LABORATORY',
        department: 'Clinical Pathology',
        standardCharge: 5500,
        discountedCashPrice: 5000,
        insuredPrice: 5200,
        status: 'ACTIVE',
      },
    ];

    return {
      facilityId: facility.id,
      facilityName: facility.name,
      facilityType: facility.facilityType,
      currency: 'PKR',
      chargemasterVersion: '2026.1',
      lastUpdatedAt: facility.updatedAt ? new Date(facility.updatedAt).toISOString() : new Date().toISOString(),
      itemCount: defaultItems.length,
      items: defaultItems,
    };
  }

  async getPricingRules(facilityId: string): Promise<any> {
    const facility = await this.repository.findFacilityById(facilityId);
    if (!facility) throw new NotFoundException('Facility profile not found');

    return {
      facilityId: facility.id,
      facilityName: facility.name,
      currency: 'PKR',
      rules: {
        standardDoctorDiscountThresholdPercent: 15,
        supervisorApprovalRequiredThresholdPercent: 15,
        maxDiscountCeilingPercent: 30,
        allowDoctorDiscretion: true,
        supervisorRoles: ['FACILITY_ADMIN', 'ADMIN', 'SUPER_ADMIN'],
      },
      effectiveDate: '2026-01-01T00:00:00.000Z',
    };
  }
}
