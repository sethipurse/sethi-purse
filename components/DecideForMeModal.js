'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { MessageCircle, X, Sparkles, ChevronRight } from 'lucide-react';
import { buildWhatsAppLink, buildBuyNowMessage, buildProductUrl, rupee } from '@/lib/constants';
import TiltCard from '@/components/TiltCard';

const CATEGORIES = [
  { value: 'LUGGAGE', label: '🧳 Luggage / Trolley' },
  { value: 'Handbags', label: '👜 Handbag' },
  { value: 'Backpacks', label: '🎒 Backpack' },
  { value: 'Party Wear Purse', label: '✨ Party Purse' },
  { value: 'Slings', label: '👝 Sling Bag' },
  { value: 'Wallets', label: '👛 Wallet' },
  { value: 'School Bags', label: '📚 School Bag' },
];

const BUDGETS = [
  { value: 'under1500', label: 'Under ₹1,500' },
  { value: '1500to3000', label: '₹1,500 – ₹3,000' },
  { value: 'above3000', label: 'Above ₹3,000' },
];

const USES = [
  { value: 'daily', label: '👜 Daily / Office' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'school', label: '🎒 School' },
  { value: 'gift', label: '🎁 Gift' },
  { value: 'party', label: '✨ Party' },
  { value: 'office', label: '💼 Office / Laptop' },
];

