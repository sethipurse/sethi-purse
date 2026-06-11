'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, MessageCircle, Minus, Plus, Share2, ShoppingBag, Star, ZoomIn } from 'lucide-react';
import { toast } from 'sonner';
import ProductCard from '@/components/ProductCard';
import ReviewCard from '@/components/ReviewCard';
import { buildBuyNowMessage, buildProductUrl, buildWhatsAppLink, resolveImage } from '@/lib/constants';

function rupee(value) {
  return `Rs.${Number(value || 0).toLocaleString('en-IN')}`;
}

function getImages(product) {
  const gallery = product.gallery_images || product.gallery || product.images || [];
  const parsed = Array.isArray(gallery) ? gallery : String(gallery || '').split(',').map((v) => v.trim()).filter(Boolean);
  const all = [resolveImage(product), ...parsed].filter(Boolean);
  return [...new Set(all)]; // removes duplicate images
}

// ── Image Gallery ─────────────────────────────────────────────────────────────
function ImageGallery({ images, alt, onOpenFullscreen }) {
  const [current, setCurrent] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const touchStartTime = useRef(null); // FIX: track touch duration
  const autoRef = useRef(null);
  const hasMoved = useRef(false); // FIX: track if finger moved

  const startAuto = useCallback(() => {
    stopAuto();
    if (images.length <= 1) return;
    autoRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % images.length);
    }, 3000);
  }, [images.length]);

  const stopAuto = () => {
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null; }
  };

  useEffect(() => {
    startAuto();
    return stopAuto;
  }, [startAuto]);

  const goTo = (idx) => { setCurrent(idx); startAuto(); };
  const prev = () => goTo((current - 1 + images.length) % images.length);
  const next = () => goTo((current + 1) % images.length);

  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = Date.now();
    hasMoved.current = false;
    stopAuto();
  };

  const onTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
    const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
    if (dx > 8 || dy > 8) hasMoved.current = true; // FIX: mark as moved if finger moved
  };

  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    const dy = Math.abs(e.changedTouches[0].clientY - (touchStartY.current || 0));
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) { dx > 0 ? next() : prev(); }
    touchStartX.current = null;
    startAuto();
  };

  // FIX: only open fullscreen on intentional tap (not scroll, not swipe)
  const handleClick = () => {
    if (hasMoved.current) return; // was a swipe or scroll, not a tap
    const duration = Date.now() - (touchStartTime.current || 0);
    if (duration > 300) return; // was a long press, not a tap
    onOpenFullscreen(current);
  };

  return (
    <div className="space-y-3">
      <div
        className="relative aspect-[4/5] w-full overflow-hidden rounded bg-white shadow-sm ring-1 ring-[#ede8df]"
        style={{ cursor: 'zoom-in', backgroundColor: '#ffffff', isolation: 'isolate', position: 'relative', zIndex: 1 }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onClick={handleClick}
      >
        {!loaded && (
          <div className="absolute inset-0 z-[2] animate-pulse bg-[#f5f0e8]" />
        )}

        {images.map((img, idx) => (
          <div
            key={idx}
            className="absolute inset-0 bg-white transition-opacity duration-500"
            style={{ opacity: idx === current ? 1 : 0, zIndex: idx === current ? 20 : 0 }}
          >
            {img ? (
              <Image
                src={img}
                alt={alt}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                priority={idx === 0}
                className="object-cover"
                draggable={false}
                onLoad={() => { if (idx === 0) setLoaded(true); }}
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-[#f5f0e8]">
                <ShoppingBag className="h-24 w-24 text-[#c9a84c]" />
              </div>
            )}
          </div>
        ))}

        {images.length > 1 && (
          <>
            <button onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow hover:bg-white transition-colors">
              <ChevronLeft className="w-5 h-5 text-[#2c1f14]" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white/80 flex items-center justify-center shadow hover:bg-white transition-colors">
              <ChevronRight className="w-5 h-5 text-[#2c1f14]" />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 z-30 flex justify-center gap-1.5">
            {images.map((_, idx) => (
              <button key={idx} onClick={(e) => { e.stopPropagation(); goTo(idx); }}
                className="rounded-full transition-all duration-300"
                style={{ width: idx === current ? 20 : 8, height: 8, backgroundColor: idx === current ? '#c9a84c' : 'rgba(255,255,255,0.8)' }} />
            ))}
          </div>
        )}

        {images.length > 1 && (
          <div className="absolute top-3 left-3 z-30 rounded bg-black/50 px-2 py-0.5 text-xs text-white font-medium">
            {current + 1}/{images.length}
          </div>
        )}
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-[#6b5544] shadow">
          <ZoomIn className="h-3 w-3" /> Tap to zoom
        </div>
      </div>

      {images.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {images.map((img, idx) => (
            <button key={idx} type="button" onClick={() => goTo(idx)}
              className={`relative aspect-square overflow-hidden rounded bg-white ring-2 transition-all duration-200 ${current === idx ? 'ring-[#c9a84c] scale-105' : 'ring-[#ede8df] hover:ring-[#c9a84c]'}`}>
              {img && <Image src={img} alt="" fill sizes="10vw" className="object-cover" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Fullscreen Lightbox ───────────────────────────────────────────────────────
function Fullscreen({ images, startIndex, alt, onClose }) {
  const [current, setCurrent] = useState(startIndex || 0);

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', handler); document.body.style.overflow = ''; };
  }, [onClose]);

  const prev = () => setCurrent((c) => (c - 1 + images.length) % images.length);
  const next = () => setCurrent((c) => (c + 1) % images.length);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/40">
        ✕
      </button>
      <div className="relative w-full max-w-2xl mx-4 aspect-square" onClick={(e) => e.stopPropagation()}>
        {images[current] && (
          <Image src={images[current]} alt={alt} fill className="object-contain" sizes="100vw" />
        )}
      </div>
      {images.length > 1 && (
        <>
          <button onClick={prev} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/40">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={next} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/40">
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-1.5">
        {images.map((_, idx) => (
          <button key={idx} onClick={() => setCurrent(idx)}
            className="rounded-full transition-all duration-300"
            style={{ width: idx === current ? 20 : 8, height: 8, backgroundColor: idx === current ? '#c9a84c' : 'rgba(255,255,255,0.4)' }} />
        ))}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ProductDetailClient({ product, related = [], reviews = [] }) {
  const images = useMemo(() => getImages(product), [product]);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenStart, setFullscreenStart] = useState(0);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [added, setAdded] = useState(false);

  const salePrice = product.sale_price ?? product.salePrice ?? product.price ?? 0;
  const mrp = product.mrp ?? product.original_price ?? 0;
  const discount = product.discount_percent || (mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0);
  const category = product.category || product.category_id || 'Collection';
  const sizes = Array.isArray(product.sizes) ? product.sizes : ['Standard'];
  const colors = Array.isArray(product.colors) ? product.colors : ['Classic'];
  const outOfStock = product.stock === 0;

  const openFullscreen = (index = 0) => { setFullscreenStart(index); setFullscreenOpen(true); };

  const addToCart = () => {
    const saved = window.localStorage.getItem('sethi-cart');
    const cart = saved ? JSON.parse(saved) : [];
    const existingIndex = cart.findIndex((i) => i.id === product.id && (i.size || '') === selectedSize && (i.color || '') === selectedColor);
    let updatedCart;
    if (existingIndex >= 0) {
      updatedCart = cart.map((item, idx) => idx === existingIndex ? { ...item, qty: Math.max(1, Number(item.qty || 1)) + qty } : item);
      toast.success(`Quantity updated to ${Math.max(1, Number(cart[existingIndex].qty || 1)) + qty}`);
    } else {
      updatedCart = [...cart, { id: product.id, name: product.name, price: salePrice, qty, image: images[0] || '', size: selectedSize, color: selectedColor }];
      toast.success(`${product.name} added to cart!`);
    }
    window.localStorage.setItem('sethi-cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cart-updated'));
    setAdded(true);
    setQty(1);
    setTimeout(() => setAdded(false), 2000);
  };

  const productUrl = buildProductUrl(product.id);
  const buyNowMessage = buildBuyNowMessage(product, { quantity: qty, size: selectedSize, color: selectedColor, productUrl });

  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) { try { await navigator.share({ url }); } catch (e) {} return; }
    try { await navigator.clipboard.writeText(url); toast.success('Product link copied!'); }
    catch (e) { toast.error('Could not copy link'); }
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, backgroundColor: '#faf8f4' }}>
      <div className="space-y-14">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <ImageGallery images={images} alt={product.name} onOpenFullscreen={openFullscreen} />

          <div className="rounded bg-white p-6 shadow-sm ring-1 ring-[#ede8df] md:p-8">
            <Link href="/products" className="inline-flex items-center gap-2 text-base font-semibold text-[#8a7060] hover:text-[#c9a84c]">
              <ArrowLeft className="h-4 w-4" /> Back to products
            </Link>
            <div className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[#c9a84c]">{category}</div>
            <h1 className="mt-2 text-5xl font-bold leading-none text-[#2c1f14] md:text-6xl">{product.name}</h1>
            {product.brand && <p className="mt-3 text-xl text-[#6b5544]">by <span className="font-bold text-[#2c1f14]">{product.brand}</span></p>}
            <div className="mt-6 flex flex-wrap items-end gap-4">
              <span className="text-4xl font-bold text-[#2c1f14]">{rupee(salePrice)}</span>
              {mrp > salePrice && <span className="pb-1 text-xl text-[#8a7060] line-through">{rupee(mrp)}</span>}
            </div>
            {discount > 0 && (
              <span className="mt-2 inline-block rounded bg-[#c9a84c] px-3 py-1 text-sm font-bold text-white">{discount}% OFF</span>
            )}
            <p className="mt-6 text-xl leading-8 text-[#6b5544]">
              {product.description || 'Premium quality product from SETHI PURSE, Jalandhar. Message us for availability, latest images, and best store price.'}
            </p>

            <div className="mt-7 grid gap-5 border-y border-[#ede8df] py-6">
              <div>
                <div className="mb-3 text-lg font-bold text-[#2c1f14]">Size</div>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((size) => (
                    <button key={size} type="button" onClick={() => setSelectedSize(size)}
                      className={`rounded border px-4 py-2 text-base font-semibold transition ${selectedSize === size ? 'border-[#c9a84c] bg-[#c9a84c] text-white' : 'border-[#ede8df] text-[#6b5544] hover:border-[#c9a84c]'}`}>
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-3 text-lg font-bold text-[#2c1f14]">Color</div>
                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => (
                    <button key={color} type="button" onClick={() => setSelectedColor(color)}
                      className={`rounded border px-4 py-2 text-base font-semibold transition ${selectedColor === color ? 'border-[#c9a84c] bg-[#c9a84c] text-white' : 'border-[#ede8df] text-[#6b5544] hover:border-[#c9a84c]'}`}>
                      {color}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold">Quantity</span>
                <div className="flex h-11 items-center overflow-hidden rounded border border-[#ede8df]">
                  <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-11 w-11 items-center justify-center hover:bg-[#f5f0e8]"><Minus className="h-4 w-4" /></button>
                  <span className="w-12 text-center text-lg font-bold">{qty}</span>
                  <button type="button" onClick={() => setQty(qty + 1)} className="flex h-11 w-11 items-center justify-center hover:bg-[#f5f0e8]"><Plus className="h-4 w-4" /></button>
                </div>
              </div>
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={addToCart} disabled={outOfStock}
                className={`flex h-14 items-center justify-center gap-2 rounded text-xl font-bold transition-all duration-300 disabled:opacity-60 ${added ? 'bg-green-500 text-white scale-95' : 'bg-[#c9a84c] text-white hover:bg-[#a07a28]'}`}>
                {added ? <><Check className="h-5 w-5" /> Added!</> : <><ShoppingBag className="h-5 w-5" /> Add to Cart</>}
              </button>
              <a href={outOfStock ? undefined : buildWhatsAppLink(buyNowMessage)} target="_blank" rel="noopener noreferrer"
                aria-disabled={outOfStock} onClick={(e) => outOfStock && e.preventDefault()}
                className={`flex h-14 items-center justify-center gap-2 rounded border border-[#c9a84c] text-xl font-bold text-[#a07a28] transition hover:bg-[#f5f0e8] ${outOfStock ? 'pointer-events-none opacity-60' : ''}`}>
                <MessageCircle className="h-5 w-5" /> Buy Now
              </a>
            </div>
            <button type="button" onClick={onShare} className="mt-3 flex h-12 items-center gap-2 text-lg font-semibold text-[#6b5544] hover:text-[#c9a84c]">
              <Share2 className="h-4 w-4" /> Share product
            </button>
            <div className="mt-6 grid gap-2 text-lg text-[#6b5544]">
              {['Original branded collection', 'Store pickup and WhatsApp support', 'Best available SETHI PURSE pricing'].map((text) => (
                <div key={text} className="flex items-center gap-2"><Check className="h-5 w-5 text-[#c9a84c]" /> {text}</div>
              ))}
            </div>
          </div>
        </div>

        {reviews.length > 0 && (
          <section>
            <h2 className="flex items-center gap-2 text-4xl font-bold text-[#c9a84c]"><Star className="h-7 w-7 fill-[#c9a84c]" /> Reviews</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-3">{reviews.slice(0, 3).map((review) => <ReviewCard key={review.id} review={review} />)}</div>
          </section>
        )}

        {related.length > 0 && (
          <section>
            <h2 className="text-4xl font-bold text-[#c9a84c]">Related Products</h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{related.map((item) => <ProductCard key={item.id} product={item} />)}</div>
          </section>
        )}

        {fullscreenOpen && (
          <Fullscreen images={images} startIndex={fullscreenStart} alt={product.name} onClose={() => setFullscreenOpen(false)} />
        )}
      </div>
    </div>
  );
}
