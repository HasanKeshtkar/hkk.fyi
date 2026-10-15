# سیستم نوبت‌دهی مطب

اپ موبایل (PWA) نوبت‌دهی برای دو کاربر: دکتر و منشی.
وضعیت فعلی: **فاز ۱ — دیتابیس، constraint ها و تست همزمانی.**

## پیش‌نیاز
- Node.js 22
- PostgreSQL 16 (برای توسعه: `docker compose up -d`)

## راه‌اندازی محلی
```bash
cp .env.example .env          # مقادیر را پر کنید
npm install
npm run db:migrate            # ساخت جدول‌ها
npm run db:seed               # ساخت دو کاربر + ساعت کاری پیش‌فرض (فقط آنچه وجود ندارد)
```
تغییر رمزها از روی env: `npm run db:seed -- --reset-passwords`

## تست
```bash
npm test                      # دیتابیس TEST_DATABASE_URL را پاک و از نو می‌سازد
npm run typecheck
```
نام دیتابیس تست باید با `_test` تمام شود؛ در غیر این صورت تست‌ها اجرا نمی‌شوند.

## تضمین‌های سطح دیتابیس
| قانون | پیاده‌سازی |
|---|---|
| هر slot فقط یک نوبت فعال | `UNIQUE INDEX appointments_active_slot_uq ON appointments(start_at) WHERE status <> 'cancelled'` |
| شروع فقط روی :00 یا :30 | `CHECK (extract(epoch from start_at) % 1800 = 0)` — آفست تهران (+03:30) مضرب نیم‌ساعت است، پس این شرط مستقل از timezone است |
| فرمت موبایل | `CHECK (patient_phone ~ '^09[0-9]{9}$')` |
| ساعت کاری با گام ۳۰ دقیقه | CHECK روی `weekly_schedule` و `date_overrides` |
| یک کاربر برای هر نقش | `UNIQUE INDEX users_role_uq` |

ویرایش و لغو با `SELECT … FOR UPDATE` و مقایسه `version` انجام می‌شود؛ نسخه قدیمی با `VersionConflictError` (همراه داده فعلی و `updated_by`) رد می‌شود. هر create/update/cancel در همان transaction یک ردیف `audit_log` با مقدار قبل و بعد می‌نویسد.

خطاهای دیتابیس قبل از خروج از لایه سرویس به `DatabaseError` (فقط کد SQLSTATE) تبدیل می‌شوند، چون خطای خام Drizzle همه پارامترها (اسم و شماره بیمار) را در متن خود دارد. قطع شدن اتصال دیتابیس وسط یک تراکنش پروسه را از کار نمی‌اندازد.

## ساختار
```
drizzle/                 migration های SQL (تولید با npm run db:generate)
src/shared/              کد مشترک کلاینت و سرور (نرمال‌سازی شماره و اسم)
src/server/db/           schema، اتصال، migration runner
src/server/appointments/ ثبت / ویرایش و جابه‌جایی / لغو نوبت
scripts/                 migrate و seed
tests/                   تست‌های constraint، همزمانی و سرویس
```
