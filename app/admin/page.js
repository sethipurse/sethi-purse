'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { LOGO_URL, BUSINESS } from '@/lib/constants';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('sethi_admin_token')) {
      router.replace('/admin/dashboard');
    }
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || `Login failed (status ${res.status})`);
        return;
      }
      localStorage.setItem('sethi_admin_token', data.token);
      router.replace('/admin/dashboard');
    } catch (err) {
      console.error('Login failed:', err);
      setErr('Network error. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <div className="md:w-1/2 bg-sethi-black text-white flex flex-col items-center justify-center p-10 md:p-16">
        <div className="bg-white p-2 rounded-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="SETHI PURSE" className="h-20 object-contain" />
        </div>
        <h2 className="font-serif text-3xl md:text-5xl mt-6">SETHI PURSE</h2>
        <p className="text-sethi-gold mt-2 text-sm tracking-wide text-center">{BUSINESS.tagline}</p>
        <p className="text-white/40 text-xs mt-6 tracking-[0.3em] uppercase">Admin Panel</p>
      </div>
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-10 bg-sethi-gray100">
        <div className="w-full max-w-md bg-white p-8 md:p-10 rounded-[4px] shadow-[0_8px_40px_rgba(0,0,0,0.06)] border border-sethi-gray200">
          <h1 className="font-serif text-3xl mb-1">Welcome Back</h1>
          <p className="text-sethi-gray500 text-sm mb-7">Sign in to your admin panel.</p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)} className="input-sethi" placeholder="admin" autoComplete="username" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-sethi pr-12" placeholder="••••••••" autoComplete="current-password" required />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sethi-gray500 hover:text-sethi-black" aria-label="Toggle password">
                  {show ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>
            {err && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{err}</div>}
            <button type="submit" disabled={busy} className="btn-primary w-full mt-2">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
