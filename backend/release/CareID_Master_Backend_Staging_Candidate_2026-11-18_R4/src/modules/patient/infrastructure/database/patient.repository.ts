import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import { IPatientRepository } from '../../domain/repositories/patient.repository.interface';
import { PatientProfileEntity, EmergencyContactEntity, FamilyConsentEntity, FamilyMemberEntity } from '../../domain/entities/patient.entity';

@Injectable()
export class PatientRepository implements IPatientRepository {
  constructor(private readonly db: DatabaseService) {}

  async findProfileByUserId(userId: string): Promise<PatientProfileEntity | null> {
    const profile = await this.db.patientProfile.findUnique({
      where: { userId },
    });
    if (profile) return profile as PatientProfileEntity;
    return (await this.db.patientProfile.findUnique({
      where: { id: userId },
    })) as PatientProfileEntity | null;
  }

  async findProfileById(profileId: string): Promise<PatientProfileEntity | null> {
    return (await this.db.patientProfile.findUnique({
      where: { id: profileId },
    })) as PatientProfileEntity | null;
  }

  async createProfile(userId: string, data: Partial<PatientProfileEntity>): Promise<PatientProfileEntity> {
    return (await this.db.patientProfile.create({
      data: {
        userId,
        patientNumber: data.patientNumber || null,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender || null,
        bloodGroup: data.bloodGroup || null,
        address: data.address || null,
        onboardingStep: data.onboardingStep || 1,
        status: data.status || 'DRAFT',
      },
    })) as PatientProfileEntity;
  }

  async updateProfile(profileId: string, data: Partial<PatientProfileEntity>): Promise<PatientProfileEntity> {
    const updateData: any = { ...data };
    if (data.dateOfBirth) {
      updateData.dateOfBirth = new Date(data.dateOfBirth);
    }
    return (await this.db.patientProfile.update({
      where: { id: profileId },
      data: updateData,
    })) as PatientProfileEntity;
  }

  async createEmergencyContact(profileId: string, data: Partial<EmergencyContactEntity>): Promise<EmergencyContactEntity> {
    return (await this.db.emergencyContact.create({
      data: {
        patientProfileId: profileId,
        name: data.name!,
        relationship: data.relationship!,
        phone: data.phone!,
      },
    })) as EmergencyContactEntity;
  }

  async updateEmergencyContact(profileId: string, data: Partial<EmergencyContactEntity>): Promise<EmergencyContactEntity> {
    return (await this.db.emergencyContact.update({
      where: { patientProfileId: profileId },
      data,
    })) as EmergencyContactEntity;
  }

  async findEmergencyContactByProfileId(profileId: string): Promise<EmergencyContactEntity | null> {
    return (await this.db.emergencyContact.findUnique({
      where: { patientProfileId: profileId },
    })) as EmergencyContactEntity | null;
  }

  async createInsurancePolicy(profileId: string, data: any): Promise<any> {
    return await this.db.insurancePolicy.create({
      data: {
        patientProfileId: profileId,
        providerName: data.providerName,
        policyNumber: data.policyNumber,
        coverageDetails: data.coverageDetails || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        secondaryProvider: data.secondaryProvider || null,
        secondaryPolicyNumber: data.secondaryPolicyNumber || null,
        secondaryCoverage: data.secondaryCoverage || null,
        verificationStatus: data.verificationStatus || 'PENDING',
      },
    });
  }

  async updateInsurancePolicy(profileId: string, data: any): Promise<any> {
    const updateData: any = { ...data };
    if (data.expiryDate) {
      updateData.expiryDate = new Date(data.expiryDate);
    }
    return await this.db.insurancePolicy.update({
      where: { patientProfileId: profileId },
      data: updateData,
    });
  }

  async findInsurancePolicyByProfileId(profileId: string): Promise<any | null> {
    return await this.db.insurancePolicy.findUnique({
      where: { patientProfileId: profileId },
    });
  }

  async createHealthCard(profileId: string, data: any): Promise<any> {
    return await this.db.healthCard.create({
      data: {
        patientProfileId: profileId,
        cardNumber: data.cardNumber,
        status: data.status || 'ACTIVE',
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : new Date(),
        expiresAt: new Date(data.expiresAt),
      },
    });
  }

  async findHealthCardByProfileId(profileId: string): Promise<any | null> {
    return await this.db.healthCard.findUnique({
      where: { patientProfileId: profileId },
    });
  }

  async createFamilyConsent(profileId: string, inviteePhone: string, relationship: string): Promise<FamilyConsentEntity> {
    const { randomUUID } = await import('crypto');
    return (await this.db.familyConsent.create({
      data: {
        patientProfileId: profileId,
        inviteePhone,
        relationship,
        invitationToken: randomUUID(),
        status: 'PENDING',
      },
    })) as FamilyConsentEntity;
  }

  async findConsentById(consentId: string): Promise<FamilyConsentEntity | null> {
    return (await this.db.familyConsent.findUnique({
      where: { id: consentId },
    })) as FamilyConsentEntity | null;
  }

  async updateConsentStatus(consentId: string, status: 'ACCEPTED' | 'REJECTED'): Promise<FamilyConsentEntity> {
    return (await this.db.familyConsent.update({
      where: { id: consentId },
      data: { status },
    })) as FamilyConsentEntity;
  }

