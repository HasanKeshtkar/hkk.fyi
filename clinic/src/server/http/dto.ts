import type { AppointmentDto, UserDto } from '../../shared/api.js';
import type { Appointment, User } from '../db/schema.js';

export function appointmentDto(a: Appointment): AppointmentDto {
  return {
    id: a.id,
    startAt: a.startAt.toISOString(),
    patientName: a.patientName,
    patientPhone: a.patientPhone,
    status: a.status,
    version: a.version,
    createdBy: a.createdBy,
    updatedBy: a.updatedBy,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export function userDto(u: User): UserDto {
  return { id: u.id, name: u.name, role: u.role };
}
