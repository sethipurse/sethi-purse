'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { MessageCircle, Mic, Search, X, Check } from 'lucide-react';
import { buildWhatsAppLink, buildBuyNowMessage, buildProductUrl, FALLBACK_SEARCH_NOTICE, rupee, VOICE_SEARCH_HINT, VOICE_SEARCH_PLACEHOLDER } from '@/lib/constants';
import { categoryPath } from '@/lib/categoryUtils';
import { useSpeech } from '@/lib/useSpeech';
import TiltCard from '@/components/TiltCard';

const GROUPS = ['Travel', 'Daily & Work', 'Style & Gifting'];

const PROBLEMS = [
  { emoji: '💥', label: 'Bag baar baar tootta hai', group: 'Travel', category: 'LUGGAGE', reason: 'Durable luggage — strong wheels, tough zippers, long-lasting', keywords: ['durable', 'strong', 'sturdy', 'wheel', 'zipper', 'tough'] },
  { emoji: '✈️', label: 'Flight size nahi pata', group: 'Travel', category: 'LUGGAGE', reason: 'Cabin-size compliant — fits IndiGo, Air India, SpiceJet bins', keywords: ['cabin', 'flight', 'compliant', 'carry-on', 'carry on'] },
  { emoji: '🧳', label: 'Shaadi/trip bada set', group: 'Travel', category: 'LUGGAGE', tag: 'Travel', reason: 'Large travel sets — perfect for long trips and weddings', keywords: ['set', 'large', 'big', 'trip', 'wedding'] },
  { emoji: '🏋️', label: 'Bohot heavy lagta hai', group: 'Daily & Work', category: 'Backpacks', tag: 'Daily', reason: 'Lightweight bags — easy on shoulders, perfect for daily carry', keywords: ['light', 'lightweight', 'daily', 'comfortable'] },
  { emoji: '🎒', label: 'Bacche ka school bag', group: 'Daily & Work', category: 'Backpacks', tag: 'School', reason: 'Sturdy school bags — comfy straps, roomy, built to last', keywords: ['school', 'student', 'kids', 'child', 'roomy'] },
  { emoji: '💼', label: 'Office professional bag', group: 'Daily & Work', category: 'Backpacks', tag: 'Office', reason: 'Professional look — laptop compartment, sleek design', keywords: ['office', 'professional', 'laptop', 'formal', 'sleek'] },
  { emoji: '🎓', label: 'College ke liye bag', group: 'Daily & Work', category: 'Backpacks', tag: 'College', reason: 'College-ready — fits laptop, books, water bottle comfortably', keywords: ['college', 'laptop', 'student', 'books'] },
  { emoji: '👜', label: 'Ladies daily handbag', group: 'Daily & Work', category: 'Handbags', tag: 'Daily', reason: 'Everyday handbags — spacious, stylish, shoulder-friendly', keywords: ['daily', 'everyday', 'spacious'] },
  { emoji: '👝', label: 'Chhota sling bag chahiye', group: 'Daily & Work', category: 'Slings', reason: 'Compact sling bags — light, stylish, perfect for short outings', keywords: ['compact', 'small', 'mini', 'light'] },
  { emoji: '🎁', label: 'Gift dena hai kisi ko', group: 'Style & Gifting', category: 'Handbags', tag: 'Gift', reason: 'Premium gift choice — stylish, practical, beautifully presented', keywords: ['gift', 'premium', 'elegant'] },
  { emoji: '✨', label: 'Trendy/fashionable bag', group: 'Style & Gifting', category: 'Party Wear Purse', tag: 'Party', reason: 'Stylish and trendy — turn heads wherever you go', keywords: ['trendy', 'stylish', 'fashion'] },
  { emoji: '💸', label: 'Budget mein best chahiye', group: 'Style & Gifting', category: null, reason: 'Best value picks — top quality at lowest price in Jalandhar', keywords: [] },
];