  async createFamilyMember(profileId: string, fullName: string, relationship: string, phone: string): Promise<FamilyMemberEntity> {
    return (await this.db.familyMember.create({
      data: {
        patientProfileId: profileId,
        fullName,
        relationship,
        phone,
      },
    })) as FamilyMemberEntity;
  }

  async createProfileAuditLog(
    profileId: string,
    action: string,
    fieldChanged?: string,
    previousValue?: string,
    newValue?: string,
    performedByUserId?: string,
  ): Promise<void> {
    await this.db.profileAuditLog.create({
      data: {
        patientProfileId: profileId,
        action,
        fieldChanged: fieldChanged || null,
        previousValue: previousValue || null,
        newValue: newValue || null,
        performedByUserId: performedByUserId || null,
      },
    });
  }

  async findProfileAuditLogs(profileId: string): Promise<any[]> {
    return await this.db.profileAuditLog.findMany({
      where: { patientProfileId: profileId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getDashboardAggregates(profileId: string, userId: string): Promise<any> {
    const [
      healthCard,
      insurancePolicy,
      emergencyContact,
      records,
      upcomingAppointments,
      unreadNotificationsCount,
    ] = await Promise.all([
      this.db.healthCard.findUnique({
        where: { patientProfileId: profileId },
      }),
      this.db.insurancePolicy.findFirst({
        where: { patientProfileId: profileId, isDeleted: false },
        orderBy: { createdAt: 'desc' },
      }),
      this.db.emergencyContact.findUnique({
        where: { patientProfileId: profileId },
      }),
      this.db.medicalRecord.findMany({
        where: { patientProfileId: profileId, isDeleted: false },
        include: { encounters: true },
      }),
      this.db.appointment.findMany({
        where: {
          patientProfileId: profileId,
          appointmentDate: { gte: new Date() },
          status: { notIn: ['CANCELLED', 'NO_SHOW'] },
        },
        orderBy: { appointmentDate: 'asc' },
        take: 3,
        include: {
          doctorProfile: {
            select: {
              id: true,
              fullName: true,
              primarySpecialization: true,
              profilePhotoUrl: true,
            },
          },
          facility: {
            select: {
              id: true,
              name: true,
              city: true,
            },
          },
        },
      }),
      this.db.notification.count({
        where: {
          recipientUserId: userId,
          readAt: null,
          isDeleted: false,
        },
      }),
    ]);

    let qrCode: any = null;
    if (healthCard) {
      qrCode = await this.db.qrCode.findFirst({
        where: { entityId: healthCard.id, status: 'ACTIVE' },
        orderBy: { createdAt: 'desc' },
      });
    }

    let medicalCount = 0;
    let dentalCount = 0;
    let visionCount = 0;

    for (const r of records) {
      const encTypes = (r.encounters || []).map((e: any) => (e.encounterType || '').toUpperCase()).join(' ');
      const text = `${r.title || ''} ${r.chiefComplaint || ''} ${r.clinicalNotes || ''} ${encTypes}`.toUpperCase();
      if (encTypes.includes('DENTAL') || text.includes('DENTAL') || text.includes('TOOTH') || text.includes('TEETH')) {
        dentalCount++;
      } else if (
        encTypes.includes('VISION') ||
        encTypes.includes('OPTOMETRY') ||
        encTypes.includes('OPHTHALMOLOGY') ||
        text.includes('VISION') ||
        text.includes('EYE') ||
        text.includes('RETINA')
      ) {
        visionCount++;
      } else {
        medicalCount++;
      }
    }

    return {
      healthCard: healthCard
        ? {
            id: healthCard.id,
            cardNumber: healthCard.cardNumber,
            status: healthCard.status,
            issuedAt: healthCard.issuedAt,
            expiresAt: healthCard.expiresAt,
            qrPayload: qrCode ? qrCode.token : undefined,
          }
        : null,
      insurancePolicy: insurancePolicy
        ? {
            id: insurancePolicy.id,
            providerName: insurancePolicy.providerName,
            policyNumber: insurancePolicy.policyNumber,
            verificationStatus: insurancePolicy.verificationStatus,
            expiryDate: insurancePolicy.expiryDate,
          }
        : null,
      emergencyContact,
      recordCounts: {
        total: records.length,
        medical: medicalCount,
        dental: dentalCount,
        vision: visionCount,
      },
      upcomingAppointments: upcomingAppointments.map((apt: any) => ({
        id: apt.id,
        appointmentNumber: apt.appointmentNumber,
        appointmentDate: apt.appointmentDate,
        startTime: apt.startTime,
        endTime: apt.endTime,
        status: apt.status,
        type: apt.type,
        reason: apt.reason,
        doctor: apt.doctorProfile
          ? {
              id: apt.doctorProfile.id,
              name: apt.doctorProfile.fullName,
              specialty: apt.doctorProfile.primarySpecialization,
              photoUrl: apt.doctorProfile.profilePhotoUrl,
            }
          : null,
        facility: apt.facility
          ? {
              id: apt.facility.id,
              name: apt.facility.name,
              city: apt.facility.city,
            }
          : null,
      })),
      unreadNotificationsCount,
    };
  }
}

