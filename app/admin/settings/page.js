'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import { KeyRound, User as UserIcon, Loader2, Eye, EyeOff } from 'lucide-react';

export default function AdminSettingsPage() {
  const [currentUsername, setCurrentUsername] = useState('');

  // change password state
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [conPwd, setConPwd] = useState('');
  const [showP, setShowP] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);

  // change username state
  const [newUsername, setNewUsername] = useState('');
  const [unCurPwd, setUnCurPwd] = useState('');
  const [unBusy, setUnBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const d = await res.json();
        if (!cancelled) setCurrentUsername(d.username || '');
      } catch (err) {
        console.error('Load settings failed:', err);
        if (!cancelled) toast.error('Could not load settings');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const updatePwd = async (e) => {
    e.preventDefault();
    if (newPwd.length < 6) { toast.error('New password must be at least 6 characters'); return; }
    if (newPwd !== conPwd) { toast.error('Passwords do not match'); return; }
    setPwdBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-password', currentPassword: curPwd, newPassword: newPwd, confirmPassword: conPwd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || `Failed to update password (status ${res.status})`); return; }
      toast.success('Password updated successfully!');
      setCurPwd(''); setNewPwd(''); setConPwd('');
    } catch (err) {
      console.error('Update password failed:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setPwdBusy(false);
    }
  };

  const updateUsername = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) { toast.error('New username required'); return; }
    setUnBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-username', newUsername, currentPassword: unCurPwd }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || `Failed to update username (status ${res.status})`); return; }
      toast.success('Username updated successfully!');
      setCurrentUsername(data.username);
      setNewUsername(''); setUnCurPwd('');
    } catch (err) {
      console.error('Update username failed:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setUnBusy(false);
    }
  };

  return (
    <AdminShell>
      <div className="grid lg:grid-cols-2 gap-6 max-w-5xl">
        <form onSubmit={updatePwd} className="bg-white border border-sethi-gray200 rounded-sm p-5 md:p-7 space-y-4">
          <div className="flex items-center gap-2 mb-2"><KeyRound className="w-5 h-5 text-sethi-gold" /><h2 className="font-serif text-xl">Change Admin Password</h2></div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Current Password</label>
            <input type={showP ? 'text' : 'password'} value={curPwd} onChange={(e) => setCurPwd(e.target.value)} className="input-sethi" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">New Password</label>
            <div className="relative">
              <input type={showP ? 'text' : 'password'} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} className="input-sethi pr-12" minLength={6} required />
              <button type="button" onClick={() => setShowP((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-sethi-gray500" aria-label="Toggle">{showP ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Confirm New Password</label>
            <input type={showP ? 'text' : 'password'} value={conPwd} onChange={(e) => setConPwd(e.target.value)} className="input-sethi" minLength={6} required />
          </div>
          <button type="submit" disabled={pwdBusy} className="btn-primary w-full">
            {pwdBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Password'}
          </button>
        </form>

        <form onSubmit={updateUsername} className="bg-white border border-sethi-gray200 rounded-sm p-5 md:p-7 space-y-4">
          <div className="flex items-center gap-2 mb-2"><UserIcon className="w-5 h-5 text-sethi-gold" /><h2 className="font-serif text-xl">Change Admin Username</h2></div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Current Username</label>
            <input value={currentUsername} readOnly className="input-sethi bg-sethi-gray100" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">New Username</label>
            <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="input-sethi" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Current Password (to confirm)</label>
            <input type="password" value={unCurPwd} onChange={(e) => setUnCurPwd(e.target.value)} className="input-sethi" required />
          </div>
          <button type="submit" disabled={unBusy} className="btn-primary w-full">
            {unBusy ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Username'}
          </button>
        </form>
      </div>
    </AdminShell>
  );
}
