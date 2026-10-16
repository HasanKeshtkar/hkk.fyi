import type { ApiError, ApiResult, NotificationDto, UserDto } from '../../shared/api';
import { clinicDateOf } from '../../shared/time';
import { jalaliLongLabel, timeLabel } from './format';

export function userName(users: readonly UserDto[], id: string | null | undefined): string {
  const u = users.find((x) => x.id === id);
  return u ? u.name : 'کاربر دیگر';
}

export const FIELD_MESSAGES: Record<string, string> = {
  patientName: 'نام بیمار را وارد کنید.',
  patientPhone: 'شماره موبایل درست نیست. مثال: ۰۹۱۲۱۲۳۴۵۶۷',
  startAt: 'این ساعت معتبر نیست.',
  startTime: 'ساعت شروع درست نیست.',
  endTime: 'ساعت پایان باید بعد از ساعت شروع باشد.',
  note: 'توضیح خیلی طولانی است یا کاراکتر نامعتبر دارد.',
  date: 'تاریخ درست نیست.',
};

/** A Persian sentence for a failed call that has no more specific handling on its screen. */
export function genericMessage(res: Exclude<ApiResult<unknown>, { ok: true }>): string {
  if (res.kind === 'network') return 'اتصال برقرار نیست. چند لحظه بعد دوباره امتحان کنید.';
  return messageFor(res.error);
}

export function messageFor(error: ApiError): string {
  switch (error.error) {
    case 'validation':
      return (error.field && FIELD_MESSAGES[error.field]) || 'اطلاعات وارد‌شده کامل یا درست نیست.';
    case 'day_closed':
      return 'این روز تعطیل است.';
    case 'outside_hours':
      return 'این ساعت خارج از ساعت کاری است.';
    case 'not_found':
      return 'این مورد دیگر وجود ندارد.';
    case 'rate_limited':
      return 'تلاش‌های زیادی انجام شد. ۱۵ دقیقه دیگر دوباره امتحان کنید.';
    case 'invalid_credentials':
      return 'رمز عبور اشتباه است.';
    case 'unauthorized':
      return 'لطفاً دوباره وارد شوید.';
    case 'forbidden':
    case 'bad_request':
      return 'درخواست پذیرفته نشد. صفحه را دوباره باز کنید.';
    default:
      return 'خطایی در سرور رخ داد. دوباره امتحان کنید.';
  }
}

const when = (startAt: string) => `${jalaliLongLabel(clinicDateOf(new Date(startAt)))}، ساعت ${timeLabel(startAt)}`;

/** "دکتر کشتکار: نوبت جدید" + "مریم احمدی — شنبه ۹ آبان ۱۴۰۵، ساعت ۱۴:۰۰" */
export function describeNotification(n: NotificationDto, users: readonly UserDto[]): { title: string; body: string } {
  const by = userName(users, n.payload.by);
  const { before, after } = n.payload;
  if (n.type === 'created') return { title: `${by}: نوبت جدید`, body: `${after.patientName} — ${when(after.startAt)}` };
  if (n.type === 'cancelled') return { title: `${by}: لغو نوبت`, body: `${after.patientName} — ${when(after.startAt)}` };
  if (before && before.startAt !== after.startAt) {
    return { title: `${by}: جابه‌جایی نوبت`, body: `${after.patientName} — از ${when(before.startAt)} به ${when(after.startAt)}` };
  }
  return { title: `${by}: ویرایش نوبت`, body: `${after.patientName} — ${when(after.startAt)}` };
}
