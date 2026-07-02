'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, Search, X, Check } from 'lucide-react';
import { buildWhatsAppLink, buildBuyNowMessage, buildProductUrl, rupee } from '@/lib/constants';
import { categoryPath } from '@/lib/categoryUtils';
import TiltCard from '@/components/TiltCard';

const PROBLEMS = [
  { emoji: '💥', label: 'Bag baar baar tootta hai', category: 'LUGGAGE', reason: 'Durable luggage — strong wheels, tough zippers, long-lasting' },
  { emoji: '🏋️', label: 'Bohot heavy lagta hai', category: 'Backpacks', reason: 'Lightweight bags — easy on shoulders, perfect for daily carry' },
  { emoji: '✈️', label: 'Flight size nahi pata', category: 'LUGGAGE', reason: 'Cabin-size compliant — fits IndiGo, Air India, SpiceJet bins' },
  { emoji: '🎒', label: 'Bacche ka school bag', category: 'School Bags', reason: 'Sturdy school bags — comfy straps, roomy, built to last' },
  { emoji: '💼', label: 'Office professional bag', category: 'Backpacks', reason: 'Professional look — laptop compartment, sleek design' },
  { emoji: '🧳', label: 'Shaadi/trip bada set', category: 'LUGGAGE', reason: 'Large travel sets — perfect for long trips and weddings' },
  { emoji: '🎁', label: 'Gift dena hai kisi ko', category: 'Handbags', reason: 'Premium gift choice — stylish, practical, beautifully presented' },
  { emoji: '🎓', label: 'College ke liye bag', category: 'Backpacks', reason: 'College-ready — fits laptop, books, water bottle comfortably' },
  { emoji: '💸', label: 'Budget mein best chahiye', category: null, reason: 'Best value picks — top quality at lowest price in Jalandhar' },
  { emoji: '✨', label: 'Trendy/fashionable bag', category: 'Party Wear Purse', reason: 'Stylish and trendy — turn heads wherever you go' },
  { emoji: '👜', label: 'Ladies daily handbag', category: 'Handbags', reason: 'Everyday handbags — spacious, stylish, shoulder-friendly' },
  { emoji: '👝', label: 'Chhota sling bag chahiye', category: 'Slings', reason: 'Compact sling bags — light, stylish, perfect for short outings' },
];

