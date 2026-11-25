import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@database/database.service';
import {
  IAppointmentRepository,
  AppointmentFilterOptions,
} from '../../domain/repositories/appointment.repository.interface';
import {
  AppointmentEntity,
  AppointmentStatus,
  AppointmentType,
} from '../../domain/entities/appointment.entity';
import * as crypto from 'crypto';

const appointmentIncludes = {
  patientProfile: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      patientNumber: true,
      gender: true,
      dateOfBirth: true,
      user: {
        select: {
          phone: true,
          email: true,
        },
      },
    },
  },
  doctorProfile: {
    select: {
      id: true,
      fullName: true,
      primarySpecialization: true,
      registrationNumber: true,
      user: {
        select: {
          phone: true,
          email: true,
        },
      },
    },
  },
  facility: {
    select: {
      id: true,
      name: true,
      streetAddress: true,
      city: true,
      phone: true,
    },
  },
  slot: {
    select: {
      id: true,
      slotDate: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  },
};

@Injectable()
export class AppointmentRepository implements IAppointmentRepository {
  constructor(private readonly db: DatabaseService) {}

  async create(data: Partial<AppointmentEntity>): Promise<AppointmentEntity> {
    const created = await this.db.appointment.create({
      data: {
        appointmentNumber: data.appointmentNumber!,
        patientProfileId: data.patientProfileId!,
        doctorProfileId: data.doctorProfileId!,
        facilityId: data.facilityId || null,
        scheduleId: data.scheduleId || null,
        slotId: data.slotId || null,
        appointmentDate: data.appointmentDate!,
        startTime: data.startTime!,
        endTime: data.endTime!,
        durationMinutes: data.durationMinutes || 15,
        type: data.type || AppointmentType.IN_PERSON,
        status: (data.status as any) || AppointmentStatus.SCHEDULED,
        reason: data.reason || null,
        notes: data.notes || null,
        bookedBy: data.bookedBy || null,
        rescheduledFromId: data.rescheduledFromId || null,
      },
      include: appointmentIncludes,
    });
    return created as unknown as AppointmentEntity;
  }

  async findById(id: string): Promise<AppointmentEntity | null> {
    const appt = await this.db.appointment.findUnique({
      where: { id },
      include: appointmentIncludes,
    });
    return (appt as unknown as AppointmentEntity) || null;
  }

  async findByAppointmentNumber(appointmentNumber: string): Promise<AppointmentEntity | null> {
    const appt = await this.db.appointment.findUnique({
      where: { appointmentNumber },
      include: appointmentIncludes,
    });
    return (appt as unknown as AppointmentEntity) || null;
  }

