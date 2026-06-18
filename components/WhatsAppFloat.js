'use client';
import { usePathname } from 'next/navigation';
import { getWALinkForPath } from '@/lib/constants';

function WhatsAppIcon({ className }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.11 17.39c-.27-.13-1.59-.78-1.83-.87-.25-.09-.43-.13-.61.14-.18.27-.7.87-.86 1.05-.16.18-.32.2-.59.07-.27-.13-1.13-.42-2.16-1.33-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.41.11-.55.11-.11.27-.29.4-.43.13-.14.18-.25.27-.41.09-.18.04-.34-.02-.47-.07-.13-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.27 0 1.34.97 2.63 1.11 2.81.14.18 1.92 2.93 4.65 4.11.65.28 1.16.45 1.55.58.65.21 1.24.18 1.71.11.52-.08 1.59-.65 1.82-1.27.22-.62.22-1.15.16-1.27-.07-.11-.25-.18-.52-.31zM16.03 5.33c-5.92 0-10.72 4.8-10.72 10.72 0 1.89.5 3.72 1.43 5.34l-1.52 5.53 5.66-1.49a10.7 10.7 0 0 0 5.15 1.31h.01c5.92 0 10.72-4.8 10.72-10.72S21.95 5.33 16.03 5.33z" />
    </svg>
  );
}

export default function WhatsAppFloat() {
  const pathname = usePathname() || '';
  if (pathname.startsWith('/admin')) return null;

  const link = getWALinkForPath(pathname);

  return (
    <>
      {/* Full width sticky WhatsApp bar — always visible at bottom */}
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on WhatsApp"
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 99990,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          height: 52,
          backgroundColor: '#25D366',
          color: '#fff',
          fontWeight: 700,
          fontSize: 16,
          textDecoration: 'none',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.15)',
          WebkitTapHighlightColor: 'transparent',
          letterSpacing: '0.02em',
        }}
      >
        <WhatsAppIcon className="w-6 h-6 text-white" />
        Chat with us on WhatsApp
      </a>

      {/* Spacer so page content is not hidden behind the bar */}
      <div style={{ height: 52 }} />
    </>
  );
}
