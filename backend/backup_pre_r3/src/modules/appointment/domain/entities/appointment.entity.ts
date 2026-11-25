export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  RESCHEDULED = 'RESCHEDULED',
  NO_SHOW = 'NO_SHOW',
}

export enum AppointmentType {
  IN_PERSON = 'IN_PERSON',
  TELECONSULTATION = 'TELECONSULTATION',
  HOME_VISIT = 'HOME_VISIT',
}

export class AppointmentEntity {
  id!: string;
  appointmentNumber!: string;
  patientProfileId!: string;
  doctorProfileId!: string;
  facilityId?: string | null;
  scheduleId?: string | null;
  slotId?: string | null;
  appointmentDate!: Date;
  startTime!: string;
  endTime!: string;
  durationMinutes!: number;
  type!: AppointmentType;
  status!: AppointmentStatus;
  reason?: string | null;
  notes?: string | null;
  bookedBy?: string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  rescheduledFromId?: string | null;
  isDeleted!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  patientProfile?: {
    id: string;
    firstName: string;
    lastName: string;
    mrn?: string | null;
    gender?: string | null;
    dateOfBirth?: Date | null;
    user?: {
      phone?: string | null;
      email?: string | null;
    };
  };

  doctorProfile?: {
    id: string;
    firstName: string;
    lastName: string;
    specialization?: string | null;
    registrationNumber?: string | null;
    user?: {
      phone?: string | null;
      email?: string | null;
    };
  };

  facility?: {
    id: string;
    name: string;
    address?: string | null;
    city?: string | null;
    phone?: string | null;
  };

  slot?: {
    id: string;
    slotDate: Date;
    startTime: string;
    endTime: string;
    status: string;
  };
}
