'use client';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

// Renders children directly onto document.body, escaping any ancestor
// stacking context (e.g. layout.js's z-index:1 wrapper) so fixed-position
// overlays always render above the WhatsApp FAB, back-to-top button, and
// sticky bottom nav on mobile.
export default function Portal({ children }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}
