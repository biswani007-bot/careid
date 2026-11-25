import * as crypto from 'crypto';
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import {
  IAppointmentRepository,
  AppointmentFilterOptions,
} from '../../domain/repositories/appointment.repository.interface';
import {
  CreateAppointmentDto,
  RescheduleAppointmentDto,
  CancelAppointmentDto,
  UpdateAppointmentStatusDto,
  AppointmentQueryDto,
  AppointmentResponseDto,
  CreateSlotHoldDto,
  SlotHoldResponseDto,
  UpdateReadinessDto,
  AppointmentCheckInDto,
  UpdateCathLabChecklistDto,
} from '../../presentation/dto/appointment.dto';
import { AppointmentStatus, AppointmentType } from '../../domain/entities/appointment.entity';
import { AppointmentMapper } from '../../infrastructure/mappers/appointment.mapper';
import { PaginatedResponseDto, buildPaginationMeta } from '@common/dto/pagination.dto';
import { Logger } from 'nestjs-pino';

const VALID_STATUS_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  [AppointmentStatus.SCHEDULED]: [
    AppointmentStatus.CONFIRMED,
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.RESCHEDULED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.CONFIRMED]: [
    AppointmentStatus.IN_PROGRESS,
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.RESCHEDULED,
    AppointmentStatus.NO_SHOW,
  ],
  [AppointmentStatus.IN_PROGRESS]: [
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
  ],
  [AppointmentStatus.COMPLETED]: [],
  [AppointmentStatus.CANCELLED]: [],
  [AppointmentStatus.RESCHEDULED]: [],
  [AppointmentStatus.NO_SHOW]: [
    AppointmentStatus.CANCELLED,
  ],
};

@Injectable()
export class AppointmentService {
  constructor(
    @Inject('IAppointmentRepository')
    private readonly repository: IAppointmentRepository,
    private readonly logger: Logger,
  ) {}

  private parseTimeToMinutes(time: string): number {
    const [h, m] = time.split(':').map((v) => parseInt(v, 10));
    return h * 60 + m;
  }

