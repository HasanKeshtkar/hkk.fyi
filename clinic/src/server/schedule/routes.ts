import type { FastifyInstance } from 'fastify';
import {
  OverrideBody,
  OverrideParams,
  WeeklyDayBody,
  WeeklyDayParams,
  type ScheduleResponse,
} from '../../shared/api.js';
import type { DateOverride, WeeklyDay } from '../../shared/schedule.js';
import { clinicToday } from '../../shared/time.js';
import type { Db } from '../db/client.js';
import { deleteOverride, getWeekly, listOverrides, setWeeklyDay, upsertOverride } from './service.js';

/** Working hours: both the doctor and the secretary may edit; every change is audited. */
export function scheduleRoutes(app: FastifyInstance, { db }: { db: Db }): void {
  app.get('/api/schedule', async (): Promise<ScheduleResponse> => {
    const [weekly, overrides] = await Promise.all([getWeekly(db), listOverrides(db, clinicToday())]);
    return { weekly, overrides };
  });

  app.put('/api/schedule/weekly/:weekday', async (req): Promise<WeeklyDay> => {
    const { weekday } = WeeklyDayParams.parse(req.params);
    const body = WeeklyDayBody.parse(req.body);
    return setWeeklyDay(db, req.user!, weekday, body);
  });

  app.put('/api/schedule/overrides/:date', async (req): Promise<DateOverride> => {
    const { date } = OverrideParams.parse(req.params);
    const body = OverrideBody.parse(req.body);
    return upsertOverride(db, req.user!, date, body);
  });

  app.delete('/api/schedule/overrides/:date', async (req, reply) => {
    const { date } = OverrideParams.parse(req.params);
    await deleteOverride(db, req.user!, date);
    void reply.status(204);
  });
}
