import type {
  ApiError,
  ApiResult,
  AppointmentDto,
  DayResponse,
  MeResponse,
  NotificationsResponse,
  ScheduleResponse,
} from '../../shared/api';
import type { DateOverrideRecord, WeeklyDayRecord } from '../../shared/schedule';
import { connection } from './connection';

export type { ApiResult };

/** Hook for the session layer: called on any 401 so the app can send the user to the login screen. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: (() => void) | null): void {
  onUnauthorized = fn;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    connection.reportNetworkFailure();
    return { ok: false, kind: 'network' };
  }
  connection.reportReachable();
  if (res.status === 204) return { ok: true, status: 204, data: undefined as T };
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // proxies and gateways can answer with HTML
  }
  if (res.ok) return { ok: true, status: res.status, data: json as T };
  const error = (json && typeof json === 'object' && 'error' in json ? json : { error: 'server_error' }) as ApiError;
  if (res.status === 401 && path !== '/api/auth/login') onUnauthorized?.();
  return { ok: false, kind: 'http', status: res.status, error };
}

export const api = {
  me: () => request<MeResponse>('GET', '/api/me'),
  login: (role: 'doctor' | 'secretary', password: string) =>
    request<MeResponse>('POST', '/api/auth/login', { role, password }),
  logout: () => request<{ ok: true }>('POST', '/api/auth/logout'),

  day: (date: string) => request<DayResponse>('GET', `/api/day?date=${encodeURIComponent(date)}`),
  createAppointment: (body: { startAt: string; patientName: string; patientPhone: string }) =>
    request<AppointmentDto>('POST', '/api/appointments', body),
  updateAppointment: (
    id: string,
    body: { version: number; startAt?: string; patientName?: string; patientPhone?: string },
  ) => request<AppointmentDto>('PATCH', `/api/appointments/${encodeURIComponent(id)}`, body),
  cancelAppointment: (id: string, version: number) =>
    request<AppointmentDto>('POST', `/api/appointments/${encodeURIComponent(id)}/cancel`, { version }),

  schedule: () => request<ScheduleResponse>('GET', '/api/schedule'),
  setWeekday: (weekday: number, body: { isOpen: boolean; startTime: string; endTime: string; version: number | null }) =>
    request<WeeklyDayRecord>('PUT', `/api/schedule/weekly/${weekday}`, body),
  setOverride: (
    date: string,
    body: { isOpen: boolean; startTime: string | null; endTime: string | null; note: string | null; version: number | null },
  ) => request<DateOverrideRecord>('PUT', `/api/schedule/overrides/${date}`, body),
  deleteOverride: (date: string, version: number) =>
    request<void>('DELETE', `/api/schedule/overrides/${date}?version=${version}`),

  notifications: () => request<NotificationsResponse>('GET', '/api/notifications'),
  markNotificationsRead: (body: { all: true } | { ids: string[] }) =>
    request<{ ids: string[] }>('POST', '/api/notifications/read', body),
};
