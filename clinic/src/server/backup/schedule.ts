// The daily backup, run by the server itself (Liara's Docker apps have no cron). It runs at a
// fixed hour of the clinic's day, and also shortly after start-up when the newest backup is more
// than a day old, so a restart or a deploy at the wrong moment never skips a day.
import { addDays, clinicDateOf, clinicToday, instantAt, wallTimeOf } from '../../shared/time.js';
import { listBackups, runBackup, type BackupFile, DAILY_PREFIX } from './backup.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const CATCH_UP_DELAY_MS = 2 * 60 * 1000;

/** The next time it is `hour`:00 in the clinic's zone, strictly after `now`. */
export function nextRunAt(now: Date, hour: number): Date {
  const time = wallTimeOf(hour * 60);
  const today = instantAt(clinicToday(now), time);
  return today.getTime() > now.getTime() ? today : instantAt(addDays(clinicDateOf(now), 1), time);
}

/** True when there is no daily backup from the last 24 hours. */
export function needsCatchUp(backups: BackupFile[], now: Date): boolean {
  const newest = backups.find((b) => b.name.startsWith(DAILY_PREFIX));
  return !newest || now.getTime() - newest.at.getTime() > DAY_MS;
}

export interface ScheduleOptions {
  databaseUrl: string;
  dir: string;
  keep: number;
  hour: number;
  log: { info: (o: object, msg: string) => void; error: (o: object, msg: string) => void };
}

/** Starts the daily backups; returns a function that stops them. */
export function startDailyBackups(opts: ScheduleOptions): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let stopped = false;

  const backupNow = async () => {
    if (running) return;
    running = true;
    try {
      const b = await runBackup({ databaseUrl: opts.databaseUrl, dir: opts.dir, keep: opts.keep });
      opts.log.info({ file: b.name, bytes: b.bytes }, 'backup written');
    } catch (err) {
      opts.log.error({ errName: (err as Error).name, reason: (err as Error).message }, 'backup failed');
    } finally {
      running = false;
    }
  };

  const schedule = (at: Date) => {
    if (stopped) return;
    timer = setTimeout(
      () => {
        void backupNow().then(() => schedule(nextRunAt(new Date(), opts.hour)));
      },
      Math.max(0, at.getTime() - Date.now()),
    );
    timer.unref();
  };

  void listBackups(opts.dir)
    .then((list) => needsCatchUp(list, new Date()))
    .catch(() => true)
    .then((catchUp) => schedule(catchUp ? new Date(Date.now() + CATCH_UP_DELAY_MS) : nextRunAt(new Date(), opts.hour)));

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
