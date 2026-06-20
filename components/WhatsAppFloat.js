'use client';
import { useEffect, useState, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { getWALinkForPath, buildWhatsAppLink } from '@/lib/constants';

// ─── Icons ───────────────────────────────────────────────────────────────────

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" style={{ width: 22, height: 22 }} aria-hidden="true">
      <path d="M19.11 17.39c-.27-.13-1.59-.78-1.83-.87-.25-.09-.43-.13-.61.14-.18.27-.7.87-.86 1.05-.16.18-.32.2-.59.07-.27-.13-1.13-.42-2.16-1.33-.8-.71-1.34-1.59-1.5-1.86-.16-.27-.02-.41.11-.55.11-.11.27-.29.4-.43.13-.14.18-.25.27-.41.09-.18.04-.34-.02-.47-.07-.13-.61-1.47-.84-2.01-.22-.53-.45-.46-.61-.47-.16-.01-.34-.01-.52-.01-.18 0-.47.07-.72.34-.25.27-.95.93-.95 2.27 0 1.34.97 2.63 1.11 2.81.14.18 1.92 2.93 4.65 4.11.65.28 1.16.45 1.55.58.65.21 1.24.18 1.71.11.52-.08 1.59-.65 1.82-1.27.22-.62.22-1.15.16-1.27-.07-.11-.25-.18-.52-.31zM16.03 5.33c-5.92 0-10.72 4.8-10.72 10.72 0 1.89.5 3.72 1.43 5.34l-1.52 5.53 5.66-1.49a10.7 10.7 0 0 0 5.15 1.31h.01c5.92 0 10.72-4.8 10.72-10.72S21.95 5.33 16.03 5.33z" />
    </svg>
  );
}

function BotIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      style={{ width: 20, height: 20 }} aria-hidden="true">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="7" r="3" />
      <path d="M12 10v1" />
      <circle cx="9" cy="16" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="16" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ width: 17, height: 17 }} aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function CloseIcon({ size = 18 }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      style={{ width: size, height: size }} aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ─── Quick questions ──────────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  '💼 Show luggage options',
  '👜 What handbags do you have?',
  '🎒 Backpacks available?',
  '💰 Price range?',
  '📍 Store location?',
  '🕐 Timings?',
];

// ─── AI Chat Panel ────────────────────────────────────────────────────────────
// Positioned relative to the SAME anchor as the FAB (bottom-right), fixed to viewport.

