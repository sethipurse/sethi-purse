'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, Search, X } from 'lucide-react';
import { buildWhatsAppLink, buildBuyNowMessage, buildProductUrl, rupee } from '@/lib/constants';

const PROBLEMS = [
  { emoji: '💥', label: 'Bag baar baar tootta hai', category: 'LUGGAGE', tag: 'durable', reason: 'Durable luggage — strong wheels, tough zippers, long-lasting fabric' },
  { emoji: '🏋️', label: 'Bohot heavy lagta hai', category: 'Backpacks', tag: 'lightweight', reason: 'Lightweight bags — easy on shoulders, perfect for daily carry' },
  { emoji: '✈️', label: 'Flight allowed size nahi pata', category: 'LUGGAGE', size: '21', reason: 'Cabin-size compliant — fits IndiGo, Air India, SpiceJet overhead bins' },
  { emoji: '🎒', label: "Bacche ka school bag kharab hua", category: 'School Bags', reason: 'Sturdy school bags — comfortable straps, roomy, built to last' },
  { emoji: '💼', label: 'Office ke liye professional bag', category: 'Backpacks', tag: 'office', reason: 'Professional look — laptop compartment, sleek design' },
  { emoji: '🧳', label: 'Shaadi/trip ke liye bada set', category: 'LUGGAGE', reason: 'Large travel sets — perfect for long trips and weddings' },
];

export default function ProblemSearch({ allProducts = [], onAISearch }) {
  const [results, setResults] = useState(null);
  const [activeChip, setActiveChip] = useState(null);
  const [freeText, setFreeText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReason, setAiReason] = useState('');

  function filterByProblem(problem) {
    if (activeChip?.label === problem.label) {
      setActiveChip(null);
      setResults(null);
      setAiReason('');
      return;
    }
    setActiveChip(problem);
    setFreeText('');
    setAiReason(problem.reason);

    let filtered = allProducts.filter((p) => {
      const cat = (p.category || '').toLowerCase();
      const probCat = (problem.category || '').toLowerCase();
      return cat === probCat;
    });

    if (filtered.length === 0) filtered = allProducts.filter((p) => p.featured).slice(0, 4);
    else filtered = filtered.slice(0, 4);

    setResults(filtered);
  }

  async function handleFreeText(e) {
    e.preventDefault();
    if (!freeText.trim()) return;
    setAiLoading(true);
    setActiveChip(null);
    setResults(null);
    setAiReason('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: freeText }],
          products: allProducts,
        }),
      });
      const data = await res.json();
      const matched = Array.isArray(data.products) && data.products.length > 0
        ? data.products
        : allProducts.filter((p) => p.featured).slice(0, 4);
      setResults(matched.slice(0, 4));
      setAiReason(data.reply ? data.reply.replace(/<[^>]+>/g, '').slice(0, 120) : 'Top matches for your need');
    } catch {
      setResults(allProducts.filter((p) => p.featured).slice(0, 4));
      setAiReason('Top picks from our collection');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <section style={{ background: '#f5f0e8', padding: '32px 16px', borderRadius: 0 }}>
      <div style={{ maxWidth: 1152, margin: '0 auto' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, color: '#2c1f14', margin: '0 0 4px' }}>
          Apni problem batao 🛍️
        </h2>
        <p style={{ fontSize: 14, color: '#8a7060', margin: '0 0 20px' }}>Tap karo — hum sahi bag dhundhenge</p>

        {/* Problem chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          {PROBLEMS.map((p) => (
            <button
              key={p.label}
              onClick={() => filterByProblem(p)}
              style={{
                padding: '9px 16px',
                borderRadius: 24,
                border: `2px solid ${activeChip?.label === p.label ? '#c9a84c' : '#ede8df'}`,
                background: activeChip?.label === p.label ? '#fdf6e3' : '#fff',
                color: '#2c1f14',
                fontSize: 13,
                fontWeight: activeChip?.label === p.label ? 700 : 400,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'border-color 0.2s, background 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{p.emoji}</span> {p.label}
            </button>
          ))}
        </div>

        {/* Free-text input */}
        <form onSubmit={handleFreeText} style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#8a7060' }} />
            <input
              value={freeText}
              onChange={(e) => { setFreeText(e.target.value); setActiveChip(null); setResults(null); }}
              placeholder="Apni problem likhein Hindi ya English mein…"
              style={{
                width: '100%', padding: '11px 36px 11px 36px', borderRadius: 12,
                border: '1px solid #ede8df', background: '#fff', fontSize: 14, color: '#2c1f14',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
            {freeText && (
              <button type="button" onClick={() => { setFreeText(''); setResults(null); setAiReason(''); }} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={14} color="#8a7060" />
              </button>
            )}
          </div>
          <button
            type="submit"
            disabled={!freeText.trim() || aiLoading}
            style={{
              padding: '11px 18px', borderRadius: 12, border: 'none',
              background: freeText.trim() && !aiLoading ? '#c9a84c' : '#e0d8d0',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: freeText.trim() && !aiLoading ? 'pointer' : 'default',
              whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >
            {aiLoading ? '…' : 'Dhundho'}
          </button>
        </form>

        {/* Results */}
        {results !== null && (
          <div>
            {aiReason && (
              <p style={{ fontSize: 13, color: '#6b5544', background: '#fff', padding: '8px 14px', borderRadius: 10, marginBottom: 16, display: 'inline-block', border: '1px solid #ede8df' }}>
                💡 {aiReason}
              </p>
            )}
            {results.length === 0 ? (
              <p style={{ color: '#8a7060', fontSize: 14 }}>Koi product nahi mila. WhatsApp karein — hum personally help karenge!</p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {results.map((product) => {
                  const price = product.sale_price ?? product.price ?? 0;
                  const img = product.image_url || product.imageUrl || '';
                  const waMsg = buildWhatsAppLink(buildBuyNowMessage(product, { quantity: 1, productUrl: buildProductUrl(product.id) }));
                  return (
                    <div key={product.id} style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #ede8df', display: 'flex', flexDirection: 'column' }}>
                      <Link href={`/product/${product.id}`} style={{ display: 'block', aspectRatio: '4/3', background: '#f5f0e8', overflow: 'hidden' }}>
                        {img
                          ? <img src={img} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', background: '#f5f0e8' }} />
                        }
                      </Link>
                      <div style={{ padding: '12px 12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Link href={`/product/${product.id}`} style={{ textDecoration: 'none' }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#2c1f14', margin: 0, lineHeight: 1.3, WebkitLineClamp: 2, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{product.name}</p>
                        </Link>
                        <p style={{ fontSize: 15, fontWeight: 800, color: '#c9a84c', margin: 0 }}>{rupee(price)}</p>
                        <a href={waMsg} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#25D366', color: '#fff', padding: '8px', borderRadius: 10, fontSize: 12, fontWeight: 700, textDecoration: 'none', marginTop: 'auto' }}>
                          <MessageCircle size={13} /> Buy on WhatsApp
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
