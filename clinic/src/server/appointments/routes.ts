import type { FastifyInstance } from 'fastify';
import {
  CancelAppointmentBody,
  CreateAppointmentBody,
  DayQuery,
  IdParams,
  UpdateAppointmentBody,
  type AppointmentDto,
  type DayResponse,
} from '../../shared/api.js';
import { checkSlotAgainstHours, slotStarts } from '../../shared/schedule.js';
import { addDays, instantAt } from '../../shared/time.js';
import type { Db } from '../db/client.js';
import { appointmentDto } from '../http/dto.js';
import { getDaySchedule } from '../schedule/service.js';
import { cancelAppointment, createAppointment, listActiveBetween, updateAppointment } from './service.js';

export function appointmentRoutes(app: FastifyInstance, { db }: { db: Db }): void {
  app.get('/api/day', async (req): Promise<DayResponse> => {
    const { date } = DayQuery.parse(req.query);
    // One snapshot for hours and appointments, so the two always agree.
    return db.transaction(
      async (tx) => {
        const schedule = await getDaySchedule(tx, date);
        const rows = await listActiveBetween(tx, instantAt(date, '00:00'), instantAt(addDays(date, 1), '00:00'));
        return {
          date,
          schedule,
          slots: slotStarts(schedule).map((d) => d.toISOString()),
          appointments: rows.map((a) => ({
            ...appointmentDto(a),
            withinHours: checkSlotAgainstHours(a.startAt, schedule) === null,
          })),
        };
      },
      { isolationLevel: 'repeatable read', accessMode: 'read only' },
    );
  });

  app.post('/api/appointments', async (req, reply): Promise<AppointmentDto> => {
    const body = CreateAppointmentBody.parse(req.body);
    const created = await createAppointment(db, req.user!, {
      startAt: new Date(body.startAt),
      patientName: body.patientName,
      patientPhone: body.patientPhone,
    });
    void reply.status(201);
    return appointmentDto(created);
  });

  app.patch('/api/appointments/:id', async (req): Promise<AppointmentDto> => {
    const { id } = IdParams.parse(req.params);
    const body = UpdateAppointmentBody.parse(req.body);
    const updated = await updateAppointment(db, req.user!, id, body.version, {
      startAt: body.startAt === undefined ? undefined : new Date(body.startAt),
      patientName: body.patientName,
      patientPhone: body.patientPhone,
    });
    return appointmentDto(updated);
  });

  app.post('/api/appointments/:id/cancel', async (req): Promise<AppointmentDto> => {
    const { id } = IdParams.parse(req.params);
    const body = CancelAppointmentBody.parse(req.body);
    return appointmentDto(await cancelAppointment(db, req.user!, id, body.version));
  });
}
