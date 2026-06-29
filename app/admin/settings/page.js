'use client';
import { useEffect, useState } from 'react';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import { Check, KeyRound, Loader2, Eye, EyeOff, Paintbrush, User as UserIcon } from 'lucide-react';

const THEMES = [
  {
    id: 'pure',
    name: 'Pure',
    desc: 'Near-white, editorial minimalism',
    swatches: { bg: '#f9f9f9', accent: '#18181b', surface: '#f0f0f0' },
  },
  {
    id: 'horizon',
    name: 'Horizon',
    desc: 'Soft sky tones, airy travel feel',
    swatches: { bg: '#f0f5ff', accent: '#4f6ea8', surface: '#e4eaf8' },
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    desc: 'Dark luxury, champagne accent',
    swatches: { bg: '#0c0c0c', accent: '#c4a47c', surface: '#161616' },
  },
  {
    id: 'sand',
    name: 'Sand',
    desc: 'Warm parchment, cognac leather',
    swatches: { bg: '#f5f0e8', accent: '#a0703a', surface: '#ece5d8' },
  },
];

function ThemeCard({ theme, selected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative rounded-sm p-3 border-2 transition-all text-left w-full ${
        selected
          ? 'border-sethi-gold shadow-md'
          : 'border-sethi-gray200 hover:border-sethi-gray500'
      }`}
    >
      {/* Mini color preview */}
      <div className="h-14 rounded-sm overflow-hidden mb-2.5 flex">
        <div className="flex-1" style={{ background: theme.swatches.bg }} />
        <div className="flex-1" style={{ background: theme.swatches.surface }} />
        <div className="w-8" style={{ background: theme.swatches.accent }} />
      </div>
      <div className="font-semibold text-sm">{theme.name}</div>
      <div className="text-xs text-sethi-gray500 mt-0.5 leading-snug">{theme.desc}</div>
      {selected && (
        <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-sethi-gold flex items-center justify-center">
          <Check className="w-3 h-3 text-sethi-black" />
        </span>
      )}
    </button>
  );
}

export default function AdminSettingsPage() {
  const [currentUsername, setCurrentUsername] = useState('');

  // theme state
  const [savedTheme, setSavedTheme] = useState('pure');
  const [activeTheme, setActiveTheme] = useState('pure');
  const [themeBusy, setThemeBusy] = useState(false);

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
        if (!cancelled) {
          setCurrentUsername(d.username || '');
          setSavedTheme(d.theme || 'pure');
          setActiveTheme(d.theme || 'pure');
        }
      } catch (err) {
        console.error('Load settings failed:', err);
        if (!cancelled) toast.error('Could not load settings');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const saveTheme = async () => {
    setThemeBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'change-theme', theme: activeTheme }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error || 'Failed to update theme'); return; }
      setSavedTheme(activeTheme);
      // Apply preview on the store's html element (visible if admin opens store in same tab)
      document.documentElement.setAttribute('data-theme', activeTheme);
      toast.success(`Theme set to "${THEMES.find(t => t.id === activeTheme)?.name}". Reload the store to see it.`);
    } catch (err) {
      console.error('Update theme failed:', err);
      toast.error('Network error. Please try again.');
    } finally {
      setThemeBusy(false);
    }
  };

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
      <div className="max-w-5xl space-y-6">

        {/* ── Theme Picker ── */}
        <div className="bg-white border border-sethi-gray200 rounded-sm p-5 md:p-7">
          <div className="flex items-center gap-2 mb-1">
            <Paintbrush className="w-5 h-5 text-sethi-gold" />
            <h2 className="font-serif text-xl">Site Theme</h2>
          </div>
          <p className="text-sm text-sethi-gray500 mb-5">
            Choose the visual style for your store. Changes apply to all visitors after their next page load.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
            {THEMES.map((theme) => (
              <ThemeCard
                key={theme.id}
                theme={theme}
                selected={activeTheme === theme.id}
                onClick={() => setActiveTheme(theme.id)}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={saveTheme}
            disabled={themeBusy || activeTheme === savedTheme}
            className="btn-primary"
          >
            {themeBusy
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Applying...</>
              : activeTheme === savedTheme
                ? <><Check className="w-4 h-4" /> Applied</>
                : `Apply "${THEMES.find(t => t.id === activeTheme)?.name}" Theme`}
          </button>
          {activeTheme !== savedTheme && (
            <p className="mt-2 text-xs text-sethi-gray500">
              Current live theme: <span className="font-semibold">{THEMES.find(t => t.id === savedTheme)?.name}</span>
            </p>
          )}
        </div>

        {/* ── Credentials ── */}
        <div className="grid lg:grid-cols-2 gap-6">
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
      </div>
    </AdminShell>
  );
}