  async findMany(
    filter: AppointmentFilterOptions,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ items: AppointmentEntity[]; total: number }> {
    const where: any = {};

    if (!filter.includeDeleted) {
      where.isDeleted = false;
    }
    if (filter.patientProfileId) {
      where.patientProfileId = filter.patientProfileId;
    }
    if (filter.doctorProfileId) {
      where.doctorProfileId = filter.doctorProfileId;
    }
    if (filter.facilityId) {
      where.facilityId = filter.facilityId;
    }
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.type) {
      where.type = filter.type;
    }
    if (filter.fromDate || filter.toDate) {
      where.appointmentDate = {};
      if (filter.fromDate) {
        const start = new Date(filter.fromDate);
        start.setUTCHours(0, 0, 0, 0);
        where.appointmentDate.gte = start;
      }
      if (filter.toDate) {
        const end = new Date(filter.toDate);
        end.setUTCHours(23, 59, 59, 999);
        where.appointmentDate.lte = end;
      }
    }

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.db.appointment.findMany({
        where,
        include: appointmentIncludes,
        orderBy: [{ appointmentDate: 'desc' }, { startTime: 'desc' }],
        skip,
        take: limit,
      }),
      this.db.appointment.count({ where }),
    ]);

    return {
      items: items as unknown as AppointmentEntity[],
      total,
    };
  }

  async update(id: string, data: Partial<AppointmentEntity>): Promise<AppointmentEntity> {
    const updated = await this.db.appointment.update({
      where: { id },
      data: {
        status: data.status as any,
        appointmentDate: data.appointmentDate,
        startTime: data.startTime,
        endTime: data.endTime,
        slotId: data.slotId,
        durationMinutes: data.durationMinutes,
        type: data.type,
        reason: data.reason,
        notes: data.notes,
        cancelledAt: data.cancelledAt,
        cancellationReason: data.cancellationReason,
        cancelledBy: data.cancelledBy,
        rescheduledFromId: data.rescheduledFromId,
        isDeleted: data.isDeleted,
      },
      include: appointmentIncludes,
    });
    return updated as unknown as AppointmentEntity;
  }

  async checkDoctorConflict(
    doctorProfileId: string,
    appointmentDate: Date,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const startOfDay = new Date(appointmentDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const conflicting = await this.db.appointment.findFirst({
      where: {
        doctorProfileId,
        appointmentDate: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELLED', 'RESCHEDULED'] },
        isDeleted: false,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        // Overlap: existing.startTime < newEndTime && existing.endTime > newStartTime
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    return !!conflicting;
  }

  async checkPatientConflict(
    patientProfileId: string,
    appointmentDate: Date,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ): Promise<boolean> {
    const startOfDay = new Date(appointmentDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const conflicting = await this.db.appointment.findFirst({
      where: {
        patientProfileId,
        appointmentDate: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ['CANCELLED', 'RESCHEDULED'] },
        isDeleted: false,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
    });

    return !!conflicting;
  }

  async findPatientProfileByUserId(userId: string): Promise<any> {
    const profile = await this.db.patientProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (profile) return profile;
    const byId = await this.db.patientProfile.findUnique({
      where: { id: userId },
      include: { user: true },
    });
    return byId || null;
  }

  async findDoctorProfileByUserId(userId: string): Promise<any> {
    const profile = await this.db.doctorProfile.findUnique({
      where: { userId },
      include: { user: true },
    });
    if (profile && !profile.isDeleted) return profile;
    const byId = await this.db.doctorProfile.findUnique({
      where: { id: userId },
      include: { user: true },
    });
    return byId && !byId.isDeleted ? byId : null;
  }

  async findPatientProfileById(patientProfileId: string): Promise<any> {
    return this.db.patientProfile.findUnique({
      where: { id: patientProfileId },
      include: { user: true },
    });
  }

  async findDoctorProfileById(doctorProfileId: string): Promise<any> {
    return this.db.doctorProfile.findUnique({
      where: { id: doctorProfileId },
      include: { user: true },
    });
  }

  async findFacilityById(facilityId: string): Promise<any> {
    return this.db.facility.findUnique({
      where: { id: facilityId },
    });
  }

  async findSlotById(slotId: string): Promise<any> {
    return this.db.generatedSlot.findUnique({
      where: { id: slotId },
      include: { schedule: true },
    });
  }

  async findSlotByHoldId(holdId: string): Promise<any> {
    return this.db.generatedSlot.findFirst({
      where: {
        statusReason: { contains: holdId },
      },
      include: { schedule: true },
    });
  }

  async updateSlotStatus(slotId: string, status: string, statusReason?: string | null): Promise<void> {
    const data: any = { status: status as any };
    if (statusReason !== undefined) {
      data.statusReason = statusReason;
    }
    await this.db.generatedSlot.update({
      where: { id: slotId },
      data,
    });
  }

  async reserveSlotAtomic(slotId: string): Promise<boolean> {
    const result = await this.db.generatedSlot.updateMany({
      where: { id: slotId, status: 'AVAILABLE' as any },
      data: { status: 'BOOKED' as any },
    });
    return result.count > 0;
  }

  async generateNextAppointmentNumber(): Promise<string> {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    let attempts = 0;
    while (attempts < 10) {
      const suffix = crypto.randomBytes(3).toString('hex').toUpperCase();
      const num = `APT-${dateStr}-${suffix}`;
      const exists = await this.db.appointment.findUnique({
        where: { appointmentNumber: num },
        select: { id: true },
      });
      if (!exists) {
        return num;
      }
      attempts++;
    }
    return `APT-${dateStr}-${Date.now().toString().slice(-6)}`;
  }
}