  private minutesToTime(minutes: number): string {
    const h = Math.floor(minutes / 60) % 24;
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }

  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const startMins = this.parseTimeToMinutes(startTime);
    return this.minutesToTime(startMins + durationMinutes);
  }

  // ─── Booking ──────────────────────────────────────────────────────────────

  async bookAppointment(
    callerUserId: string,
    callerRoles: string[] = [],
    dto: CreateAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const isPatient = callerRoles.includes('PATIENT');
    const isDoctor = callerRoles.includes('DOCTOR');
    const isStaffOrAdmin =
      callerRoles.includes('STAFF') ||
      callerRoles.includes('FACILITY_ADMIN') ||
      callerRoles.includes('ADMIN') ||
      callerRoles.includes('SUPER_ADMIN');

    let resolvedPatientProfileId = dto.patientProfileId;

    if (isPatient && !isStaffOrAdmin) {
      const patientProfile = await this.repository.findPatientProfileByUserId(callerUserId);
      if (!patientProfile) {
        throw new NotFoundException('Patient profile not found for authenticated user');
      }
      if (dto.patientProfileId && dto.patientProfileId !== patientProfile.id) {
        throw new ForbiddenException('Cannot book appointment on behalf of another patient profile');
      }
      resolvedPatientProfileId = patientProfile.id;
    } else if (!resolvedPatientProfileId) {
      // If doctor is booking or staff is booking, patientProfileId must be supplied
      if (isDoctor) {
        throw new BadRequestException('patientProfileId is required when a doctor schedules an appointment');
      }
      throw new BadRequestException('patientProfileId is required');
    }

    if (!resolvedPatientProfileId) {
      throw new BadRequestException('patientProfileId is required');
    }

    const patient = await this.repository.findPatientProfileById(resolvedPatientProfileId);
    if (!patient) {
      throw new NotFoundException(`Patient profile '${resolvedPatientProfileId}' not found`);
    }

    const doctor = await this.repository.findDoctorProfileById(dto.doctorProfileId);
    if (!doctor) {
      throw new NotFoundException(`Doctor profile '${dto.doctorProfileId}' not found`);
    }

    if (dto.facilityId) {
      const facility = await this.repository.findFacilityById(dto.facilityId);
      if (!facility) {
        throw new NotFoundException(`Facility '${dto.facilityId}' not found`);
      }
    }

    const duration = dto.durationMinutes || 15;
    let appointmentDate = new Date(dto.appointmentDate);
    let startTime = dto.startTime;
    let endTime = dto.endTime || this.calculateEndTime(startTime, duration);

    let slotReserved = false;
    let convertedFromHold = false;
    let targetSlotId = dto.slotId;

    if (dto.holdId) {
      let activeHold = AppointmentService.activeHolds.get(dto.holdId);
      if (!activeHold) {
        const slot = await this.repository.findSlotByHoldId(dto.holdId);
        if (slot && slot.statusReason) {
          const persistedHold = this.parseHoldFromReason(slot.statusReason);
          if (persistedHold && persistedHold.holdId === dto.holdId) {
            activeHold = persistedHold;
            AppointmentService.activeHolds.set(dto.holdId, activeHold);
          }
        }
      }

      if (!activeHold) {
        throw new ConflictException(`Slot hold '${dto.holdId}' not found or expired`);
      }
      const remaining = new Date(activeHold.expiresAt).getTime() - Date.now();
      if (remaining <= 0) {
        AppointmentService.activeHolds.delete(dto.holdId);
        try {
          await this.repository.updateSlotStatus(activeHold.slotId, 'AVAILABLE', null);
        } catch {}
        throw new ConflictException(`Slot hold '${dto.holdId}' has expired`);
      }

      if (activeHold.heldBy && activeHold.heldBy !== callerUserId && !isStaffOrAdmin) {
        throw new ForbiddenException('Cannot book an appointment using a hold created by another user');
      }

      if (dto.slotId && activeHold.slotId !== dto.slotId) {
        throw new BadRequestException(`Hold '${dto.holdId}' belongs to slot '${activeHold.slotId}', not '${dto.slotId}'`);
      }
      targetSlotId = activeHold.slotId;
      dto.slotId = targetSlotId;
      convertedFromHold = true;
    }

    if (targetSlotId) {
      const slot = await this.repository.findSlotById(targetSlotId);
      if (!slot) {
        throw new NotFoundException(`Slot '${targetSlotId}' not found`);
      }

      if (convertedFromHold) {
        if (slot.status !== 'BLOCKED' && slot.status !== 'AVAILABLE') {
          throw new ConflictException(`Selected held slot is no longer available (current status: ${slot.status})`);
        }
        let converted = false;
        if (typeof this.repository.convertHoldToBookedAtomic === 'function') {
          converted = await this.repository.convertHoldToBookedAtomic(targetSlotId, dto.holdId!);
        } else {
          await this.repository.updateSlotStatus(targetSlotId, 'BOOKED', null);
          converted = true;
        }
        if (!converted) {
          throw new ConflictException('Selected held slot is no longer available or hold already converted');
        }
        AppointmentService.activeHolds.delete(dto.holdId!);
        slotReserved = true;
      } else {
        if (slot.status !== 'AVAILABLE') {
          throw new ConflictException(`Selected slot is not available (current status: ${slot.status})`);
        }
        const reserved = await this.repository.reserveSlotAtomic(targetSlotId);
        if (!reserved) {
          throw new ConflictException('Selected slot is no longer available (already booked by another user)');
        }
        slotReserved = true;
      }

      appointmentDate = new Date(slot.slotDate);
      startTime = slot.startTime;
      endTime = slot.endTime;
    }

    try {
      // Verify no doctor schedule collision
      const doctorConflict = await this.repository.checkDoctorConflict(
        dto.doctorProfileId,
        appointmentDate,
        startTime,
        endTime,
      );
      if (doctorConflict) {
        throw new ConflictException('Doctor is already booked for this time window');
      }

      // Verify no patient collision
      const patientConflict = await this.repository.checkPatientConflict(
        resolvedPatientProfileId,
        appointmentDate,
        startTime,
        endTime,
      );
      if (patientConflict) {
        throw new ConflictException('Patient already has an active appointment in this time window');
      }

      const appointmentNumber = await this.repository.generateNextAppointmentNumber();

      let finalNotes = dto.notes || null;
      if (dto.treatmentOfferId) {
        finalNotes = finalNotes
          ? `${finalNotes} | [Treatment Offer: ${dto.treatmentOfferId}]`
          : `[Treatment Offer: ${dto.treatmentOfferId}]`;
      }

      const created = await this.repository.create({
        appointmentNumber,
        patientProfileId: resolvedPatientProfileId,
        doctorProfileId: dto.doctorProfileId,
        facilityId: dto.facilityId || null,
        scheduleId: dto.scheduleId || null,
        slotId: dto.slotId || null,
        appointmentDate,
        startTime,
        endTime,
        durationMinutes: duration,
        type: dto.type || AppointmentType.IN_PERSON,
        status: AppointmentStatus.SCHEDULED,
        reason: dto.reason || null,
        notes: finalNotes,
        bookedBy: callerUserId,
      });

      if (dto.slotId) {
        await this.repository.updateSlotStatus(dto.slotId, 'BOOKED');
      }

      this.logger.log(`[Appointment] Booked ${appointmentNumber} for patient ${resolvedPatientProfileId} with doctor ${dto.doctorProfileId}`);
      return AppointmentMapper.toResponseDto(created);
    } catch (err) {
      if (slotReserved && dto.slotId) {
        try {
          await this.repository.updateSlotStatus(dto.slotId, 'AVAILABLE');
        } catch {}
      }
      throw err;
    }
  }

  // ─── Querying ─────────────────────────────────────────────────────────────

  async getAppointments(
    callerUserId: string,
    callerRoles: string[] = [],
    query: AppointmentQueryDto,
  ): Promise<PaginatedResponseDto<AppointmentResponseDto>> {
    const page = query.page && Number(query.page) > 0 ? Number(query.page) : 1;
    const limit = query.limit && Number(query.limit) > 0 ? Math.min(Number(query.limit), 100) : 20;

    const parseSafeDate = (d?: any): Date | undefined => {
      if (!d) return undefined;
      if (d instanceof Date) return isNaN(d.getTime()) ? undefined : d;
      if (typeof d !== 'string') return undefined;
      const trimmed = d.trim();
      if (!trimmed || trimmed.toLowerCase() === 'string' || trimmed.toLowerCase() === 'null' || trimmed.toLowerCase() === 'undefined') {
        return undefined;
      }
      const parsed = new Date(trimmed);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    };

    const filter: AppointmentFilterOptions = {
      patientProfileId: query.patientProfileId,
      doctorProfileId: query.doctorProfileId,
      facilityId: query.facilityId,
      status: query.status,
      type: query.type,
      fromDate: parseSafeDate(query.fromDate),
      toDate: parseSafeDate(query.toDate),
    };

    const isPatient = callerRoles.includes('PATIENT');
    const isDoctor = callerRoles.includes('DOCTOR');
    const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');
    const isStaff = callerRoles.includes('STAFF') || callerRoles.includes('FACILITY_ADMIN');

    if (isPatient && !isAdmin && !isStaff) {
      const patient = await this.repository.findPatientProfileByUserId(callerUserId);
      if (!patient) throw new NotFoundException('Patient profile not found for authenticated user');
      if (filter.patientProfileId && filter.patientProfileId !== patient.id) {
        throw new ForbiddenException('Cannot view appointments for another patient');
      }
      filter.patientProfileId = patient.id;
    } else if (isDoctor && !isAdmin && !isStaff) {
      const doctor = await this.repository.findDoctorProfileByUserId(callerUserId);
      if (!doctor) throw new NotFoundException('Doctor profile not found for authenticated user');
      if (filter.doctorProfileId && filter.doctorProfileId !== doctor.id) {
        throw new ForbiddenException('Cannot view appointments for another doctor');
      }
      filter.doctorProfileId = doctor.id;
    }

    const { items, total } = await this.repository.findMany(filter, page, limit);

    return {
      data: items.map(AppointmentMapper.toResponseDto),
      meta: buildPaginationMeta(total, page, limit),
    };
  }

  async getAppointmentById(
    callerUserId: string,
    callerRoles: string[] = [],
    id: string,
  ): Promise<AppointmentResponseDto> {
    const appt = await this.repository.findById(id);
    if (!appt) {
      throw new NotFoundException(`Appointment '${id}' not found`);
    }

    const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');
    if (!isAdmin) {
      const isPatient = callerRoles.includes('PATIENT');
      const isDoctor = callerRoles.includes('DOCTOR');

      if (isPatient) {
        const patient = await this.repository.findPatientProfileByUserId(callerUserId);
        if (!patient || patient.id !== appt.patientProfileId) {
          throw new ForbiddenException('You do not have access to view this appointment');
        }
      } else if (isDoctor) {
        const doctor = await this.repository.findDoctorProfileByUserId(callerUserId);
        if (!doctor || doctor.id !== appt.doctorProfileId) {
          throw new ForbiddenException('You do not have access to view this appointment');
        }
      }
    }

    return AppointmentMapper.toResponseDto(appt);
  }

  // ─── Rescheduling ─────────────────────────────────────────────────────────

  async rescheduleAppointment(
    callerUserId: string,
    callerRoles: string[] = [],
    id: string,
    dto: RescheduleAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appt = await this.repository.findById(id);
    if (!appt) {
      throw new NotFoundException(`Appointment '${id}' not found`);
    }

    if (appt.status === AppointmentStatus.CANCELLED || appt.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException(`Cannot reschedule an appointment in '${appt.status}' status`);
    }

    const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');
    if (!isAdmin) {
      const isPatient = callerRoles.includes('PATIENT');
      const isDoctor = callerRoles.includes('DOCTOR');

      if (isPatient) {
        const patient = await this.repository.findPatientProfileByUserId(callerUserId);
        if (!patient || patient.id !== appt.patientProfileId) {
          throw new ForbiddenException('You do not have permission to reschedule this appointment');
        }
      } else if (isDoctor) {
        const doctor = await this.repository.findDoctorProfileByUserId(callerUserId);
        if (!doctor || doctor.id !== appt.doctorProfileId) {
          throw new ForbiddenException('You do not have permission to reschedule this appointment');
        }
      }
    }

    let newDate = new Date(dto.appointmentDate);
    let newStartTime = dto.startTime;
    let newEndTime = dto.endTime || this.calculateEndTime(newStartTime, appt.durationMinutes);

    if (dto.slotId) {
      const slot = await this.repository.findSlotById(dto.slotId);
      if (!slot) {
        throw new NotFoundException(`Target slot '${dto.slotId}' not found`);
      }
      if (slot.status !== 'AVAILABLE' && slot.id !== appt.slotId) {
        throw new ConflictException(`Target slot is not available (status: ${slot.status})`);
      }
      newDate = new Date(slot.slotDate);
      newStartTime = slot.startTime;
      newEndTime = slot.endTime;
    }

    // Check doctor conflict (excluding this appointment)
    const doctorConflict = await this.repository.checkDoctorConflict(
      appt.doctorProfileId,
      newDate,
      newStartTime,
      newEndTime,
      appt.id,
    );
    if (doctorConflict) {
      throw new ConflictException('Doctor has a scheduling conflict in the new time window');
    }

    // Check patient conflict (excluding this appointment)
    const patientConflict = await this.repository.checkPatientConflict(
      appt.patientProfileId,
      newDate,
      newStartTime,
      newEndTime,
      appt.id,
    );
    if (patientConflict) {
      throw new ConflictException('Patient has an appointment conflict in the new time window');
    }

    // Release old slot if changing slot
    if (appt.slotId && appt.slotId !== dto.slotId) {
      await this.repository.updateSlotStatus(appt.slotId, 'AVAILABLE');
    }
    if (dto.slotId && dto.slotId !== appt.slotId) {
      await this.repository.updateSlotStatus(dto.slotId, 'BOOKED');
    }

    const updated = await this.repository.update(appt.id, {
      appointmentDate: newDate,
      startTime: newStartTime,
      endTime: newEndTime,
      slotId: dto.slotId !== undefined ? dto.slotId : appt.slotId,
      status: AppointmentStatus.RESCHEDULED,
      notes: dto.reason ? `${appt.notes || ''} [Rescheduled: ${dto.reason}]`.trim() : appt.notes,
    });

    this.logger.log(`[Appointment] Rescheduled ${appt.appointmentNumber} to ${newDate.toISOString()} ${newStartTime}`);
    return AppointmentMapper.toResponseDto(updated);
  }

  // ─── Cancellation ─────────────────────────────────────────────────────────

  async cancelAppointment(
    callerUserId: string,
    callerRoles: string[] = [],
    id: string,
    dto: CancelAppointmentDto,
  ): Promise<AppointmentResponseDto> {
    const appt = await this.repository.findById(id);
    if (!appt) {
      throw new NotFoundException(`Appointment '${id}' not found`);
    }

    if (appt.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }
    if (appt.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }

    const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');
    if (!isAdmin) {
      const isPatient = callerRoles.includes('PATIENT');
      const isDoctor = callerRoles.includes('DOCTOR');

      if (isPatient) {
        const patient = await this.repository.findPatientProfileByUserId(callerUserId);
        if (!patient || patient.id !== appt.patientProfileId) {
          throw new ForbiddenException('You do not have permission to cancel this appointment');
        }
      } else if (isDoctor) {
        const doctor = await this.repository.findDoctorProfileByUserId(callerUserId);
        if (!doctor || doctor.id !== appt.doctorProfileId) {
          throw new ForbiddenException('You do not have permission to cancel this appointment');
        }
      }
    }

    if (appt.slotId) {
      await this.repository.updateSlotStatus(appt.slotId, 'AVAILABLE');
    }

    const updated = await this.repository.update(appt.id, {
      status: AppointmentStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: dto.cancellationReason,
      cancelledBy: callerUserId,
    });

    this.logger.log(`[Appointment] Cancelled ${appt.appointmentNumber} by ${callerUserId}: ${dto.cancellationReason}`);
    return AppointmentMapper.toResponseDto(updated);
  }

  // ─── Status Updates ───────────────────────────────────────────────────────

  async updateAppointmentStatus(
    callerUserId: string,
    callerRoles: string[] = [],
    id: string,
    dto: UpdateAppointmentStatusDto,
  ): Promise<AppointmentResponseDto> {
    const appt = await this.repository.findById(id);
    if (!appt) {
      throw new NotFoundException(`Appointment '${id}' not found`);
    }

    const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');
    const isDoctor = callerRoles.includes('DOCTOR');
    const isStaff = callerRoles.includes('STAFF') || callerRoles.includes('FACILITY_ADMIN');

    if (!isAdmin && !isDoctor && !isStaff) {
      throw new ForbiddenException('Only clinical and administrative staff can update appointment status directly');
    }

    if (isDoctor && !isAdmin && !isStaff) {
      const doctor = await this.repository.findDoctorProfileByUserId(callerUserId);
      if (!doctor || doctor.id !== appt.doctorProfileId) {
        throw new ForbiddenException('Doctor can only update their own appointments');
      }
    }

    if (appt.status === dto.status) {
      if (dto.notes) {
        const updated = await this.repository.update(appt.id, {
          notes: `${appt.notes || ''} [Notes: ${dto.notes}]`.trim(),
        });
        return AppointmentMapper.toResponseDto(updated);
      }
      return AppointmentMapper.toResponseDto(appt);
    }

    const allowedTransitions = VALID_STATUS_TRANSITIONS[appt.status] || [];
    if (!allowedTransitions.includes(dto.status)) {
      throw new BadRequestException(`Cannot change status of an appointment from '${appt.status}' to '${dto.status}'`);
    }

    // Safety Hold Check: Prevent advancing appointment status while an emergency safety hold is active
    if (dto.status === AppointmentStatus.IN_PROGRESS || dto.status === AppointmentStatus.COMPLETED) {
      if (appt.notes && appt.notes.includes('--- ACTIVE_SAFETY_HOLD ---')) {
        try {
          const parts = appt.notes.split('--- ACTIVE_SAFETY_HOLD ---');
          const holdJson = parts[1].split(/\n--- [A-Z0-9_]+ ---/)[0].trim();
          const hold = JSON.parse(holdJson);
          if (hold && hold.status === 'ACTIVE') {
            throw new ConflictException(
              `Cannot transition appointment '${id}' to '${dto.status}' while an emergency safety hold (${hold.holdId}) is active. The hold must be formally resolved first.`,
            );
          }
        } catch (err) {
          if (err instanceof ConflictException) throw err;
        }
      }
    }

    if (dto.status === AppointmentStatus.CANCELLED && appt.slotId) {
      await this.repository.updateSlotStatus(appt.slotId, 'AVAILABLE');
    }

    const updated = await this.repository.update(appt.id, {
      status: dto.status,
      cancelledAt: dto.status === AppointmentStatus.CANCELLED ? new Date() : undefined,
      cancelledBy: dto.status === AppointmentStatus.CANCELLED ? callerUserId : undefined,
      notes: dto.notes ? `${appt.notes || ''} [Status: ${dto.notes}]`.trim() : appt.notes,
    });

    return AppointmentMapper.toResponseDto(updated);
  }

  // ─── Persona Specific Views ───────────────────────────────────────────────

  async getMyAppointmentsForDoctor(
    callerUserId: string,
    query: AppointmentQueryDto,
  ): Promise<PaginatedResponseDto<AppointmentResponseDto>> {
    const doctor = await this.repository.findDoctorProfileByUserId(callerUserId);
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found for authenticated user');
    }
    const q: AppointmentQueryDto = { ...query, doctorProfileId: doctor.id };
    return this.getAppointments(callerUserId, ['DOCTOR'], q);
  }

  async getMyAppointmentsForPatient(
    callerUserId: string,
    query: AppointmentQueryDto,
  ): Promise<PaginatedResponseDto<AppointmentResponseDto>> {
    const patient = await this.repository.findPatientProfileByUserId(callerUserId);
    if (!patient) {
      throw new NotFoundException('Patient profile not found for authenticated user');
    }
    const q: AppointmentQueryDto = { ...query, patientProfileId: patient.id };
    return this.getAppointments(callerUserId, ['PATIENT'], q);
  }

  private static activeHolds = new Map<string, any>();

  private parseHoldFromReason(reason?: string | null): any {
    if (!reason) return null;
    if (reason.startsWith('HELD_JSON:')) {
      try {
        const parsed = JSON.parse(reason.substring(10));
        return typeof parsed === 'object' && parsed !== null ? parsed : null;
      } catch {
        return null;
      }
    }
    return null;
  }

  // ─── Stage 11: Procedure Suite Temporary Slot Hold ───────────────────────────

  async holdSlot(
    callerUserId: string,
    callerRoles: string[] = [],
    dto: CreateSlotHoldDto,
  ): Promise<SlotHoldResponseDto> {
    const slot = await this.repository.findSlotById(dto.slotId);
    if (!slot) {
      throw new NotFoundException(`Slot '${dto.slotId}' not found`);
    }

    if (slot.status === 'BOOKED') {
      throw new ConflictException('Slot is already booked');
    }

    if (slot.status === 'BLOCKED') {
      let isBlockedByActiveHold = false;
      for (const [existingHoldId, existingHold] of AppointmentService.activeHolds.entries()) {
        if (existingHold.slotId === dto.slotId) {
          const remaining = new Date(existingHold.expiresAt).getTime() - Date.now();
          if (remaining > 0) {
            isBlockedByActiveHold = true;
            throw new ConflictException('Slot is currently held by another booking session');
          } else {
            AppointmentService.activeHolds.delete(existingHoldId);
          }
        }
      }

      if (!isBlockedByActiveHold && slot.statusReason && slot.statusReason.includes('HELD')) {
        const persistedHold = this.parseHoldFromReason(slot.statusReason);
        if (persistedHold) {
          const remaining = new Date(persistedHold.expiresAt).getTime() - Date.now();
          if (remaining > 0) {
            throw new ConflictException('Slot is currently held by another booking session');
          } else {
            // Persisted hold is expired; clear it and unlock slot
            try {
              await this.repository.updateSlotStatus(dto.slotId, 'AVAILABLE', null);
            } catch {}
          }
        }
      }
    }

    const holdId = crypto.randomUUID();
    const durationMinutes = dto.holdDurationMinutes || 45;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const hold: SlotHoldResponseDto = {
      holdId,
      slotId: dto.slotId,
      facilityId: dto.facilityId,
      procedureCategory: dto.procedureCategory || 'PROCEDURE_SUITE',
      status: 'HELD',
      heldAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      remainingSeconds: durationMinutes * 60,
      isExpired: false,
    };

    const fullHold = { ...hold, heldBy: callerUserId };
    const serializedHold = `HELD_JSON:${JSON.stringify(fullHold)}`;

    let acquired = false;
    try {
      if (typeof this.repository.holdSlotAtomic === 'function') {
        acquired = await this.repository.holdSlotAtomic(dto.slotId, serializedHold);
      } else {
        await this.repository.updateSlotStatus(dto.slotId, 'BLOCKED', serializedHold);
        acquired = true;
      }
    } catch (err) {
      this.logger.warn(`Could not hold slot atomically in DB: ${(err as Error)?.message}`);
      if (typeof this.repository.holdSlotAtomic !== 'function') {
        acquired = true;
      }
    }

    if (!acquired) {
      throw new ConflictException('Slot is currently held by another booking session');
    }

    AppointmentService.activeHolds.set(holdId, fullHold);
    return hold;
  }

  async getHold(holdId: string): Promise<SlotHoldResponseDto> {
    let hold = AppointmentService.activeHolds.get(holdId);
    if (!hold) {
      const slot = await this.repository.findSlotByHoldId(holdId);
      if (slot && slot.statusReason) {
        const persistedHold = this.parseHoldFromReason(slot.statusReason);
        if (persistedHold && persistedHold.holdId === holdId) {
          hold = persistedHold;
          AppointmentService.activeHolds.set(holdId, hold);
        }
      }
    }

    if (!hold) {
      throw new NotFoundException(`Slot hold '${holdId}' not found or expired`);
    }

    const diffMs = new Date(hold.expiresAt).getTime() - Date.now();
    const remainingSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const isExpired = remainingSeconds <= 0;

    if (isExpired) {
      try {
        await this.repository.updateSlotStatus(hold.slotId, 'AVAILABLE', null);
      } catch (err) {
        this.logger.warn(`Could not reset expired slot status: ${(err as Error)?.message}`);
      }
      AppointmentService.activeHolds.delete(holdId);
    }

    return {
      holdId: hold.holdId,
      slotId: hold.slotId,
      facilityId: hold.facilityId,
      procedureCategory: hold.procedureCategory,
      status: isExpired ? 'EXPIRED' : hold.status,
      heldAt: hold.heldAt,
      expiresAt: hold.expiresAt,
      remainingSeconds,
      isExpired,
    };
  }

  async releaseHold(callerUserId: string, holdId: string, callerRoles: string[] = []): Promise<any> {
    let hold = AppointmentService.activeHolds.get(holdId);
    if (!hold) {
      const slot = await this.repository.findSlotByHoldId(holdId);
      if (slot && slot.statusReason) {
        const persistedHold = this.parseHoldFromReason(slot.statusReason);
        if (persistedHold && persistedHold.holdId === holdId) {
          hold = persistedHold;
        }
      }
    }

    if (hold) {
      const isAdmin = callerRoles.includes('ADMIN') || callerRoles.includes('SUPER_ADMIN');
      const isStaff = callerRoles.includes('STAFF');
      if (hold.heldBy && hold.heldBy !== callerUserId && !isAdmin && !isStaff) {
        throw new ForbiddenException('Cannot release a hold created by another user');
      }

      try {
        if (typeof this.repository.releaseHoldAtomic === 'function') {
          await this.repository.releaseHoldAtomic(hold.slotId, holdId);
        } else {
          await this.repository.updateSlotStatus(hold.slotId, 'AVAILABLE', null);
        }
      } catch (err) {
        this.logger.warn(`Could not reset slot status: ${(err as Error)?.message}`);
      }
      AppointmentService.activeHolds.delete(holdId);
    }

    return {
      holdId,
      status: 'RELEASED',
      releasedAt: new Date().toISOString(),
    };
  }

  // ─── Stage 14: Pre-Op Day -1 Readiness Checklist & Decision ──────────────────

  async getReadiness(appointmentId: string): Promise<any> {
    const appointment = await this.repository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException(`Appointment '${appointmentId}' not found`);
    }

    if (appointment.notes && appointment.notes.includes('--- READINESS ---')) {
      try {
        const parts = appointment.notes.split('--- READINESS ---');
        const rawSection = parts[1].split(/\n--- [A-Z0-9_]+ ---/)[0].trim();
        const firstBrace = rawSection.indexOf('{');
        const lastBrace = rawSection.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          return JSON.parse(rawSection.substring(firstBrace, lastBrace + 1));
        }
      } catch (err) {
        // Fallback to default
      }
    }

    return {
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      fastingConfirmed: false,
      medicationHoldConfirmed: false,
      transportationArranged: false,
      consentVerified: false,
      vitalsWithinThreshold: false,
      decision: 'PENDING',
      notes: null,
      decidedBy: null,
      decidedAt: null,
    };
  }

  async updateReadiness(
    callerUserId: string,
    appointmentId: string,
    dto: UpdateReadinessDto,
  ): Promise<any> {
    const appointment = await this.repository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException(`Appointment '${appointmentId}' not found`);
    }

    const current = await this.getReadiness(appointmentId);
    const now = new Date().toISOString();

    const sanitizedNotes = dto.notes !== undefined ? dto.notes.replace(/--- [A-Z0-9_]+ ---/g, '').trim() : current.notes;

    const updated = {
      ...current,
      fastingConfirmed: dto.fastingConfirmed !== undefined ? dto.fastingConfirmed : current.fastingConfirmed,
      medicationHoldConfirmed: dto.medicationHoldConfirmed !== undefined ? dto.medicationHoldConfirmed : current.medicationHoldConfirmed,
      transportationArranged: dto.transportationArranged !== undefined ? dto.transportationArranged : current.transportationArranged,
      consentVerified: dto.consentVerified !== undefined ? dto.consentVerified : current.consentVerified,
      vitalsWithinThreshold: dto.vitalsWithinThreshold !== undefined ? dto.vitalsWithinThreshold : current.vitalsWithinThreshold,
      decision: dto.decision || current.decision,
      notes: sanitizedNotes,
      decidedBy: dto.decision ? callerUserId : current.decidedBy,
      decidedAt: dto.decision ? now : current.decidedAt,
    };

    if (updated.decision === 'GO') {
      const missingItems: string[] = [];
      if (!updated.consentVerified) missingItems.push('consentVerified');
      if (!updated.fastingConfirmed) missingItems.push('fastingConfirmed');
      if (!updated.medicationHoldConfirmed) missingItems.push('medicationHoldConfirmed');
      if (!updated.vitalsWithinThreshold) missingItems.push('vitalsWithinThreshold');
      if (!updated.transportationArranged) missingItems.push('transportationArranged');
      if (missingItems.length > 0) {
        throw new BadRequestException(
          `Cannot issue 'GO' readiness decision: all mandatory pre-operative checklist items must be confirmed true. Unconfirmed items: [${missingItems.join(', ')}]`,
        );
      }
    }

    const regex = /--- READINESS ---[\s\S]*?(?=(\n--- [A-Z0-9_]+ ---|$))/;
    let baseNotes = (appointment.notes || '').replace(regex, '').trim();
    const newNotes = `${baseNotes ? baseNotes + '\n\n' : ''}--- READINESS ---\n${JSON.stringify(updated, null, 2)}`.trim();

    await this.repository.update(appointment.id, { notes: newNotes });
    return updated;
  }

  // ─── Stage 15: Day of Procedure Patient Check-In ─────────────────────────────

  async checkIn(
    callerUserId: string,
    appointmentId: string,
    dto: AppointmentCheckInDto,
  ): Promise<any> {
    const appointment = await this.repository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException(`Appointment '${appointmentId}' not found`);
    }

    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot check in cancelled appointment');
    }

    if (dto.vitals) {
      const v = dto.vitals;
      if (v.heartRate !== undefined && (typeof v.heartRate !== 'number' || v.heartRate < 20 || v.heartRate > 300)) {
        throw new BadRequestException('Heart rate must be a valid number between 20 and 300 bpm');
      }
      if (v.oxygenSaturation !== undefined && (typeof v.oxygenSaturation !== 'number' || v.oxygenSaturation < 50 || v.oxygenSaturation > 100)) {
        throw new BadRequestException('Oxygen saturation (SpO2) must be between 50% and 100%');
      }
      if (v.temperature !== undefined && (typeof v.temperature !== 'number' || v.temperature < 30 || v.temperature > 45)) {
        throw new BadRequestException('Temperature must be between 30°C and 45°C');
      }
    }

    // Safety Hold Check: Prevent check-in and transition to IN_PROGRESS if appointment is on active hold
    if (appointment.notes && appointment.notes.includes('--- ACTIVE_SAFETY_HOLD ---')) {
      try {
        const parts = appointment.notes.split('--- ACTIVE_SAFETY_HOLD ---');
        const holdJson = parts[1].split(/\n--- [A-Z0-9_]+ ---/)[0].trim();
        const hold = JSON.parse(holdJson);
        if (hold && hold.status === 'ACTIVE') {
          throw new ConflictException(
            `Cannot check in appointment '${appointmentId}' while an emergency safety hold (${hold.holdId}) is active. The hold must be formally resolved first.`,
          );
        }
      } catch (err) {
        if (err instanceof ConflictException) throw err;
      }
    }

    const sanitizedIntakeNotes = (dto.notes || 'Patient checked in for scheduled procedure')
      .replace(/--- [A-Z0-9_]+ ---/g, '')
      .trim();

    const checkInRecord = {
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      status: AppointmentStatus.IN_PROGRESS,
      checkedInAt: dto.checkInTime || new Date().toISOString(),
      checkedInBy: callerUserId,
      facilityId: dto.facilityId || appointment.facilityId,
      bedOrBayNumber: dto.bedOrBayNumber || 'PRE-OP-BAY-1',
      vitals: dto.vitals || null,
      intakeNotes: sanitizedIntakeNotes,
    };

    const regex = /--- CHECK_IN ---[\s\S]*?(?=(\n--- [A-Z0-9_]+ ---|$))/;
    let baseNotes = (appointment.notes || '').replace(regex, '').trim();
    const newNotes = `${baseNotes ? baseNotes + '\n\n' : ''}--- CHECK_IN ---\n${JSON.stringify(checkInRecord, null, 2)}`.trim();

    await this.repository.update(appointment.id, {
      status: AppointmentStatus.IN_PROGRESS,
      notes: newNotes,
    });

    return checkInRecord;
  }

  async getCheckInRecord(
    callerUserIdOrApptId: string,
    callerRolesOrApptId?: string[] | string,
    appointmentId?: string,
  ): Promise<any> {
    let resolvedAppointmentId: string;
    let callerUserId: string | undefined;
    let roles: string[] = [];

    if (!appointmentId) {
      resolvedAppointmentId = callerUserIdOrApptId;
    } else {
      callerUserId = callerUserIdOrApptId;
      roles = Array.isArray(callerRolesOrApptId) ? callerRolesOrApptId : [];
      resolvedAppointmentId = appointmentId;
    }

    const appointment = await this.repository.findById(resolvedAppointmentId);
    if (!appointment) {
      throw new NotFoundException(`Appointment '${resolvedAppointmentId}' not found`);
    }

    if (callerUserId) {
      const isAdmin = roles.includes('ADMIN') || roles.includes('SUPER_ADMIN');
      const isStaff = roles.includes('STAFF') || roles.includes('FACILITY_ADMIN') || roles.includes('NURSE');
      const isDoctor = roles.includes('DOCTOR') || roles.includes('PRACTITIONER');
      const isPatient = roles.includes('PATIENT');

      if (!isAdmin && !isStaff) {
        if (isDoctor) {
          const doctor = await this.repository.findDoctorProfileByUserId(callerUserId);
          if (!doctor || doctor.id !== appointment.doctorProfileId) {
            throw new ForbiddenException('Doctor can only view check-in records for their own appointments');
          }
        } else if (isPatient) {
          const patient = await this.repository.findPatientProfileByUserId(callerUserId);
          if (!patient || patient.id !== appointment.patientProfileId) {
            throw new ForbiddenException('Patients can only view their own check-in records');
          }
        }
      }
    }

    if (appointment.notes && appointment.notes.includes('--- CHECK_IN ---')) {
      try {
        const parts = appointment.notes.split('--- CHECK_IN ---');
        const rawSection = parts[1].split(/\n--- [A-Z0-9_]+ ---/)[0].trim();
        const firstBrace = rawSection.indexOf('{');
        const lastBrace = rawSection.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          return JSON.parse(rawSection.substring(firstBrace, lastBrace + 1));
        }
      } catch (err) {
        // Fallback to reconstructed check-in
      }
    }

    if (appointment.status === AppointmentStatus.IN_PROGRESS || appointment.status === AppointmentStatus.COMPLETED) {
      return {
        appointmentId: appointment.id,
        appointmentNumber: appointment.appointmentNumber,
        status: appointment.status,
        checkedInAt: appointment.updatedAt ? new Date(appointment.updatedAt).toISOString() : new Date().toISOString(),
        checkedInBy: 'CLINICAL_STAFF',
        facilityId: appointment.facilityId,
        bedOrBayNumber: 'PRE-OP-BAY-1',
        vitals: null,
        intakeNotes: 'Patient checked in for scheduled procedure',
      };
    }

    throw new NotFoundException(`No check-in record found for appointment '${appointmentId}'. Patient has not checked in yet.`);
  }

  // ─── Stage 16: Cath Lab / Intra-Op Safety Checklist ──────────────────────────

  async getCathLabChecklist(appointmentId: string): Promise<any> {
    const appointment = await this.repository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException(`Appointment '${appointmentId}' not found`);
    }

    if (appointment.notes && appointment.notes.includes('--- CATH_LAB_CHECKLIST ---')) {
      try {
        const parts = appointment.notes.split('--- CATH_LAB_CHECKLIST ---');
        const rawSection = parts[1].split(/\n--- [A-Z0-9_]+ ---/)[0].trim();
        const firstBrace = rawSection.indexOf('{');
        const lastBrace = rawSection.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace > firstBrace) {
          return JSON.parse(rawSection.substring(firstBrace, lastBrace + 1));
        }
      } catch (err) {
        // Fallback to default
      }
    }

    return {
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      overallStatus: 'INCOMPLETE',
      signIn: {
        patientIdentityConfirmed: false,
        siteMarked: false,
        anesthesiaSafetyCheckCompleted: false,
        pulseOximeterOn: false,
        allergiesChecked: false,
        completedBy: null,
        completedAt: null,
      },
      timeOut: {
        allTeamMembersIntroduced: false,
        patientNameProcedureSiteConfirmed: false,
        anticipatedCriticalEventsReviewed: false,
        antibioticProphylaxisAdministered: false,
        imagingDisplayed: false,
        completedBy: null,
        completedAt: null,
      },
      signOut: {
        procedureNameRecorded: false,
        instrumentSpongeNeedleCountsCorrect: false,
        specimenLabeled: false,
        equipmentProblemsAddressed: false,
        keyPostOpConcernsReviewed: false,
        completedBy: null,
        completedAt: null,
      },
      notes: null,
      lastUpdatedBy: null,
      lastUpdatedAt: null,
    };
  }

  async updateCathLabChecklist(
    callerUserId: string,
    appointmentId: string,
    dto: UpdateCathLabChecklistDto,
  ): Promise<any> {
    const appointment = await this.repository.findById(appointmentId);
    if (!appointment) {
      throw new NotFoundException(`Appointment '${appointmentId}' not found`);
    }

    const current = await this.getCathLabChecklist(appointmentId);
    const now = new Date().toISOString();

    const updatedSignIn = dto.signIn
      ? { ...current.signIn, ...dto.signIn, completedBy: callerUserId, completedAt: now }
      : current.signIn;
    const updatedTimeOut = dto.timeOut
      ? { ...current.timeOut, ...dto.timeOut, completedBy: callerUserId, completedAt: now }
      : current.timeOut;
    const updatedSignOut = dto.signOut
      ? { ...current.signOut, ...dto.signOut, completedBy: callerUserId, completedAt: now }
      : current.signOut;

    const allSignInChecked = Boolean(
      updatedSignIn.patientIdentityConfirmed &&
        updatedSignIn.siteMarked &&
        updatedSignIn.anesthesiaSafetyCheckCompleted &&
        updatedSignIn.pulseOximeterOn &&
        updatedSignIn.allergiesChecked,
    );
    const allTimeOutChecked = Boolean(
      updatedTimeOut.allTeamMembersIntroduced &&
        updatedTimeOut.patientNameProcedureSiteConfirmed &&
        updatedTimeOut.anticipatedCriticalEventsReviewed &&
        updatedTimeOut.antibioticProphylaxisAdministered &&
        updatedTimeOut.imagingDisplayed,
    );
    const allSignOutChecked = Boolean(
      updatedSignOut.procedureNameRecorded &&
        updatedSignOut.instrumentSpongeNeedleCountsCorrect &&
        updatedSignOut.specimenLabeled &&
        updatedSignOut.equipmentProblemsAddressed &&
        updatedSignOut.keyPostOpConcernsReviewed,
    );

    const overallStatus =
      dto.overallStatus ||
      (allSignInChecked && allTimeOutChecked && allSignOutChecked ? 'COMPLETED' : 'INCOMPLETE');

    const sanitizedNotes = dto.notes !== undefined ? dto.notes.replace(/--- [A-Z0-9_]+ ---/g, '').trim() : current.notes;

    const result = {
      appointmentId: appointment.id,
      appointmentNumber: appointment.appointmentNumber,
      overallStatus,
      signIn: updatedSignIn,
      timeOut: updatedTimeOut,
      signOut: updatedSignOut,
      notes: sanitizedNotes,
      lastUpdatedBy: callerUserId,
      lastUpdatedAt: now,
    };

    const regex = /--- CATH_LAB_CHECKLIST ---[\s\S]*?(?=(\n--- [A-Z0-9_]+ ---|$))/;
    let baseNotes = (appointment.notes || '').replace(regex, '').trim();
    const newNotes = `${baseNotes ? baseNotes + '\n\n' : ''}--- CATH_LAB_CHECKLIST ---\n${JSON.stringify(result, null, 2)}`.trim();

    await this.repository.update(appointment.id, { notes: newNotes });
    return result;
  }
}
