import type { ApiError, UserDto } from '../../shared/api';
import type { ApiResult } from './api';

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
