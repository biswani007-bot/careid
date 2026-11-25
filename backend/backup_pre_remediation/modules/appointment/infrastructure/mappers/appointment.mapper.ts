import { AppointmentEntity } from '../../domain/entities/appointment.entity';
import { AppointmentResponseDto } from '../../presentation/dto/appointment.dto';

function toSafeDateString(d: any): string {
  if (!d) return '';
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) {
    return String(d).split('T')[0];
  }
  return date.toISOString().split('T')[0];
}

function toSafeIsoString(d: any): string {
  if (!d) return new Date().toISOString();
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) {
    return new Date().toISOString();
  }
  return date.toISOString();
}

function toSafeOptionalIsoString(d: any): string | undefined {
  if (!d) return undefined;
  const date = d instanceof Date ? d : new Date(d);
  if (isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
}

export class AppointmentMapper {
  static toResponseDto(entity: AppointmentEntity): AppointmentResponseDto {
    const dto = new AppointmentResponseDto();
    dto.id = entity.id;
    dto.appointmentNumber = entity.appointmentNumber;
    dto.patientProfileId = entity.patientProfileId;
    dto.doctorProfileId = entity.doctorProfileId;
    dto.facilityId = entity.facilityId || undefined;
    dto.scheduleId = entity.scheduleId || undefined;
    dto.slotId = entity.slotId || undefined;
    dto.appointmentDate = toSafeDateString(entity.appointmentDate);
    dto.startTime = entity.startTime;
    dto.endTime = entity.endTime;
    dto.durationMinutes = entity.durationMinutes;
    dto.type = entity.type;
    dto.status = entity.status;
    dto.reason = entity.reason || undefined;
    dto.notes = entity.notes || undefined;
    dto.bookedBy = entity.bookedBy || undefined;
    dto.cancelledAt = toSafeOptionalIsoString(entity.cancelledAt);
    dto.cancellationReason = entity.cancellationReason || undefined;
    dto.cancelledBy = entity.cancelledBy || undefined;
    dto.rescheduledFromId = entity.rescheduledFromId || undefined;
    dto.createdAt = toSafeIsoString(entity.createdAt);
    dto.updatedAt = toSafeIsoString(entity.updatedAt);

    if (entity.patientProfile) {
      const pat = entity.patientProfile as any;
      dto.patient = {
        id: pat.id,
        firstName: pat.firstName || '',
        lastName: pat.lastName || '',
        mrn: pat.patientNumber || pat.mrn || undefined,
        gender: pat.gender || undefined,
        phone: pat.user?.phone || undefined,
      };
    }

    if (entity.doctorProfile) {
      const doc = entity.doctorProfile as any;
      let firstName = doc.firstName || '';
      let lastName = doc.lastName || '';
      if (!firstName && doc.fullName) {
        const parts = doc.fullName.trim().split(/\s+/);
        firstName = parts[0] || '';
        lastName = parts.slice(1).join(' ') || '';
      }
      dto.doctor = {
        id: doc.id,
        firstName,
        lastName,
        specialization: doc.specialization || doc.primarySpecialization || undefined,
        registrationNumber: doc.registrationNumber || undefined,
        phone: doc.user?.phone || undefined,
      };
    }

    if (entity.facility) {
      dto.facility = {
        id: entity.facility.id,
        name: entity.facility.name,
        city: entity.facility.city || undefined,
        phone: entity.facility.phone || undefined,
      };
    }

    return dto;
  }
}