export default function ProblemSearch({ allProducts = [] }) {
  const [results, setResults] = useState(null);
  const [activeGroup, setActiveGroup] = useState(GROUPS[0]);
  const [activeChip, setActiveChip] = useState(null);
  const [freeText, setFreeText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState('');
  const [isFallback, setIsFallback] = useState(false);
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
      setActiveChip(null); setResults(null); setAiReason(''); setTotalCount(0); setIsFallback(false);
      return;
    }
    setTapping(idx);
    setTimeout(() => setTapping(null), 350);
    setActiveChip(problem);
    setFreeText('');
    setAiReason(problem.reason);

    // Several chips share a category (e.g. school/office/college all pull
    // from Backpacks) — rank by how well each product matches this specific
    // chip's need first, so different chips surface different top picks
    // instead of the same featured/discount order. An admin-assigned
    // use-case tag (set in Admin -> Products) is trusted over a keyword
    // guess from the name/description, since it's a deliberate choice.
    const matchesTag = (product) =>
      !!problem.tag && Array.isArray(product.tags) && product.tags.some((t) => t.toLowerCase() === problem.tag.toLowerCase());
    const matchesKeyword = (product) => {
      const text = `${product.name || ''} ${product.description || ''}`.toLowerCase();
      return (problem.keywords || []).some((k) => text.includes(k));
    };
    const relevanceScore = (product) => (matchesTag(product) ? 2 : matchesKeyword(product) ? 1 : 0);
    let filtered = allProducts.filter((p) => {
      if (!problem.category) return true;
      return (p.category || '').toLowerCase() === (problem.category || '').toLowerCase();
    }).sort((a, b) => {
      const sa = relevanceScore(a), sb = relevanceScore(b);
      if (sa !== sb) return sb - sa;
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

  async function runSearch(text) {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    setAiLoading(true); setActiveChip(null); setResults(null); setAiReason(''); setTotalCount(0); setIsFallback(false);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: trimmed }], products: allProducts }),
      });
      const data = await res.json();
      const hasServerMatches = Array.isArray(data.products) && data.products.length > 0;
      const matched = hasServerMatches ? data.products : allProducts.filter((p) => p.featured).slice(0, 4);
      setResults(matched.slice(0, 4));
      setTotalCount(matched.length);
      setAiReason(data.reply ? data.reply.replace(/<[^>]+>/g, '').slice(0, 120) : 'Top matches for your need');
      // Not a confident match either if the server flagged it, or if there
      // were no server matches at all and we substituted our own featured picks.
      setIsFallback(!!data.isFallback || !hasServerMatches);
    } catch {
      setResults(allProducts.filter((p) => p.featured).slice(0, 4));
      setAiReason('Top picks from our collection');
      setIsFallback(true);
    } finally {
      setAiLoading(false);
      setTimeout(() => {
        if (window.innerWidth < 1024) resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    }
  }

  function handleFreeText(e) {
    e.preventDefault();
    runSearch(freeText);
  }

  // Punjabi first (this is a Jalandhar shop) — Chrome's Web Speech API has
  // spotty pa-IN support, so any failure (unsupported language, no speech
  // detected, mic denied, etc.) gets one automatic retry in Hindi.
  const voiceRetriedRef = useRef(false);
  const { supported: micSupported, listening: micListening, start: startVoice } = useSpeech({
    lang: 'pa-IN',
    onResult: (transcript) => {
      voiceRetriedRef.current = false;
      setFreeText(transcript);
      runSearch(transcript);
    },
    onError: () => {
      if (!voiceRetriedRef.current) {
        voiceRetriedRef.current = true;
        startVoice('hi-IN');
      }
    },
  });

  function handleMicClick() {
    voiceRetriedRef.current = false;
    startVoice();
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
        <div style={{
          marginBottom: 20,
          animation: sectionVisible ? 'finder-blink 1.7s ease-in-out 1.3s infinite' : 'none',
        }}>

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

        {/* Group tabs — splits 12 chips into 3 focused groups instead of one long wrapping row */}
        <div style={{
          display: 'flex', gap: 6, marginBottom: 14,
          opacity: chipsVisible ? 1 : 0, transition: 'opacity 0.35s ease',
        }}>
          {GROUPS.map((g) => {
            const isActiveGroup = activeGroup === g;
            return (
              <button key={g} onClick={() => { setActiveGroup(g); setActiveChip(null); setResults(null); setAiReason(''); setTotalCount(0); setIsFallback(false); }} style={{
                padding: '7px 14px', borderRadius: 10, border: 'none',
                background: isActiveGroup ? '#2c1f14' : '#f0e9dc',
                color: isActiveGroup ? '#fff' : '#6b5544',
                fontSize: 12.5, fontWeight: 700, cursor: 'pointer',
                transition: 'background 0.2s, color 0.2s',
              }}>
                {g}
              </button>
            );
          })}
        </div>

        {/* Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 9, marginBottom: 18 }}>
          {PROBLEMS.filter((p) => p.group === activeGroup).map((p, i) => {
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
          <form onSubmit={handleFreeText} style={{ display: 'flex', gap: 8, marginBottom: micSupported ? 8 : 24 }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8a7060' }} />
              <input
                value={freeText}
                onChange={(e) => { setFreeText(e.target.value); setActiveChip(null); setResults(null); setTotalCount(0); }}
                placeholder={micListening ? VOICE_SEARCH_PLACEHOLDER : 'Ya apni problem likhein — Hindi ya English mein…'}
                style={{
                  width: '100%', padding: `11px ${micSupported ? 80 : 36}px 11px 36px`, borderRadius: 12,
                  border: '1px solid #ede8df', background: '#faf8f4', fontSize: 14, color: '#2c1f14',
                  outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
                }}
                onFocus={(e) => e.target.style.borderColor = '#c9a84c'}
                onBlur={(e) => e.target.style.borderColor = '#ede8df'}
              />
              {freeText && (
                <button type="button" onClick={() => { setFreeText(''); setResults(null); setAiReason(''); setTotalCount(0); setIsFallback(false); }}
                  style={{ position: 'absolute', right: micSupported ? 46 : 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <X size={14} color="#8a7060" />
                </button>
              )}
              {micSupported && (
                <button type="button" onClick={handleMicClick} aria-label="Search by voice"
                  style={{
                    position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}>
                  <Mic size={18} color={micListening ? '#e53935' : '#c9a84c'} />
                  {micListening && (
                    <span style={{
                      position: 'absolute', top: 9, right: 11, width: 8, height: 8, borderRadius: '50%',
                      background: '#e53935', animation: 'mic-dot-pulse 1s ease-in-out infinite',
                    }} />
                  )}
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
          {micSupported && (
            <p style={{ fontSize: 11, color: '#8a7060', margin: '0 0 24px', textAlign: 'center' }}>{VOICE_SEARCH_HINT}</p>
          )}
        </div>

        {/* Results */}
        {results !== null && (
          <div ref={resultsRef} style={{ animation: 'results-in 0.4s ease forwards' }}>
            {isFallback && results.length > 0 && (
              <p style={{
                fontSize: 13, fontWeight: 700, color: '#a07a28', background: '#fdf6e3',
                padding: '8px 14px', borderRadius: 10, marginBottom: 12,
                display: 'inline-block', border: '1px solid #e8d5a3',
                animation: 'results-in 0.4s ease both',
              }}>
                {FALLBACK_SEARCH_NOTICE}
              </p>
            )}

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
                {(() => {
                  const [hero, ...alternates] = results;
                  const heroPrice = hero.sale_price ?? hero.price ?? 0;
                  const heroMrp = hero.mrp ?? hero.original_price ?? 0;
                  const heroDiscount = hero.discount_percent || (heroMrp > heroPrice ? Math.round(((heroMrp - heroPrice) / heroMrp) * 100) : 0);
                  const heroImg = hero.image_url || hero.imageUrl || '';
                  const heroOut = hero.stock === 0;
                  const heroWa = buildWhatsAppLink(buildBuyNowMessage(hero, { quantity: 1, productUrl: buildProductUrl(hero.id) }));
                  const heroWaitlist = buildWhatsAppLink(`Hi SETHI PURSE! ${hero.name} out of stock hai. Kab milega? Waitlist mein add karo please.`);
                  return (
                    <>
                      {/* One confident top pick instead of 4 equal-weight cards */}
                      <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#c9a84c', textTransform: 'uppercase', margin: '0 0 8px' }}>Aapke liye best match</p>
                      <TiltCard maxTilt={12} scale={1.03} style={{
                        background: '#fff', borderRadius: 16, border: '2px solid #c9a84c', padding: 14,
                        marginBottom: alternates.length > 0 ? 16 : 4, display: 'flex', gap: 14, alignItems: 'flex-start',
                        position: 'relative', animation: 'results-in 0.4s ease both',
                      }}>
                        {heroDiscount > 0 && (
                          <div style={{ position: 'absolute', top: -9, left: 14, background: '#e53935', color: '#fff', fontSize: 10, fontWeight: 800, padding: '3px 9px', borderRadius: 10, transform: 'translateZ(50px)' }}>
                            {heroDiscount}% OFF
                          </div>
                        )}
                        <Link href={`/product/${hero.id}`} style={{ flexShrink: 0 }}>
                          {heroImg
                            ? <img src={heroImg} alt={hero.name} style={{ width: 100, height: 100, borderRadius: 12, objectFit: 'cover', background: '#f5f0e8' }} />
                            : <div style={{ width: 100, height: 100, borderRadius: 12, background: '#f5f0e8' }} />}
                        </Link>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Link href={`/product/${hero.id}`} style={{ textDecoration: 'none' }}>
                            <p style={{ fontSize: 15, fontWeight: 700, color: '#2c1f14', margin: '0 0 4px', lineHeight: 1.3 }}>{hero.name}</p>
                          </Link>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span style={{ fontSize: 17, fontWeight: 800, color: '#c9a84c' }}>{rupee(heroPrice)}</span>
                            {heroMrp > heroPrice && <span style={{ fontSize: 12, color: '#bbb', textDecoration: 'line-through' }}>{rupee(heroMrp)}</span>}
                          </div>
                          {heroOut ? (
                            <a href={heroWaitlist} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#8a7060', color: '#fff', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                              <MessageCircle size={13} /> Waitlist
                            </a>
                          ) : (
                            <a href={heroWa} target="_blank" rel="noopener noreferrer"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#25D366', color: '#fff', padding: '8px 14px', borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                              <MessageCircle size={13} /> Buy on WhatsApp
                            </a>
                          )}
                        </div>
                      </TiltCard>

                      {alternates.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <p style={{ fontSize: 12, fontWeight: 700, color: '#8a7060', margin: '0 0 2px' }}>More options</p>
                          {alternates.map((product, ri) => {
                            const price = product.sale_price ?? product.price ?? 0;
                            const img = product.image_url || product.imageUrl || '';
                            const outOfStock = product.stock === 0;
                            const waMsg = buildWhatsAppLink(buildBuyNowMessage(product, { quantity: 1, productUrl: buildProductUrl(product.id) }));
                            return (
                              <Link key={product.id} href={`/product/${product.id}`} style={{
                                background: '#faf8f4', borderRadius: 12, border: '1px solid #ede8df', padding: 10,
                                display: 'flex', gap: 10, alignItems: 'center', textDecoration: 'none',
                                animation: `results-in 0.4s ease ${ri * 0.07}s both`,
                              }}>
                                {img
                                  ? <img src={img} alt={product.name} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', background: '#f5f0e8', flexShrink: 0 }} />
                                  : <div style={{ width: 52, height: 52, borderRadius: 8, background: '#f5f0e8', flexShrink: 0 }} />}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={{ fontSize: 12.5, fontWeight: 700, color: '#2c1f14', margin: '0 0 3px', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.name}</p>
                                  <p style={{ fontSize: 13, fontWeight: 800, color: '#c9a84c', margin: 0 }}>{rupee(price)}</p>
                                </div>
                                {!outOfStock && (
                                  <a href={waMsg} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                    style={{ fontSize: 11, fontWeight: 700, background: '#25D366', color: '#fff', padding: '6px 10px', borderRadius: 8, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                                    <MessageCircle size={11} /> Buy
                                  </a>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </>
                  );
                })()}

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
        @keyframes finder-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes mic-dot-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(1.3); }
        }
      `}</style>
    </section>
  );
}
