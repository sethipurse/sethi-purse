'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Clock, Eye, Flame, MapPin, MessageCircle, Minus, Plus, Share2, ShoppingBag, Star, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import ProductCard from '@/components/ProductCard';
import ReviewCard from '@/components/ReviewCard';
import { buildBuyNowMessage, buildProductUrl, buildWhatsAppLink, resolveImage } from '@/lib/constants';

function rupee(value) {
  return `Rs.${Number(value || 0).toLocaleString('en-IN')}`;
}

function normalizeColors(product) {
  const raw = product?.colors;
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (typeof raw[0] === 'object' && raw[0] !== null) {
    return raw.map((c) => ({
      name: c.name || '',
      images: Array.isArray(c.images) ? c.images : [],
      inStock: c.inStock !== false,
    }));
  }
  return raw.map((name) => ({ name: String(name), images: [], inStock: true }));
}

function getDefaultImages(product) {
  const gallery = product.gallery_images || product.gallery || product.images || [];
  const parsed = Array.isArray(gallery) ? gallery : String(gallery || '').split(',').map((v) => v.trim()).filter(Boolean);
  const all = [resolveImage(product), ...parsed].filter(Boolean);
  return [...new Set(all)];
}

function useScarcity(product) {
  const [viewers, setViewers] = useState(null);
  const [displayStock, setDisplayStock] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const mode = product.scarcity_mode || 'off';
    if (mode === 'off') return;

    const min = product.viewing_min ?? 3;
    const max = product.viewing_max ?? 12;
    setViewers(Math.floor(Math.random() * (max - min + 1)) + min);

    // Simulate viewers fluctuating every 20-40s
    const interval = setInterval(() => {
      const delta = Math.random() > 0.5 ? 1 : -1;
      setViewers((v) => Math.max(min, Math.min(max + 3, (v || min) + delta)));
    }, (20 + Math.random() * 20) * 1000);

    if (product.display_stock != null) {
      const decay = product.stock_decay_speed || 0;
      const decayed = Math.max(1, product.display_stock - Math.floor(Math.random() * decay));
      setDisplayStock(decayed);
    }

    if (product.price_lock_hours > 0) {
      const key = `price_lock_${product.id}`;
      let expiry = localStorage.getItem(key);
      if (!expiry) {
        expiry = Date.now() + product.price_lock_hours * 60 * 60 * 1000;
        localStorage.setItem(key, expiry);
      }
      const tick = () => {
        const remaining = parseInt(expiry) - Date.now();
        if (remaining <= 0) { setTimeLeft(null); return; }
        const h = Math.floor(remaining / 3600000);
        const m = Math.floor((remaining % 3600000) / 60000);
        const s = Math.floor((remaining % 60000) / 1000);
        setTimeLeft(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
      };
      tick();
      const timerInterval = setInterval(tick, 1000);
      return () => { clearInterval(interval); clearInterval(timerInterval); };
    }

    return () => clearInterval(interval);
  }, [product]);

  return { viewers, displayStock, timeLeft };
}

function ZoomImage({ src, alt }) {
  const containerRef = useRef(null);
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });

  const handleMouseMove = useCallback((e) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoom({ active: true, x, y });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setZoom({ active: false, x: 50, y: 50 });
  }, []);

  if (!src) return (
    <div className="flex aspect-[4/5] w-full items-center justify-center rounded bg-[#f5f0e8]">
      <ShoppingBag className="h-24 w-24 text-[#c9a84c]" />
    </div>
  );

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative aspect-[4/5] w-full rounded bg-white shadow-sm ring-1 ring-[#ede8df]"
      style={{ cursor: 'zoom-in', overflow: 'hidden', isolation: 'isolate' }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(max-width: 1024px) 100vw, 50vw"
        priority
        className="object-cover"
        style={{
          transformOrigin: `${zoom.x}% ${zoom.y}%`,
          transform: zoom.active ? 'scale(2.2)' : 'scale(1)',
          transition: zoom.active ? 'transform 0.08s linear' : 'transform 0.3s ease',
          willChange: 'transform',
        }}
        draggable={false}
      />
    </div>
  );
}

function FullscreenViewer({ src, alt, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw', height: '100vh', zIndex: 999999,
        backgroundColor: 'rgba(0,0,0,0.95)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        margin: 0, padding: 0,
      }}
    >
      <button
        onTouchEnd={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }}
        style={{
          position: 'absolute', top: 20, right: 20, zIndex: 1000000,
          width: 52, height: 52, borderRadius: '50%', backgroundColor: '#c9a84c',
          border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
          justifyContent: 'center', fontSize: 22, color: '#fff', fontWeight: 'bold',
          WebkitTapHighlightColor: 'transparent',
        }}
      >✕</button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()}
        style={{ display: 'block', maxWidth: '95vw', maxHeight: '90vh', width: 'auto', height: 'auto', objectFit: 'contain' }} />
      <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 12 }}>Tap outside or ✕ to close</p>
    </div>
  );
}

