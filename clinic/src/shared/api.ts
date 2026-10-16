// Request schemas and response shapes shared by the server and the web client.
import { z } from 'zod';
import type { DateOverrideRecord, DaySchedule, WeeklyDayRecord } from './schedule';
import { isHalfHourTime, isIsoDate } from './time';

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

export type NotificationType = 'created' | 'updated' | 'cancelled';

export interface NotificationAppointment {
  startAt: string;
  patientName: string;
  patientPhone: string;
}

export interface NotificationPayload {
  /** who made the change */
  by: string;
  before: NotificationAppointment | null;
  after: NotificationAppointment;
}

export interface NotificationDto {
  id: string;
  type: NotificationType;
  appointmentId: string;
  payload: NotificationPayload;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationsResponse {
  items: NotificationDto[];
  /** all unread, even beyond the listed items */
  count: number;
}

export interface BackupInfo {
  name: string;
  bytes: number;
  /** ISO instant it was written */
  at: string;
}

export interface BackupsResponse {
  /** daily backups are configured on the server */
  enabled: boolean;
  /** newest daily backup */
  latest: BackupInfo | null;
  /** no daily backup for more than a day and a half: something is wrong */
  stale: boolean;
}

/** Realtime events (socket.io), server → client. */
export interface ServerEvents {
  appointment: (e: { appointment: AppointmentDto; action: 'create' | 'update' | 'cancel'; by: string }) => void;
  schedule: (e: { by: string }) => void;
  notification: (n: NotificationDto) => void;
  'notifications:read': (e: { ids: string[] }) => void;
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
  weekly: WeeklyDayRecord[];
  overrides: DateOverrideRecord[];
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
  | 'schedule_conflict'
  | 'day_closed'
  | 'outside_hours'
  | 'rate_limited'
  | 'bad_request'
  | 'server_error';

/**
 * The outcome of an API call as the web client sees it. `network` means the request may or may
 * not have reached the server: for a write, the caller must treat the result as unknown.
 */
export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; kind: 'http'; status: number; error: ApiError }
  | { ok: false; kind: 'network' };

export interface ApiError {
  error: ApiErrorCode;
  field?: string;
  /** slot_taken: the appointment holding the slot (null if it vanished meanwhile) */
  existing?: AppointmentDto | null;
  /** version_conflict / cancelled: the latest saved appointment */
  current?: AppointmentDto;
  /** schedule_conflict: the hours saved now (null: the override was removed meanwhile) */
  currentSchedule?: WeeklyDayRecord | DateOverrideRecord | null;
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

export const WeeklyDayParams = z.object({
  weekday: z
    .string()
    .regex(/^[0-6]$/)
    .transform(Number),
});

/**
 * `version`: the version of the row as loaded (null if that weekday had no row);
 * a stale one gets 409 schedule_conflict.
 */
export const WeeklyDayBody = z.object({
  isOpen: z.boolean(),
  startTime,
  endTime,
  version: version.nullable(),
});

export const OverrideParams = z.object({ date: isoDate });

/** `version`: the override's version as loaded, or null when there was no override for that date. */
export const OverrideBody = z.object({
  isOpen: z.boolean(),
  startTime: startTime.nullish(),
  endTime: endTime.nullish(),
  note: z.string().max(400).nullish(),
  version: version.nullable(),
});

export const DeleteOverrideQuery = z.object({
  version: z
    .string()
    .regex(/^[1-9]\d{0,9}$/)
    .transform(Number),
});

export const IdParams = z.object({ id: z.string().max(100) });

export const MarkReadBody = z.union([
  z.object({ all: z.literal(true) }),
  z.object({ ids: z.array(z.uuid()).min(1).max(200) }),
]);
