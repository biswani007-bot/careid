import { AppointmentEntity, AppointmentStatus, AppointmentType } from '../entities/appointment.entity';

export interface AppointmentFilterOptions {
  patientProfileId?: string;
  doctorProfileId?: string;
  facilityId?: string;
  status?: AppointmentStatus;
  type?: AppointmentType;
  fromDate?: Date;
  toDate?: Date;
  includeDeleted?: boolean;
}

export interface IAppointmentRepository {
  create(data: Partial<AppointmentEntity>): Promise<AppointmentEntity>;
  findById(id: string): Promise<AppointmentEntity | null>;
  findByAppointmentNumber(appointmentNumber: string): Promise<AppointmentEntity | null>;
  findMany(
    filter: AppointmentFilterOptions,
    page: number,
    limit: number,
  ): Promise<{ items: AppointmentEntity[]; total: number }>;
  update(id: string, data: Partial<AppointmentEntity>): Promise<AppointmentEntity>;
  checkDoctorConflict(
    doctorProfileId: string,
    appointmentDate: Date,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ): Promise<boolean>;
  checkPatientConflict(
    patientProfileId: string,
    appointmentDate: Date,
    startTime: string,
    endTime: string,
    excludeAppointmentId?: string,
  ): Promise<boolean>;
  findPatientProfileByUserId(userId: string): Promise<any>;
  findDoctorProfileByUserId(userId: string): Promise<any>;
  findPatientProfileById(patientProfileId: string): Promise<any>;
  findDoctorProfileById(doctorProfileId: string): Promise<any>;
  findFacilityById(facilityId: string): Promise<any>;
  findSlotById(slotId: string): Promise<any>;
  findSlotByHoldId(holdId: string): Promise<any>;
  updateSlotStatus(slotId: string, status: string, statusReason?: string | null): Promise<void>;
  reserveSlotAtomic(slotId: string): Promise<boolean>;
  generateNextAppointmentNumber(): Promise<string>;
}
