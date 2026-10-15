// Request schemas and response shapes shared by the server and the web client.
import { z } from 'zod';
import type { DaySchedule, WeeklyDay, DateOverride } from './schedule.js';
import { isHalfHourTime, isIsoDate } from './time.js';

export type Role = 'doctor' | 'secretary';

export interface UserDto {
  id: string;
  name: string;
  role: Role;
}

export interface AppointmentDto {
  id: string;
  startAt: string; // ISO instant
  patientName: string;
  patientPhone: string;
  status: 'scheduled' | 'cancelled';
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface DayAppointmentDto extends AppointmentDto {
  /** false when the current working hours no longer cover this appointment (shown with a warning) */
  withinHours: boolean;
}

export interface MeResponse {
  user: UserDto;
  users: UserDto[];
}

export interface DayResponse {
  date: string;
  schedule: DaySchedule;
  slots: string[]; // ISO instants of each bookable slot start
  appointments: DayAppointmentDto[];
}

export interface ScheduleResponse {
  weekly: WeeklyDay[];
  overrides: DateOverride[];
}

export type ApiErrorCode =
  | 'validation'
  | 'invalid_credentials'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'slot_taken'
  | 'version_conflict'
  | 'cancelled'
  | 'day_closed'
  | 'outside_hours'
  | 'rate_limited'
  | 'bad_request'
  | 'server_error';

export interface ApiError {
  error: ApiErrorCode;
  field?: string;
  /** slot_taken: the appointment holding the slot (null if it vanished meanwhile) */
  existing?: AppointmentDto | null;
  /** version_conflict / cancelled: the latest saved appointment */
  current?: AppointmentDto;
}

const isoDate = z.string().refine(isIsoDate, 'invalid date');
const instant = z.iso.datetime({ offset: true });
const startTime = z.string().refine((s) => isHalfHourTime(s), 'invalid time');
const endTime = z.string().refine((s) => isHalfHourTime(s, { allowEndOfDay: true }), 'invalid time');
const version = z.number().int().min(1);

export const LoginBody = z.object({
  role: z.enum(['doctor', 'secretary']),
  password: z.string().min(1).max(200),
});

export const CreateAppointmentBody = z.object({
  startAt: instant,
  patientName: z.string().max(300),
  patientPhone: z.string().max(50),
});

export const UpdateAppointmentBody = z
  .object({
    version,
    startAt: instant.optional(),
    patientName: z.string().max(300).optional(),
    patientPhone: z.string().max(50).optional(),
  })
  .refine((b) => b.startAt !== undefined || b.patientName !== undefined || b.patientPhone !== undefined, {
    message: 'nothing to change',
  });

export const CancelAppointmentBody = z.object({ version });

export const DayQuery = z.object({ date: isoDate });

export const WeeklyDayParams = z.object({ weekday: z.coerce.number().int().min(0).max(6) });

export const WeeklyDayBody = z.object({
  isOpen: z.boolean(),
  startTime,
  endTime,
});

export const OverrideParams = z.object({ date: isoDate });

export const OverrideBody = z.object({
  isOpen: z.boolean(),
  startTime: startTime.nullish(),
  endTime: endTime.nullish(),
  note: z.string().max(400).nullish(),
});

export const IdParams = z.object({ id: z.string().max(100) });
