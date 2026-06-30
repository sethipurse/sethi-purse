'use client';
import { useRef, useCallback } from 'react';

export default function TiltCard({
  children,
  className,
  style,
  maxTilt = 18,
  scale = 1.03,
  perspective = 700,
}) {
  const cardRef = useRef(null);
  const rafRef = useRef(null);

  const applyTilt = useCallback((clientX, clientY) => {
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (clientX - cx) / (rect.width / 2);   // −1 … +1
    const dy = (clientY - cy) / (rect.height / 2);  // −1 … +1
    const rx = -dy * maxTilt;
    const ry =  dx * maxTilt;
    // Shadow travels opposite to tilt direction
    const shX = ry * 0.55;
    const shY = -rx * 0.55 + 10;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      el.style.transform = `perspective(${perspective}px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
      el.style.boxShadow = `${shX}px ${shY}px 32px rgba(44,31,20,0.22), 0 4px 16px rgba(201,168,76,0.2)`;
      el.style.transition = 'none';
    });
  }, [maxTilt, scale, perspective]);

  const resetTilt = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const el = cardRef.current;
    if (!el) return;
    el.style.transition = 'transform 0.4s ease-out, box-shadow 0.4s ease-out';
    el.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`;
    el.style.boxShadow = '';
  }, [perspective]);

  return (
    <div
      ref={cardRef}
      className={className}
      style={{
        ...style,
        transformStyle: 'preserve-3d',
        willChange: 'transform',
        touchAction: 'none',
      }}
      onMouseMove={(e) => applyTilt(e.clientX, e.clientY)}
      onMouseLeave={resetTilt}
      onTouchMove={(e) => { const t = e.touches[0]; applyTilt(t.clientX, t.clientY); }}
      onTouchEnd={resetTilt}
    >
      {children}
    </div>
  );
}
