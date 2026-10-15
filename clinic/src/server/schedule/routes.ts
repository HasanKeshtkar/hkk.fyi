import type { FastifyInstance } from 'fastify';
import {
  DeleteOverrideQuery,
  OverrideBody,
  OverrideParams,
  WeeklyDayBody,
  WeeklyDayParams,
  type ScheduleResponse,
} from '../../shared/api.js';
import type { DateOverrideRecord, WeeklyDayRecord } from '../../shared/schedule.js';
import { clinicToday } from '../../shared/time.js';
import type { Db } from '../db/client.js';
import { deleteOverride, getWeekly, listOverrides, setWeeklyDay, upsertOverride } from './service.js';

/** Working hours: both the doctor and the secretary may edit; every change is audited. */
export function scheduleRoutes(app: FastifyInstance, { db }: { db: Db }): void {
  app.get('/api/schedule', async (): Promise<ScheduleResponse> => {
    const [weekly, overrides] = await Promise.all([getWeekly(db), listOverrides(db, clinicToday())]);
    return { weekly, overrides };
  });

  app.put('/api/schedule/weekly/:weekday', async (req): Promise<WeeklyDayRecord> => {
    const { weekday } = WeeklyDayParams.parse(req.params);
    const { version, ...hours } = WeeklyDayBody.parse(req.body);
    return setWeeklyDay(db, req.user!, weekday, hours, version);
  });

  app.put('/api/schedule/overrides/:date', async (req): Promise<DateOverrideRecord> => {
    const { date } = OverrideParams.parse(req.params);
    const { version, ...override } = OverrideBody.parse(req.body);
    return upsertOverride(db, req.user!, date, override, version);
  });

  app.delete('/api/schedule/overrides/:date', async (req, reply) => {
    const { date } = OverrideParams.parse(req.params);
    const { version } = DeleteOverrideQuery.parse(req.query);
    await deleteOverride(db, req.user!, date, version);
    void reply.status(204);
  });
}
