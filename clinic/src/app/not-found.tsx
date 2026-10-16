import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="splash">
      <p>این صفحه وجود ندارد.</p>
      <Link href="/" className="btn btn-primary">
        برگشت به نوبت‌ها
      </Link>
    </main>
  );
}
