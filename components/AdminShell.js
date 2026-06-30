'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Bell, LayoutDashboard, ShoppingBag, Grid, Settings as SettingsIcon, LogOut, Menu, X, ExternalLink, Tag, MessageSquare, Star, Images } from 'lucide-react';
import { LOGO_URL } from '@/lib/constants';

const NAV = [
  { href: '/admin/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/admin/products',      label: 'Products',      icon: ShoppingBag },
  { href: '/admin/categories',    label: 'Categories',    icon: Grid },
  { href: '/admin/slider',        label: 'Hero Slider',   icon: Images },
  { href: '/admin/offers',        label: 'Offers',        icon: Tag },
  { href: '/admin/inquiries',     label: 'Inquiries',     icon: MessageSquare, hasBadge: true },
  { href: '/admin/reviews',       label: 'Reviews',       icon: Star },
  { href: '/admin/notifications', label: 'Notifications', icon: Bell },
];

const TITLES = {
  '/admin/dashboard':     'Dashboard',
  '/admin/products':      'Products',
  '/admin/products/add':  'Add Product',
  '/admin/categories':    'Categories',
  '/admin/slider':        'Hero Slider',
  '/admin/offers':        'Offers',
  '/admin/inquiries':     'Inquiries',
  '/admin/reviews':       'Reviews',
  '/admin/notifications': 'Notifications',
  '/admin/settings':      'Settings',
};

export default function AdminShell({ children }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [newInquiries, setNewInquiries] = useState(0);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.ok ? res.json() : { authenticated: false })
      .then((data) => {
        if (data.authenticated) setReady(true);
        else router.replace('/admin');
      })
      .catch(() => router.replace('/admin'));
  }, [router, pathname]);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await fetch('/api/inquiries');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const n = Array.isArray(data) ? data.filter((i) => i.status === 'new').length : 0;
        setNewInquiries(n);
      } catch (e) { /* ignore */ }
    };
    fetchCount();
    const t = setInterval(fetchCount, 30000);
    return () => { cancelled = true; clearInterval(t); };
  }, [ready, pathname]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
    router.replace('/admin');
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-sethi-gray100">
        <div className="text-sethi-gray500 text-sm">Loading...</div>
      </div>
    );
  }

  let title = 'Admin';
  for (const k of Object.keys(TITLES)) {
    if (pathname.startsWith(k)) title = TITLES[k];
  }
  if (pathname.startsWith('/admin/products/edit')) title = 'Edit Product';

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/');

  const renderNavItem = ({ href, label, icon: Icon, hasBadge }, onClick) => (
    <Link
      key={href}
      href={href}
      onClick={onClick}
      className={`flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium transition-colors ${isActive(href) ? 'bg-sethi-gold text-sethi-black' : 'text-white hover:text-sethi-gold'}`}
    >
      <Icon className="w-5 h-5" />
      <span className="flex-1">{label}</span>
      {hasBadge && newInquiries > 0 && (
        <span className={`inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full text-[11px] font-bold ${isActive(href) ? 'bg-sethi-black text-sethi-gold' : 'bg-red-600 text-white'}`}>
          {newInquiries}
        </span>
      )}
    </Link>
  );

  return (
    <div className="min-h-screen bg-sethi-gray100 flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-[260px] bg-sethi-black text-white sticky top-0 h-screen">
        <div className="p-4 border-b border-white/10 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} alt="SETHI PURSE" className="h-12 object-contain mx-auto" />
        </div>
        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV.map((item) => renderNavItem(item))}
        </nav>
        <div className="px-3 py-4 space-y-1 border-t border-white/10">
          <Link href="/admin/settings" className={`flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium transition-colors ${isActive('/admin/settings') ? 'bg-sethi-gold text-sethi-black' : 'text-white hover:text-sethi-gold'}`}>
            <SettingsIcon className="w-5 h-5" /> Settings
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium text-white hover:text-sethi-gold">
            <LogOut className="w-5 h-5" /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <div className={`md:hidden fixed inset-0 z-50 ${open ? '' : 'pointer-events-none'}`}>
        <div onClick={() => setOpen(false)} className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} />
        <aside className={`absolute left-0 top-0 h-full w-[280px] bg-sethi-black text-white flex flex-col transition-transform ${open ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-4 border-b border-white/10 bg-white flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} alt="SETHI PURSE" className="h-10 object-contain" />
            <button onClick={() => setOpen(false)} className="w-10 h-10 inline-flex items-center justify-center text-sethi-black"><X className="w-6 h-6" /></button>
          </div>
          <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
            {NAV.map((item) => renderNavItem(item, () => setOpen(false)))}
          </nav>
          <div className="px-3 py-4 space-y-1 border-t border-white/10">
            <Link href="/admin/settings" onClick={() => setOpen(false)} className={`flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium ${isActive('/admin/settings') ? 'bg-sethi-gold text-sethi-black' : 'text-white'}`}>
              <SettingsIcon className="w-5 h-5" /> Settings
            </Link>
            <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-3 rounded-sm text-sm font-medium text-white">
              <LogOut className="w-5 h-5" /> Logout
            </button>
          </div>
        </aside>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-sethi-gray200">
          <div className="flex items-center justify-between h-16 px-4 md:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setOpen(true)} className="md:hidden w-10 h-10 inline-flex items-center justify-center text-sethi-black">
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="font-serif text-xl md:text-2xl">{title}</h1>
            </div>
            <a href="/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-sethi-gold hover:underline">
              <ExternalLink className="w-4 h-4" /> View Store
            </a>
          </div>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
