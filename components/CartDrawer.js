'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Minus, MessageCircle, Plus, ShoppingBag, X } from 'lucide-react';
import Portal from '@/components/Portal';
import { buildCartOrderMessage, buildWhatsAppLink, cartTotal, rupee } from '@/lib/constants';

function readCart() {
  try {
    const saved = window.localStorage.getItem('sethi-cart');
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCart(next) {
  window.localStorage.setItem('sethi-cart', JSON.stringify(next));
  window.dispatchEvent(new Event('cart-updated'));
}

export default function CartDrawer() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    setCart(readCart());
    const onOpen = () => { setCart(readCart()); setOpen(true); };
    const onExternalUpdate = () => setCart(readCart());
    window.addEventListener('open-cart', onOpen);
    window.addEventListener('cart-updated', onExternalUpdate);
    window.addEventListener('storage', onExternalUpdate);
    return () => {
      window.removeEventListener('open-cart', onOpen);
      window.removeEventListener('cart-updated', onExternalUpdate);
      window.removeEventListener('storage', onExternalUpdate);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const updateQty = (idx, delta) => {
    const next = cart.map((item, i) =>
      i === idx ? { ...item, qty: Math.max(1, Number(item.qty || 1) + delta) } : item
    );
    setCart(next);
    writeCart(next);
  };

  const removeItem = (idx) => {
    const next = cart.filter((_, i) => i !== idx);
    setCart(next);
    writeCart(next);
  };

  const clearCart = () => {
    setCart([]);
    window.localStorage.removeItem('sethi-cart');
    window.dispatchEvent(new Event('cart-updated'));
  };

  const itemCount = cart.reduce((s, i) => s + Math.max(1, Number(i.qty || 1)), 0);

  return (
    <Portal>
      <div
        aria-hidden={!open}
        className={`fixed inset-0 z-[100000] bg-[#2c1f14]/50 transition-opacity duration-300 ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setOpen(false)}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        aria-hidden={!open}
        className={`fixed z-[100001] flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-out
          inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl
          sm:inset-y-0 sm:left-auto sm:right-0 sm:top-0 sm:bottom-auto sm:h-full sm:max-h-full sm:w-full sm:max-w-[400px] sm:rounded-none
          ${open ? 'translate-y-0 sm:translate-x-0' : 'translate-y-full sm:translate-y-0 sm:translate-x-full'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ede8df] bg-[#2c1f14] px-5 py-4">
          <div className="flex items-center gap-2 text-xl font-bold text-white">
            <ShoppingBag className="h-5 w-5 text-[#c9a84c]" /> Cart ({itemCount})
          </div>
          <button type="button" onClick={() => setOpen(false)} aria-label="Close cart"
            className="flex h-10 w-10 items-center justify-center text-white hover:text-[#c9a84c]">
            <X className="h-6 w-6" />
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-[#8a7060]">
            <ShoppingBag className="h-16 w-16 opacity-20" />
            <p className="text-xl font-bold text-[#2c1f14]">Your cart is empty</p>
            <p className="text-center text-sm">Browse our products and add items to your cart!</p>
            <Link href="/products" onClick={() => setOpen(false)}
              className="mt-2 rounded bg-[#c9a84c] px-6 py-2.5 text-sm font-bold text-[#2c1f14] hover:bg-[#a07a28]">
              Browse Products
            </Link>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-[#ede8df] overflow-y-auto">
              {cart.map((item, idx) => {
                const qty = Math.max(1, Number(item.qty || 1));
                const buyMsg = `Hi SETHI PURSE, I want to buy: ${item.name} (Qty: ${qty}, ${rupee(item.price)} each). Please confirm availability.`;
                return (
                  <div key={idx} className="flex gap-3 px-4 py-4">
                    {item.image
                      ? <img src={item.image} alt={item.name} className="h-16 w-16 shrink-0 rounded-sm bg-[#f5f0e8] object-cover" />
                      : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm bg-[#f5f0e8]"><ShoppingBag className="h-6 w-6 text-[#c9a84c]" /></div>}
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-semibold leading-snug text-[#2c1f14]">{item.name}</div>
                      {(item.size || item.color) && (
                        <div className="mt-0.5 text-xs text-[#8a7060]">{[item.size, item.color].filter(Boolean).join(' · ')}</div>
                      )}
                      <div className="mt-0.5 text-sm font-bold text-[#c9a84c]">{rupee(item.price)}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex h-8 w-fit items-center overflow-hidden rounded border border-[#ede8df]">
                          <button type="button" onClick={() => updateQty(idx, -1)} aria-label="Decrease quantity"
                            className="flex h-8 w-8 items-center justify-center hover:bg-[#f5f0e8]"><Minus className="h-3.5 w-3.5" /></button>
                          <span className="w-8 text-center text-sm font-bold">{qty}</span>
                          <button type="button" onClick={() => updateQty(idx, 1)} aria-label="Increase quantity"
                            className="flex h-8 w-8 items-center justify-center hover:bg-[#f5f0e8]"><Plus className="h-3.5 w-3.5" /></button>
                        </div>
                        <a href={buildWhatsAppLink(buyMsg)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded bg-[#25D366] px-2.5 py-1.5 text-xs font-bold text-white hover:bg-[#1ebe5c]">
                          <MessageCircle className="h-3.5 w-3.5" /> Buy Now
                        </a>
                      </div>
                    </div>
                    <button type="button" onClick={() => removeItem(idx)} aria-label="Remove item"
                      className="mt-1 shrink-0 self-start p-1 text-[#8a7060] hover:text-red-500">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <div className="space-y-3 border-t-2 border-[#ede8df] bg-[#faf8f4] px-5 py-4">
              <div className="flex justify-between text-lg font-bold text-[#2c1f14]">
                <span>Total ({itemCount} item{itemCount > 1 ? 's' : ''})</span>
                <span className="text-[#c9a84c]">{rupee(cartTotal(cart))}</span>
              </div>
              <a href={buildWhatsAppLink(buildCartOrderMessage(cart))} target="_blank" rel="noopener noreferrer"
                className="flex w-full items-center justify-center gap-2 rounded bg-[#25D366] py-3.5 text-base font-bold text-white transition-transform hover:bg-[#1ebe5c] active:scale-95">
                <MessageCircle className="h-5 w-5" /> Order on WhatsApp
              </a>
              <button type="button" onClick={clearCart} className="w-full py-1 text-sm text-[#8a7060] hover:text-red-500">
                Clear cart
              </button>
            </div>
          </>
        )}
      </aside>
    </Portal>
  );
}