function ImageGallery({ images, alt }) {
  const [current, setCurrent] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [preloadedSrc, setPreloadedSrc] = useState(null);
  const touchStartRef = useRef(null);
  const autoSlideRef = useRef(null);

  useEffect(() => { setIsMobile('ontouchstart' in window || navigator.maxTouchPoints > 0); }, []);
  useEffect(() => { setCurrent(0); }, [images]);

  useEffect(() => {
    if (images.length <= 1) return;
    autoSlideRef.current = setInterval(() => { setCurrent((c) => (c + 1) % images.length); }, 3000);
    return () => clearInterval(autoSlideRef.current);
  }, [images.length, images]);

  const goTo = (index) => {
    clearInterval(autoSlideRef.current);
    setCurrent(index);
    if (images.length > 1) {
      autoSlideRef.current = setInterval(() => { setCurrent((c) => (c + 1) % images.length); }, 3000);
    }
  };

  const prev = () => goTo((current - 1 + images.length) % images.length);
  const next = () => goTo((current + 1) % images.length);

  const openFullscreen = (src) => {
    const preloader = new window.Image();
    const open = () => { setPreloadedSrc(src); setMobileOpen(true); };
    preloader.onload = open; preloader.onerror = open; preloader.src = src;
  };

  const handleTouchStart = (e) => { touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e) => {
    if (!touchStartRef.current) return;
    const dx = Math.abs(e.changedTouches[0].clientX - touchStartRef.current.x);
    const dy = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.y);
    touchStartRef.current = null;
    if (dx < 10 && dy < 10) openFullscreen(images[current]);
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div
          onTouchStart={isMobile ? handleTouchStart : undefined}
          onTouchEnd={isMobile ? handleTouchEnd : undefined}
          onClick={!isMobile ? () => openFullscreen(images[current]) : undefined}
          style={{ cursor: 'zoom-in' }}
        >
          <ZoomImage src={images[current] || ''} alt={alt} />
        </div>
        {!isMobile && (
          <span className="absolute bottom-3 left-3 rounded bg-black/50 px-2 py-1 text-xs text-white pointer-events-none">
            🔍 Hover to zoom · Click for fullscreen
          </span>
        )}
        {isMobile && (
          <span className="absolute bottom-3 left-3 rounded bg-black/50 px-2 py-1 text-xs text-white pointer-events-none">
            👆 Tap for full image
          </span>
        )}
        {images.length > 1 && (
          <span className="absolute top-3 right-3 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white pointer-events-none font-semibold">
            {current + 1} / {images.length}
          </span>
        )}
        {images.length > 1 && (
          <>
            <button onTouchEnd={(e) => { e.stopPropagation(); prev(); }} onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow">
              <ChevronLeft className="w-5 h-5 text-[#2c1f14]" />
            </button>
            <button onTouchEnd={(e) => { e.stopPropagation(); next(); }} onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 flex items-center justify-center shadow">
              <ChevronRight className="w-5 h-5 text-[#2c1f14]" />
            </button>
          </>
        )}
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
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 pt-1">
          {images.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${i === current ? 'w-5 bg-[#c9a84c]' : 'w-2 bg-[#ddd0be]'}`}
              aria-label={`Image ${i + 1}`} />
          ))}
        </div>
      )}
      {mobileOpen && preloadedSrc && (
        <FullscreenViewer src={preloadedSrc} alt={alt} onClose={() => { setMobileOpen(false); setPreloadedSrc(null); }} />
      )}
    </div>
  );
}

export default function ProductDetailClient({ product, related = [], reviews = [] }) {
  const colorVariants = useMemo(() => normalizeColors(product), [product]);
  const defaultImages = useMemo(() => getDefaultImages(product), [product]);
  const { viewers, displayStock, timeLeft } = useScarcity(product);

  useEffect(() => {
    if (!product?.id) return;
    fetch(`/api/products/${product.id}/view`, { method: 'POST' }).catch(() => {});
  }, [product?.id]);

  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState(() => {
    const firstInStock = colorVariants.find((c) => c.inStock);
    return firstInStock ? firstInStock.name : '';
  });
  const [added, setAdded] = useState(false);

  const images = useMemo(() => {
    if (selectedColor) {
      const match = colorVariants.find((c) => c.name === selectedColor);
      if (match && match.images.length > 0) return match.images;
    }
    return defaultImages;
  }, [selectedColor, colorVariants, defaultImages]);

  const salePrice = product.sale_price ?? product.salePrice ?? product.price ?? 0;
  const mrp = product.mrp ?? product.original_price ?? 0;
  const discount = product.discount_percent || (mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0);
  const category = product.category || product.category_id || 'Collection';
  const sizes = Array.isArray(product.sizes) ? product.sizes : ['Standard'];
  const scarcityMode = product.scarcity_mode || 'off';
  const isScarcityOn = scarcityMode !== 'off';

  const outOfStock = colorVariants.length > 0
    ? colorVariants.every((c) => !c.inStock)
    : product.stock === 0;

  const selectedColorData = colorVariants.find((c) => c.name === selectedColor);
  const colorOutOfStock = selectedColorData ? !selectedColorData.inStock : false;
  const noInStockColorSelected = colorVariants.length > 0 && !selectedColor;
  const cannotPurchase = outOfStock || colorOutOfStock || noInStockColorSelected;

  const addToCart = () => {
    if (cannotPurchase) return;
    const saved = window.localStorage.getItem('sethi-cart');
    let cart = [];
    try { if (saved) cart = JSON.parse(saved); } catch {}
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
    <div style={{ backgroundColor: '#faf8f4' }}>
      <div className="space-y-14">
        <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="flex flex-col gap-4">
            <ImageGallery images={images} alt={product.name} />
            {product.demo_video_url && (
              <div className="overflow-hidden rounded-lg bg-black shadow-sm ring-1 ring-[#ede8df]">
                <p className="px-3 py-1.5 text-xs font-semibold text-white/70 bg-[#2c1f14]">▶ Product Demo</p>
                <video
                  src={product.demo_video_url}
                  autoPlay muted loop playsInline
                  style={{ width: '100%', maxHeight: 280, objectFit: 'contain', display: 'block', background: '#000' }}
                />
              </div>
            )}
          </div>

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

            {/* Scarcity signals block */}
            {isScarcityOn && !outOfStock && (
              <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 flex flex-col gap-2">
                {product.scarcity_label && (
                  <div className="flex items-center gap-2 text-sm font-bold text-red-700">
                    <TrendingUp className="w-4 h-4" /> {product.scarcity_label}
                  </div>
                )}
                {displayStock != null && (
                  <div className="flex items-center gap-2 text-sm font-semibold text-red-600">
                    <AlertCircle className="w-4 h-4" /> Only {displayStock} left in stock — order soon!
                  </div>
                )}
                {viewers != null && (
                  <div className="flex items-center gap-2 text-sm text-[#6b5544]">
                    <Eye className="w-4 h-4" /> {viewers} people are viewing this right now
                  </div>
                )}
                {product.local_scarcity && (
                  <div className="flex items-center gap-2 text-sm text-[#6b5544]">
                    <MapPin className="w-4 h-4" /> High demand in your area
                  </div>
                )}
                {timeLeft && (
                  <div className="flex items-center gap-2 text-sm font-bold text-orange-600">
                    <Clock className="w-4 h-4" /> Price locked for: {timeLeft}
                  </div>
                )}
              </div>
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

              {colorVariants.length > 0 && (
                <div>
                  <div className="mb-3 text-lg font-bold text-[#2c1f14]">
                    Color{selectedColor ? <span className="text-[#8a7060] font-normal text-base">: {selectedColor}</span> : ''}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colorVariants.map((color) => {
                      const isSelected = selectedColor === color.name;
                      const isOut = !color.inStock;
                      return (
                        <button key={color.name} type="button" disabled={isOut}
                          onClick={() => !isOut && setSelectedColor(color.name)}
                          className={`relative rounded border px-4 py-2 text-base font-semibold transition ${
                            isOut
                              ? 'border-[#ede8df] bg-[#f5f0e8] text-[#b3a89a] cursor-not-allowed line-through opacity-60 pointer-events-none'
                              : isSelected
                                ? 'border-[#c9a84c] bg-[#c9a84c] text-white'
                                : 'border-[#ede8df] text-[#6b5544] hover:border-[#c9a84c]'
                          }`}>
                          {color.name}
                          {isOut && <span className="ml-1.5 text-[10px] font-bold not-italic no-underline align-middle text-red-500">(Out of Stock)</span>}
                        </button>
                      );
                    })}
                  </div>
                  {colorOutOfStock && <p className="mt-2 text-sm text-red-600 font-semibold">This color is currently out of stock. Message us on WhatsApp to know when it&apos;s restocked.</p>}
                  {outOfStock && colorVariants.length > 0 && <p className="mt-2 text-sm text-red-600 font-semibold">All colors are currently out of stock. Message us on WhatsApp to know when they&apos;re restocked.</p>}
                </div>
              )}

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
              <button type="button" onClick={addToCart} disabled={cannotPurchase}
                className={`flex h-14 items-center justify-center gap-2 rounded text-xl font-bold transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed ${added ? 'bg-green-500 text-white scale-95' : 'bg-[#c9a84c] text-white hover:bg-[#a07a28]'}`}>
                {added ? <><Check className="h-5 w-5" /> Added!</> : <><ShoppingBag className="h-5 w-5" /> {cannotPurchase && !added ? 'Out of Stock' : 'Add to Cart'}</>}
              </button>
              <a href={cannotPurchase ? undefined : buildWhatsAppLink(buyNowMessage)} target="_blank" rel="noopener noreferrer"
                aria-disabled={cannotPurchase} onClick={(e) => cannotPurchase && e.preventDefault()}
                className={`flex h-14 items-center justify-center gap-2 rounded border border-[#c9a84c] text-xl font-bold text-[#a07a28] transition hover:bg-[#f5f0e8] ${cannotPurchase ? 'pointer-events-none opacity-60' : ''}`}>
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
      </div>
    </div>
  );
}
