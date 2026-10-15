import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import type { ApiError } from '../../shared/api.js';
import {
  AppointmentCancelledError,
  AppointmentNotFoundError,
  AppointmentValidationError,
  OutsideHoursError,
  SlotTakenError,
  VersionConflictError,
} from '../appointments/service.js';
import { DatabaseError } from '../db/errors.js';
import { OverrideNotFoundError, ScheduleConflictError, ScheduleValidationError } from '../schedule/service.js';
import { appointmentDto } from './dto.js';

export class HttpError extends Error {
  constructor(
    readonly statusCode: number,
    readonly body: ApiError,
  ) {
    super(body.error);
  }
}

function toResponse(err: unknown): { status: number; body: ApiError } | null {
  if (err instanceof HttpError) return { status: err.statusCode, body: err.body };
  if (err instanceof ZodError) {
    const path = err.issues[0]?.path.join('.');
    return { status: 400, body: { error: 'validation', ...(path ? { field: path } : {}) } };
  }
  if (err instanceof AppointmentValidationError || err instanceof ScheduleValidationError) {
    return { status: 400, body: { error: 'validation', field: err.field } };
  }
  if (err instanceof SlotTakenError) {
    return { status: 409, body: { error: 'slot_taken', existing: err.existing ? appointmentDto(err.existing) : null } };
  }
  if (err instanceof VersionConflictError) {
    return { status: 409, body: { error: 'version_conflict', current: appointmentDto(err.current) } };
  }
  if (err instanceof AppointmentCancelledError) {
    return { status: 409, body: { error: 'cancelled', current: appointmentDto(err.current) } };
  }
  if (err instanceof AppointmentNotFoundError || err instanceof OverrideNotFoundError) {
    return { status: 404, body: { error: 'not_found' } };
  }
  if (err instanceof ScheduleConflictError) {
    return { status: 409, body: { error: 'schedule_conflict', currentSchedule: err.current } };
  }
  if (err instanceof OutsideHoursError) return { status: 422, body: { error: err.reason } };
  return null;
}

/**
 * Maps errors to JSON responses. Logs carry only the error's class name and codes, never its
 * message: framework JSON-parse errors quote the request body, and DB errors quote query parameters.
 */
export function errorHandler(err: FastifyError | Error, request: FastifyRequest, reply: FastifyReply): void {
  const mapped = toResponse(err);
  if (mapped) {
    void reply.status(mapped.status).send(mapped.body);
    return;
  }
  const statusCode = (err as FastifyError).statusCode;
  if (statusCode === 429) {
    void reply.status(429).send({ error: 'rate_limited' } satisfies ApiError);
    return;
  }
  if (typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500) {
    request.log.info({ errName: err.name, errCode: (err as FastifyError).code, statusCode }, 'rejected request');
    void reply.status(statusCode).send({ error: 'bad_request' } satisfies ApiError);
    return;
  }
  request.log.error(
    {
      errName: err.name,
      errCode: (err as FastifyError).code ?? (err instanceof DatabaseError ? err.code : undefined),
      constraint: err instanceof DatabaseError ? err.constraint : undefined,
    },
    'request failed',
  );
  void reply.status(500).send({ error: 'server_error' } satisfies ApiError);
}