export default function ProblemSearch({ allProducts = [] }) {
  const [results, setResults] = useState(null);
  const [activeChip, setActiveChip] = useState(null);
  const [freeText, setFreeText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const [tapping, setTapping] = useState(null);
  const resultsRef = useRef(null);
  const sectionRef = useRef(null);
  const [sectionVisible, setSectionVisible] = useState(false);
  const [chipsVisible, setChipsVisible] = useState(false);
  const [subtitleText, setSubtitleText] = useState('');

  const SUBTITLE = 'Tap karo — hum sahi bag dhundhenge';

  useEffect(() => {
    let typeTimer;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setSectionVisible(true);
          setTimeout(() => setChipsVisible(true), 500);
          // typewriter starts after words animate in (~0.6s)
          setTimeout(() => {
            let idx = 0;
            typeTimer = setInterval(() => {
              idx++;
              setSubtitleText(SUBTITLE.slice(0, idx));
              if (idx >= SUBTITLE.length) clearInterval(typeTimer);
            }, 36);
          }, 650);
          observer.disconnect();
        }
      },
      { threshold: 0.12 }
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => { observer.disconnect(); if (typeTimer) clearInterval(typeTimer); };
  }, []);

  function filterByProblem(problem, idx) {
    if (activeChip?.label === problem.label) {
      setActiveChip(null); setResults(null); setAiReason(''); setTotalCount(0);
      return;
    }
    setTapping(idx);
    setTimeout(() => setTapping(null), 350);
    setActiveChip(problem);
    setFreeText('');
    setAiReason(problem.reason);

    let filtered = allProducts.filter((p) => {
      if (!problem.category) return true;
      return (p.category || '').toLowerCase() === (problem.category || '').toLowerCase();
    }).sort((a, b) => {
      if (b.featured !== a.featured) return b.featured ? 1 : -1;
      return (b.discount_percent || 0) - (a.discount_percent || 0);
    });

    setTotalCount(filtered.length);
    if (filtered.length === 0) filtered = allProducts.filter((p) => p.featured).slice(0, 4);
    setResults(filtered.slice(0, 4));

    setTimeout(() => {
      if (window.innerWidth < 1024) {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 120);
  }

  async function handleFreeText(e) {
    e.preventDefault();
    if (!freeText.trim()) return;
    setAiLoading(true); setActiveChip(null); setResults(null); setAiReason(''); setTotalCount(0);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: freeText }], products: allProducts }),
      });
      const data = await res.json();
      const matched = Array.isArray(data.products) && data.products.length > 0
        ? data.products : allProducts.filter((p) => p.featured).slice(0, 4);
      setResults(matched.slice(0, 4));
      setTotalCount(matched.length);
      setAiReason(data.reply ? data.reply.replace(/<[^>]+>/g, '').slice(0, 120) : 'Top matches for your need');
    } catch {
      setResults(allProducts.filter((p) => p.featured).slice(0, 4));
      setAiReason('Top picks from our collection');
    } finally {
      setAiLoading(false);
      setTimeout(() => {
        if (window.innerWidth < 1024) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }

  const seeAllHref = activeChip?.category ? categoryPath(activeChip.category) : '/products';
  const noResultsWaText = `Hi SETHI PURSE! ${activeChip ? activeChip.label : freeText} ke liye koi bag suggest karein please.`;

  return (
    <section ref={sectionRef} style={{ background: '#faf8f4', padding: '40px 16px' }}>
      <div style={{ maxWidth: 1152, margin: '0 auto' }}>
      <div style={{
        background: '#fff',
        borderRadius: 20,
        border: '1px solid #ede8df',
        boxShadow: '0 8px 32px rgba(44,31,20,0.08)',
        padding: '32px 24px',
      }}>

        {/* Heading — word-mask slide-up + emoji bounce + typewriter subtitle */}
        <div style={{ marginBottom: 20 }}>

          {/* Smart Finder badge with spinner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <svg width="32" height="32" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle className="uv-dash" cx="60" cy="60" r="54" stroke="#c9a84c" strokeWidth="5" strokeLinecap="round" fill="none" />
              <circle className="uv-spin" cx="60" cy="60" r="54" stroke="#f0d070" strokeWidth="5" strokeLinecap="round" fill="none" />
            </svg>
            <span style={{
              fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase',
              color: '#a07a28', fontWeight: 600, fontFamily: 'DM Sans, sans-serif',
            }}>
              ✦ Smart Finder
            </span>
          </div>

          <h2 style={{
            fontFamily: "'Cormorant Garamond',serif",
            fontSize: 30, fontWeight: 700, color: '#2c1f14',
            margin: '0 0 8px', lineHeight: 1.25,
            display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 0.28em',
          }}>
            {['Apni', 'problem', 'batao'].map((word, i) => (
              <span key={word} style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}>
                <span style={{
                  display: 'inline-block',
                  transform: sectionVisible ? 'translateY(0)' : 'translateY(110%)',
                  opacity: sectionVisible ? 1 : 0,
                  transition: `transform 0.65s cubic-bezier(0.16, 1, 0.3, 1) ${i * 0.13}s, opacity 0.4s ease ${i * 0.13}s`,
                }}>
                  {word}
                </span>
              </span>
            ))}
            <span style={{ display: 'inline-block', overflow: 'hidden', verticalAlign: 'bottom' }}>
              <span style={{
                display: 'inline-block',
                animation: sectionVisible ? 'emoji-drop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both' : 'none',
                opacity: sectionVisible ? undefined : 0,
              }}>
                🛍️
              </span>
            </span>
          </h2>
          <p style={{ fontSize: 14, color: '#8a7060', margin: 0, minHeight: '1.4em', fontFamily: 'monospace', letterSpacing: '-0.01em' }}>
            {subtitleText}
            {subtitleText.length < SUBTITLE.length && sectionVisible && (
              <span style={{
                display: 'inline-block', width: 2, height: '0.9em',
                background: '#c9a84c', marginLeft: 2, verticalAlign: 'text-bottom',
                animation: 'cursor-blink 0.65s step-end infinite',
              }} />
            )}
          </p>
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 18 }}>
          {PROBLEMS.map((p, i) => {
            const isActive = activeChip?.label === p.label;
            const isTapping = tapping === i;
            return (
              <button key={p.label} onClick={() => filterByProblem(p, i)} style={{
                padding: '8px 14px', borderRadius: 24,
                border: `2px solid ${isActive ? '#c9a84c' : '#ede8df'}`,
                background: isActive ? '#fdf6e3' : '#faf8f4',
                color: '#2c1f14', fontSize: 13,
                fontWeight: isActive ? 700 : 400,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                whiteSpace: 'nowrap',
                opacity: chipsVisible ? 1 : 0,
                transform: isTapping ? 'scale(0.91)' : isActive ? 'scale(1.05)' : 'scale(1)',
                transition: 'border-color 0.15s, background 0.15s, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.35s ease',
                transitionDelay: chipsVisible ? `${i * 0.04}s` : '0s',
              }}>
                <span style={{ fontSize: 15 }}>{p.emoji}</span>
                {p.label}
                {isActive && (
                  <span style={{ display: 'inline-flex', animation: 'check-pop 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards' }}>
                    <Check size={13} color="#c9a84c" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Free-text */}
        <div style={{
          opacity: sectionVisible ? 1 : 0,
          transform: sectionVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease 0.35s, transform 0.6s ease 0.35s',
        }}>
          <form onSubmit={handleFreeText} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8a7060' }} />
              <input
                value={freeText}
                onChange={(e) => { setFreeText(e.target.value); setActiveChip(null); setResults(null); setTotalCount(0); }}
                placeholder="Ya apni problem likhein — Hindi ya English mein…"
                style={{
                  width: '100%', padding: '11px 36px 11px 36px', borderRadius: 12,
                  border: '1px solid #ede8df', background: '#faf8f4', fontSize: 14, color: '#2c1f14',
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#c9a84c'}
                onBlur={(e) => e.target.style.borderColor = '#ede8df'}
              />
              {freeText && (
                <button type="button" onClick={() => { setFreeText(''); setResults(null); setAiReason(''); setTotalCount(0); }}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={14} color="#8a7060" />
                </button>
              )}
            </div>
            <button type="submit" disabled={!freeText.trim() || aiLoading} style={{
              padding: '11px 18px', borderRadius: 12, border: 'none',
              background: freeText.trim() && !aiLoading ? '#c9a84c' : '#e0d8d0',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: freeText.trim() && !aiLoading ? 'pointer' : 'default',
              whiteSpace: 'nowrap', flexShrink: 0, transition: 'background 0.2s',
            }}>
              {aiLoading ? '…' : 'Dhundho'}
            </button>
          </form>
        </div>

        {/* Results */}
        {results !== null && (
          <div ref={resultsRef} style={{ animation: 'results-in 0.4s ease forwards' }}>
            {aiReason && (
              <p style={{
                fontSize: 13, color: '#6b5544', background: '#faf8f4',
                padding: '8px 14px', borderRadius: 10, marginBottom: 16,
                display: 'inline-block', border: '1px solid #ede8df',
                animation: 'results-in 0.5s ease 0.1s both',
              }}>
                💡 {aiReason}
              </p>
            )}

            {results.length === 0 ? (
              <div style={{ background: '#faf8f4', borderRadius: 16, padding: '24px 20px', textAlign: 'center', border: '1px solid #ede8df' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#2c1f14', margin: '0 0 6px' }}>Yeh category abhi available nahi</p>
                <p style={{ fontSize: 13, color: '#8a7060', margin: '0 0 16px' }}>Koi baat nahi — WhatsApp karein, hum personally help karenge!</p>
                <a href={buildWhatsAppLink(noResultsWaText)} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#25D366', color: '#fff', padding: '12px 22px', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                  <MessageCircle size={16} /> WhatsApp pe poochho
                </a>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {results.map((product, ri) => {
                    const price = product.sale_price ?? product.price ?? 0;
                    const mrp = product.mrp ?? product.original_price ?? 0;
                    const discount = product.discount_percent || (mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0);
                    const img = product.image_url || product.imageUrl || '';
                    const outOfStock = product.stock === 0;
                    const waMsg = buildWhatsAppLink(buildBuyNowMessage(product, { quantity: 1, productUrl: buildProductUrl(product.id) }));
                    const waitlistMsg = buildWhatsAppLink(`Hi SETHI PURSE! ${product.name} out of stock hai. Kab milega? Waitlist mein add karo please.`);
                    return (
                      <TiltCard key={product.id} maxTilt={12} scale={1.04} style={{
                        background: '#faf8f4', borderRadius: 14,
                        border: '1px solid #ede8df', display: 'flex', flexDirection: 'column',
                        position: 'relative',
                        animation: `results-in 0.4s ease ${ri * 0.07}s both`,
                      }}>
                        {/* Badges float above card surface */}
                        {discount > 0 && (
                          <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1, background: '#e53935', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 10, transform: 'translateZ(50px)' }}>
                            {discount}% OFF
                          </div>
                        )}
                        {outOfStock && (
                          <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 1, background: 'rgba(44,31,20,0.75)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, transform: 'translateZ(50px)' }}>
                            Out of Stock
                          </div>
                        )}
                        {/* Image clips inside its own overflow:hidden — rounded top corners */}
                        <Link href={`/product/${product.id}`} style={{ display: 'block', aspectRatio: '4/3', background: '#f5f0e8', overflow: 'hidden', borderRadius: '14px 14px 0 0' }}>
                          {img
                            ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.35s ease' }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'} />
                            : <div style={{ width: '100%', height: '100%', background: '#f5f0e8' }} />
                          }
                        </Link>
                        {/* Content lifts above card plane */}
                        <div style={{ padding: '10px 10px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4, transform: 'translateZ(22px)' }}>
                          <Link href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                            <p style={{ fontSize: 12.5, fontWeight: 700, color: '#2c1f14', margin: 0, lineHeight: 1.3, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {product.name}
                            </p>
                          </Link>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, flexWrap: 'wrap', transform: 'translateZ(10px)' }}>
                            <span style={{ fontSize: 14, fontWeight: 800, color: '#c9a84c' }}>{rupee(price)}</span>
                            {mrp > price && <span style={{ fontSize: 11, color: '#bbb', textDecoration: 'line-through' }}>{rupee(mrp)}</span>}
                          </div>
                          {outOfStock ? (
                            <a href={waitlistMsg} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: '#8a7060', color: '#fff', padding: '7px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700, textDecoration: 'none', marginTop: 'auto', transform: 'translateZ(14px)' }}>
                              <MessageCircle size={11} /> Waitlist
                            </a>
                          ) : (
                            <a href={waMsg} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, background: '#25D366', color: '#fff', padding: '7px 4px', borderRadius: 10, fontSize: 11, fontWeight: 700, textDecoration: 'none', marginTop: 'auto', transform: 'translateZ(14px)' }}>
                              <MessageCircle size={11} /> Buy on WhatsApp
                            </a>
                          )}
                        </div>
                      </TiltCard>
                    );
                  })}
                </div>

                {totalCount > 4 && (
                  <div style={{ textAlign: 'center', marginTop: 18 }}>
                    <Link href={seeAllHref} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      color: '#a07a28', fontSize: 14, fontWeight: 700, textDecoration: 'none',
                      borderBottom: '2px solid #c9a84c', paddingBottom: 2,
                    }}>
                      See all {totalCount} matches →
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
      </div>

      <style>{`
        @keyframes emoji-drop {
          from { opacity: 0; transform: scale(0.15) rotate(-45deg); }
          60%  { transform: scale(1.4) rotate(18deg); }
          80%  { transform: scale(0.9) rotate(-6deg); }
          to   { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes check-pop {
          from { opacity: 0; transform: scale(0.4) rotate(-20deg); }
          70%  { transform: scale(1.3) rotate(5deg); }
          to   { opacity: 1; transform: scale(1) rotate(0); }
        }
        @keyframes results-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
