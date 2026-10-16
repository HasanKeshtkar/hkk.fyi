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
import type { Notification } from '../db/schema.js';
import { appointmentDto } from '../http/dto.js';
import { notificationDto } from '../notifications/service.js';
import type { Realtime } from '../realtime.js';
import { getDaySchedule } from '../schedule/service.js';
import { cancelAppointment, createAppointment, listActiveBetween, updateAppointment } from './service.js';

export function appointmentRoutes(app: FastifyInstance, { db, realtime }: { db: Db; realtime: Realtime }): void {
  // Pushed to the phones only after the change (and its notification) has committed.
  const hooks = {
    onNotification: (n: Notification) => realtime.notificationCreated(n.recipientId, notificationDto(n)),
  };

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
    const created = await createAppointment(
      db,
      req.user!,
      { startAt: new Date(body.startAt), patientName: body.patientName, patientPhone: body.patientPhone },
      hooks,
    );
    const dto = appointmentDto(created);
    realtime.appointmentChanged(dto, 'create', req.user!.id);
    void reply.status(201);
    return dto;
  });

  app.patch('/api/appointments/:id', async (req): Promise<AppointmentDto> => {
    const { id } = IdParams.parse(req.params);
    const body = UpdateAppointmentBody.parse(req.body);
    const updated = await updateAppointment(
      db,
      req.user!,
      id,
      body.version,
      {
        startAt: body.startAt === undefined ? undefined : new Date(body.startAt),
        patientName: body.patientName,
        patientPhone: body.patientPhone,
      },
      hooks,
    );
    const dto = appointmentDto(updated);
    realtime.appointmentChanged(dto, 'update', req.user!.id);
    return dto;
  });

  app.post('/api/appointments/:id/cancel', async (req): Promise<AppointmentDto> => {
    const { id } = IdParams.parse(req.params);
    const body = CancelAppointmentBody.parse(req.body);
    const dto = appointmentDto(await cancelAppointment(db, req.user!, id, body.version, hooks));
    realtime.appointmentChanged(dto, 'cancel', req.user!.id);
    return dto;
  });
}