function AIChatPanel({ onClose }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Sat Sri Akal! 🙏 Welcome to **SETHI PURSE**!\n\nAsk me anything about our bags, luggage, prices, or store. I'm here to help!`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.products || data?.data || [];
        setProducts(list);
      })
      .catch(() => {});
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80);
  }, [messages]);

  async function sendMessage(text) {
    const userText = (text || input).trim();
    if (!userText || loading) return;
    const userMsg = { role: 'user', content: userText };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, products }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply || 'Sorry, please try again!' }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Network error. Please WhatsApp us directly!' }]);
    } finally {
      setLoading(false);
    }
  }

  function fmt(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
  }

  const waLink = buildWhatsAppLink('Hi SETHI PURSE! I was chatting with your AI assistant and want to know more.');

  return (
    <div className="wa-chat-panel" style={{
      position: 'fixed',
      left: 12,
      right: 12,
      maxWidth: 400,
      width: 'calc(100vw - 24px)',
      marginLeft: 'auto',
      zIndex: 99999,
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 8px 40px rgba(44,31,20,0.25)',
      display: 'flex',
      flexDirection: 'column',
      maxHeight: '72vh',
      backgroundColor: '#faf8f4',
      border: '1px solid rgba(201,168,76,0.3)',
    }}>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #2c1f14 0%, #3d2a1a 100%)',
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            backgroundColor: 'rgba(201,168,76,0.15)',
            border: '2px solid #c9a84c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#c9a84c',
          }}>
            <BotIcon />
          </div>
          <div>
            <div style={{ color: '#c9a84c', fontWeight: 700, fontSize: 14 }}>SETHI PURSE AI</div>
            <div style={{ color: 'rgba(201,168,76,0.6)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#4ade80', display: 'inline-block' }} />
              Online · Powered by Gemini
            </div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Close"
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fff' }}>
          <CloseIcon size={16} />
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 12px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '82%',
              padding: '9px 13px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              backgroundColor: msg.role === 'user' ? '#2c1f14' : '#fff',
              color: msg.role === 'user' ? '#c9a84c' : '#2c1f14',
              fontSize: 13.5,
              lineHeight: 1.55,
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              border: msg.role === 'user' ? 'none' : '1px solid rgba(201,168,76,0.2)',
              fontFamily: 'system-ui, sans-serif',
            }}
              dangerouslySetInnerHTML={{ __html: fmt(msg.content) }}
            />
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 14px', borderRadius: '16px 16px 16px 4px', backgroundColor: '#fff', border: '1px solid rgba(201,168,76,0.2)', display: 'flex', gap: 5, alignItems: 'center' }}>
              {[0, 1, 2].map((d) => (
                <span key={d} style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: '#c9a84c', display: 'inline-block', animation: `ai-dot 1.2s ease-in-out ${d * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div style={{ padding: '0 12px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {QUICK_QUESTIONS.map((q) => (
            <button key={q} onClick={() => sendMessage(q)} style={{
              fontSize: 11.5, padding: '5px 10px', borderRadius: 20,
              border: '1px solid rgba(201,168,76,0.4)', backgroundColor: '#fff',
              color: '#2c1f14', cursor: 'pointer', fontFamily: 'system-ui, sans-serif', whiteSpace: 'nowrap',
            }}>{q}</button>
          ))}
        </div>
      )}

      {/* WhatsApp strip */}
      <a href={waLink} target="_blank" rel="noopener noreferrer" style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        backgroundColor: '#25D366', color: '#fff', padding: '7px',
        fontSize: 12, fontWeight: 700, textDecoration: 'none',
        fontFamily: 'system-ui, sans-serif', flexShrink: 0,
      }}>
        <WhatsAppIcon />
        <span style={{ fontSize: 12 }}>Chat on WhatsApp · +91 7986161633</span>
      </a>

      {/* Input */}
      <div style={{
        padding: '9px 10px', borderTop: '1px solid rgba(201,168,76,0.2)',
        display: 'flex', gap: 8, alignItems: 'center',
        backgroundColor: '#fff', flexShrink: 0,
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
          placeholder="Ask about bags, prices…"
          disabled={loading}
          style={{
            flex: 1, border: '1px solid rgba(201,168,76,0.3)', borderRadius: 24,
            padding: '8px 13px', fontSize: 13.5, fontFamily: 'system-ui, sans-serif',
            color: '#2c1f14', backgroundColor: '#faf8f4', outline: 'none',
          }}
        />
        <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
          style={{
            width: 38, height: 38, borderRadius: '50%',
            backgroundColor: input.trim() && !loading ? '#2c1f14' : '#e0d8d0',
            color: input.trim() && !loading ? '#c9a84c' : '#999',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: input.trim() && !loading ? 'pointer' : 'default', flexShrink: 0, transition: 'background 0.2s',
          }}
          aria-label="Send">
          <SendIcon />
        </button>
      </div>

      <style>{`
        @keyframes ai-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ─── Main Float Component ─────────────────────────────────────────────────────
// FIX: position: fixed, anchored bottom-right of the VIEWPORT, never absolute,
// never tied to window.scrollY. No scroll listener for positioning at all.
// On mobile, sits ABOVE MobileStickyCTA (which is ~64px tall) by using bottom: 76px.
// On desktop (md+), sits at bottom: 20px since there is no sticky bar.

export default function WhatsAppFloat() {
  const pathname = usePathname() || '';
  const [menuOpen, setMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (pathname.startsWith('/admin')) return null;

  const waLink = getWALinkForPath(pathname);

  // FAB bottom offset: 76px on mobile (clears MobileStickyCTA's ~64px bar + gap),
  // 20px on desktop (md+) where there's no sticky bar.
  const fabBottomMobile = 76;
  const fabBottomDesktop = 20;

  return (
    <>
      {/* AI Chat panel — sits above the FAB, same right-side anchor */}
      {chatOpen && <AIChatPanel onClose={() => setChatOpen(false)} />}

      {/* Popup menu — appears directly above the main button, anchored bottom-right */}
      {menuOpen && (
        <div
          className="wa-float-menu"
          style={{
            position: 'fixed',
            right: 16,
            zIndex: 99992,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-end',
            gap: 10,
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}
        >
          {/* Ask AI option */}
          <button
            onClick={() => { setChatOpen(true); setMenuOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent', flexDirection: 'row-reverse',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              backgroundColor: '#2c1f14', color: '#c9a84c',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(44,31,20,0.35)',
            }}>
              <BotIcon />
            </div>
            <span style={{
              backgroundColor: '#2c1f14', color: '#c9a84c',
              fontWeight: 700, fontSize: 13, padding: '6px 14px',
              borderRadius: 20, whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(44,31,20,0.25)',
              letterSpacing: '0.02em',
            }}>
              🤖 Ask AI
            </span>
          </button>

          {/* WhatsApp option */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              textDecoration: 'none', WebkitTapHighlightColor: 'transparent',
              flexDirection: 'row-reverse',
            }}
          >
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              backgroundColor: '#25D366', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(37,211,102,0.45)',
            }}>
              <WhatsAppIcon />
            </div>
            <span style={{
              backgroundColor: '#25D366', color: '#fff',
              fontWeight: 700, fontSize: 13, padding: '6px 14px',
              borderRadius: 20, whiteSpace: 'nowrap',
              boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
              letterSpacing: '0.02em',
            }}>
              💬 Get Best Price
            </span>
          </a>
        </div>
      )}

      {/* Main floating button — TRUE fixed, bottom-right, never scroll-tied */}
      <button
        onClick={() => setMenuOpen((o) => !o)}
        aria-label="Contact us"
        className="wa-float-fab"
        style={{
          position: 'fixed',
          right: 16,
          zIndex: 99991,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexDirection: 'row-reverse',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation',
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'scale(1)' : 'scale(0.8)',
          transition: 'opacity 0.25s ease, transform 0.25s ease',
        }}
      >
        {/* Pulse ring */}
        <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
          {!menuOpen && (
            <span style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              backgroundColor: '#25D366', opacity: 0.35,
              animation: 'wa-pulse 2s ease-out infinite',
            }} />
          )}
          <span style={{
            position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 52, height: 52, borderRadius: '50%',
            backgroundColor: menuOpen ? '#2c1f14' : '#25D366',
            boxShadow: menuOpen
              ? '0 4px 16px rgba(44,31,20,0.4)'
              : '0 4px 16px rgba(37,211,102,0.5)',
            transition: 'background 0.2s',
            color: menuOpen ? '#c9a84c' : '#fff',
          }}>
            {menuOpen ? <CloseIcon size={20} /> : <WhatsAppIcon />}
          </span>
        </div>

        {/* Label */}
        {!menuOpen && (
          <span style={{
            backgroundColor: '#25D366', color: '#fff',
            fontWeight: 700, fontSize: 13, padding: '6px 14px',
            borderRadius: 20, whiteSpace: 'nowrap',
            boxShadow: '0 4px 16px rgba(37,211,102,0.4)',
            letterSpacing: '0.02em',
          }}>
            💬 Get Best Price
          </span>
        )}
      </button>

      <style>{`
        @keyframes wa-pulse {
          0%   { transform: scale(1);   opacity: 0.35; }
          70%  { transform: scale(1.7); opacity: 0; }
          100% { transform: scale(1.7); opacity: 0; }
        }

        /* Mobile: clear the MobileStickyCTA bar (~64px tall) with a visible gap */
        .wa-float-fab,
        .wa-float-menu {
          bottom: 92px;
        }
        .wa-float-menu {
          bottom: 154px; /* 92px FAB offset + 52px FAB height + 10px gap */
        }
        .wa-chat-panel {
          bottom: 154px; /* same as menu — sits directly above the FAB */
        }

        /* Desktop: no sticky bar exists, sit lower */
        @media (min-width: 768px) {
          .wa-float-fab {
            bottom: 20px;
          }
          .wa-float-menu {
            bottom: 84px; /* 20px FAB offset + 52px FAB height + 12px gap */
          }
          .wa-chat-panel {
            bottom: 84px; /* same as menu on desktop */
          }
        }
      `}</style>
    </>
  );
}
