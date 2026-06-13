'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock, User } from 'lucide-react';
import { LOGO_URL } from '@/lib/constants';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  // If already logged in, skip login page and go straight to dashboard
  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : { authenticated: false })
      .then((data) => {
        if (data.authenticated) router.replace('/admin/dashboard');
        else setChecking(false);
      })
      .catch(() => setChecking(false));
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success) {
        router.replace('/admin/dashboard');
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show blank while checking session (avoids flash of login form)
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#faf8f4]">
        <Loader2 className="w-6 h-6 animate-spin text-[#c9a84c]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#faf8f4] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          {LOGO_URL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={LOGO_URL} alt="SETHI PURSE" className="h-16 object-contain mx-auto mb-4" />
          ) : (
            <div className="mb-4">
              <p className="font-serif text-2xl font-bold text-[#2c1f14] tracking-widest">SETHI PURSE</p>
              <p className="text-xs tracking-[0.25em] text-[#8a7060]">JALANDHAR</p>
            </div>
          )}
          <h1 className="text-xl font-bold text-[#2c1f14]">Admin Login</h1>
          <p className="text-sm text-[#8a7060] mt-1">Sign in to manage your store</p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleLogin}
          className="bg-white rounded-xl border border-[#ede8df] shadow-sm p-6 space-y-4"
        >
          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-[#2c1f14] mb-1.5">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7060]" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                autoComplete="username"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#ede8df] text-sm text-[#2c1f14] focus:outline-none focus:ring-2 focus:ring-[#c9a84c] bg-white"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-[#2c1f14] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a7060]" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-[#ede8df] text-sm text-[#2c1f14] focus:outline-none focus:ring-2 focus:ring-[#c9a84c] bg-white"
              />
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#c9a84c] text-white font-bold rounded-lg hover:bg-[#a07a28] transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <p className="text-center text-xs text-[#8a7060] mt-6">
          SETHI PURSE Admin Panel · Jalandhar
        </p>
      </div>
    </div>
  );
}