export default function DecideForMeModal({ onClose }) {
  const [step, setStep] = useState('form'); // form | result | more
  const [category, setCategory] = useState('');
  const [budget, setBudget] = useState('');
  const [use, setUse] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Portal to document.body so this always renders above every other fixed
  // element (WhatsApp FAB, back-to-top, sticky nav) regardless of which
  // ancestor stacking context it's triggered from.
  useEffect(() => setMounted(true), []);

  async function handleSubmit() {
    if (!category || !budget || !use) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/recommend?budget=${budget}&use=${use}&category=${encodeURIComponent(category)}`);
      const data = await res.json();
      if (!data.product) { setError('No product found for your choice. Try a different option!'); setLoading(false); return; }
      setResult(data);
      setStep('result');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const price = result?.product ? (result.product.sale_price ?? result.product.price ?? 0) : 0;
  const img = result?.product?.image_url || result?.product?.imageUrl || '';
  const waLink = result?.product
    ? buildWhatsAppLink(buildBuyNowMessage(result.product, { quantity: 1, productUrl: buildProductUrl(result.product.id) }))
    : '#';

  const allSelected = category && budget && use;

  if (!mounted) return null;

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100002, background: 'rgba(44,31,20,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#faf8f4',
          borderRadius: '24px 24px 0 0',
          width: '100%',
          maxWidth: 480,
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '28px 20px',
          paddingBottom: 'max(32px, calc(32px + env(safe-area-inset-bottom)))',
          position: 'relative',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16, background: '#f5f0e8', border: 'none', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          aria-label="Close">
          <X size={16} color="#4a3728" />
        </button>

        {step === 'form' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <Sparkles size={22} color="#c9a84c" />
              <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: '#2c1f14', margin: 0 }}>Bas best wala de do!</h2>
            </div>
            <p style={{ fontSize: 13, color: '#8a7060', marginBottom: 22 }}>3 sawaal — hum choose karenge aapke liye 😊</p>

            {/* Step 1 — Category */}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#2c1f14', marginBottom: 10 }}>Kaunsa bag chahiye?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 22 }}>
              {CATEGORIES.map((c) => (
                <button key={c.value} onClick={() => setCategory(c.value)} style={{
                  padding: '10px 12px', borderRadius: 12,
                  border: `2px solid ${category === c.value ? '#c9a84c' : '#ede8df'}`,
                  background: category === c.value ? '#fdf6e3' : '#fff',
                  color: '#2c1f14', fontSize: 13,
                  fontWeight: category === c.value ? 700 : 400,
                  cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s',
                }}>
                  {c.label}
                </button>
              ))}
            </div>

            {/* Step 2 — Budget */}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#2c1f14', marginBottom: 10 }}>Budget kya hai?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
              {BUDGETS.map((b) => (
                <button key={b.value} onClick={() => setBudget(b.value)} style={{
                  padding: '11px 16px', borderRadius: 12,
                  border: `2px solid ${budget === b.value ? '#c9a84c' : '#ede8df'}`,
                  background: budget === b.value ? '#fdf6e3' : '#fff',
                  color: '#2c1f14', fontSize: 14,
                  fontWeight: budget === b.value ? 700 : 400,
                  cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s',
                }}>
                  {b.label}
                </button>
              ))}
            </div>

            {/* Step 3 — Purpose */}
            <p style={{ fontSize: 13, fontWeight: 700, color: '#2c1f14', marginBottom: 10 }}>Kisliye chahiye?</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 28 }}>
              {USES.map((u) => (
                <button key={u.value} onClick={() => setUse(u.value)} style={{
                  padding: '10px 12px', borderRadius: 12,
                  border: `2px solid ${use === u.value ? '#c9a84c' : '#ede8df'}`,
                  background: use === u.value ? '#fdf6e3' : '#fff',
                  color: '#2c1f14', fontSize: 13,
                  fontWeight: use === u.value ? 700 : 400,
                  cursor: 'pointer', textAlign: 'center', transition: 'border-color 0.15s',
                }}>
                  {u.label}
                </button>
              ))}
            </div>

            {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}

            <button
              onClick={handleSubmit}
              disabled={!allSelected || loading}
              style={{
                width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                background: allSelected && !loading ? '#c9a84c' : '#e0d8d0',
                color: allSelected && !loading ? '#fff' : '#999',
                fontSize: 15, fontWeight: 700,
                cursor: allSelected && !loading ? 'pointer' : 'default',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Dhundh raha hoon…' : 'Best wala dikhao →'}
            </button>
          </>
        )}

        {step === 'result' && result?.product && (
          <>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#c9a84c', textTransform: 'uppercase', marginBottom: 4 }}>Aapke liye best pick</p>
            <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, fontWeight: 700, color: '#2c1f14', margin: '0 0 18px' }}>Yeh lo! ✅</h2>

            <TiltCard maxTilt={15} scale={1.025} style={{ background: '#fff', borderRadius: 16, border: '2px solid #c9a84c', padding: 16, marginBottom: 16, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              {img
                ? <img src={img} alt={result.product.name} style={{ width: 88, height: 88, borderRadius: 10, objectFit: 'cover', background: '#f5f0e8', flexShrink: 0, transform: 'translateZ(60px)' }} />
                : <div style={{ width: 88, height: 88, borderRadius: 10, background: '#f5f0e8', flexShrink: 0, transform: 'translateZ(60px)' }} />
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#2c1f14', margin: '0 0 4px', lineHeight: 1.3, transform: 'translateZ(35px)' }}>{result.product.name}</p>
                {result.product.brand && <p style={{ fontSize: 12, color: '#8a7060', margin: '0 0 6px', transform: 'translateZ(28px)' }}>{result.product.brand}</p>}
                <p style={{ fontSize: 17, fontWeight: 800, color: '#c9a84c', margin: '0 0 8px', transform: 'translateZ(42px)' }}>{rupee(price)}</p>
                <p style={{ fontSize: 12, color: '#6b5544', background: '#fdf6e3', padding: '5px 8px', borderRadius: 8, display: 'inline-block', margin: 0, transform: 'translateZ(30px)' }}>💡 {result.reason}</p>
              </div>
            </TiltCard>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
              <a href={waLink} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', padding: '13px', borderRadius: 14, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                <MessageCircle size={18} /> Buy Now on WhatsApp
              </a>
              <Link href={`/product/${result.product.id}`}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#2c1f14', color: '#c9a84c', padding: '12px', borderRadius: 14, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                View Full Details <ChevronRight size={16} />
              </Link>
            </div>

            {result.alternatives?.length > 0 && (
              <button onClick={() => setStep('more')}
                style={{ background: 'none', border: 'none', color: '#8a7060', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                Show me 2 more options
              </button>
            )}
          </>
        )}

        {step === 'more' && result?.alternatives?.length > 0 && (
          <>
            <button onClick={() => setStep('result')}
              style={{ background: 'none', border: 'none', color: '#8a7060', fontSize: 13, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>
              ← Back to top pick
            </button>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 18, fontWeight: 700, color: '#2c1f14', margin: '0 0 14px' }}>2 More Options</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {result.alternatives.map((alt) => {
                const altPrice = alt.sale_price ?? alt.price ?? 0;
                const altImg = alt.image_url || alt.imageUrl || '';
                const altWa = buildWhatsAppLink(buildBuyNowMessage(alt, { quantity: 1, productUrl: buildProductUrl(alt.id) }));
                return (
                  <div key={alt.id} style={{ background: '#fff', borderRadius: 14, border: '1px solid #ede8df', padding: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                    {altImg
                      ? <img src={altImg} alt={alt.name} style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover', background: '#f5f0e8', flexShrink: 0 }} />
                      : <div style={{ width: 64, height: 64, borderRadius: 8, background: '#f5f0e8', flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: '#2c1f14', margin: '0 0 4px', lineHeight: 1.3 }}>{alt.name}</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: '#c9a84c', margin: '0 0 8px' }}>{rupee(altPrice)}</p>
                      <a href={altWa} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 12, fontWeight: 700, background: '#25D366', color: '#fff', padding: '5px 12px', borderRadius: 10, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <MessageCircle size={12} /> Buy
                      </a>
                    </div>
                    <Link href={`/product/${alt.id}`} style={{ color: '#8a7060', flexShrink: 0 }}><ChevronRight size={18} /></Link>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
