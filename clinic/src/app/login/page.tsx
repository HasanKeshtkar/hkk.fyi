'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Role } from '../../shared/api';
import { api } from '../../web/lib/api';
import { genericMessage } from '../../web/lib/messages';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<Role | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Already signed in on this phone: go straight to the appointments.
  useEffect(() => {
    void api.me().then((res) => {
      if (res.ok) router.replace('/');
    });
  }, [router]);

  function pick(r: Role) {
    setRole(r);
    setError(null);
    passwordRef.current?.focus();
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!role) {
      setError('اول انتخاب کنید دکتر هستید یا منشی.');
      return;
    }
    if (!password) {
      setError('رمز عبور را وارد کنید.');
      return;
    }
    setBusy(true);
    setError(null);
    const res = await api.login(role, password);
    setBusy(false);
    if (res.ok) {
      router.replace('/');
      return;
    }
    setPassword('');
    setError(genericMessage(res));
  }

  return (
    <main className="login">
      <h1>نوبت‌دهی مطب</h1>
      <p className="login-sub">چه کسی وارد می‌شود؟</p>
      <div className="role-grid" role="group" aria-label="نقش">
        <button type="button" className="role-btn" aria-pressed={role === 'doctor'} onClick={() => pick('doctor')}>
          دکتر
        </button>
        <button type="button" className="role-btn" aria-pressed={role === 'secretary'} onClick={() => pick('secretary')}>
          منشی
        </button>
      </div>
      <form onSubmit={(e) => void onSubmit(e)} noValidate>
        <div className="field">
          <label htmlFor="password">رمز عبور</label>
          <input
            id="password"
            ref={passwordRef}
            className="input input-ltr"
            type="password"
            autoComplete="current-password"
            enterKeyHint="go"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error ? (
          <div className="alert alert-error" role="alert">
            {error}
          </div>
        ) : null}
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'در حال ورود…' : 'ورود'}
        </button>
      </form>
    </main>
  );
}
