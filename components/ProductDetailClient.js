'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useMemo, useState, useRef, useCallback } from 'react';
import { ArrowLeft, Check, MessageCircle, Minus, Plus, Share2, ShoppingBag, Star, ZoomIn } from 'lucide-react';
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
  return [...new Set(all)]; // ✅ removes duplicate if main image already exists in gallery
}

function ZoomImage({ src, alt, onClickFullscreen }) {
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

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClickFullscreen}
      className="relative aspect-[4/5] w-full overflow-hidden rounded bg-white shadow-sm ring-1 ring-[#ede8df] cursor-zoom-in"
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          priority
          className="object-cover"
          style={
            zoom.active
              ? { transformOrigin: `${zoom.x}% ${zoom.y}%`, transform: 'scale(2)', transition: 'transform 0.1s ease' }
              : { transform: 'scale(1)', transition: 'transform 0.3s ease' }
          }
          draggable={false}
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-[#f5f0e8]">
          <ShoppingBag className="h-24 w-24 text-[#c9a84c]" />
        </div>
      )}
      {!zoom.active && (
        <span className="absolute bottom-4 left-4 flex items-center gap-1 rounded bg-white/95 px-3 py-1 text-sm font-bold text-[#6b5544] shadow pointer-events-none">
          <ZoomIn className="h-4 w-4" /> Hover to zoom · Tap for fullscreen
        </span>
      )}
    </div>
  );
}

function MobileFullscreen({ src, alt, onClose }) {
  const imgRef = useRef(null);
  const containerRef = useRef(null);

  const scaleRef = useRef(1);
  const lastScaleRef = useRef(1);
  const translateRef = useRef({ x: 0, y: 0 });
  const lastTranslateRef = useRef({ x: 0, y: 0 });
  const lastTapRef = useRef(0);
  const touchStartRef = useRef([]);

  const applyTransform = () => {
    if (!imgRef.current) return;
    imgRef.current.style.transform = `translate(${translateRef.current.x}px, ${translateRef.current.y}px) scale(${scaleRef.current})`;
  };

  const resetTransform = () => {
    scaleRef.current = 1;
    translateRef.current = { x: 0, y: 0 };
    applyTransform();
  };

  const onTouchStart = (e) => {
    touchStartRef.current = Array.from(e.touches);
    if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        if (scaleRef.current > 1) {
          resetTransform();
        } else {
          scaleRef.current = 2.5;
          translateRef.current = { x: 0, y: 0 };
          applyTransform();
        }
      }
      lastTapRef.current = now;
    }
    if (e.touches.length === 2) {
      lastScaleRef.current = scaleRef.current;
      lastTranslateRef.current = { ...translateRef.current };
    }
  };

  const onTouchMove = (e) => {
    e.preventDefault();
    if (e.touches.length === 2) {
      const startTouches = touchStartRef.current;
      if (startTouches.length < 2) return;
      const startDist = Math.hypot(
        startTouches[0].clientX - startTouches[1].clientX,
        startTouches[0].clientY - startTouches[1].clientY
      );
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const pinchScale = currentDist / startDist;
      scaleRef.current = Math.min(4, Math.max(1, lastScaleRef.current * pinchScale));
      applyTransform();
    } else if (e.touches.length === 1 && scaleRef.current > 1) {
      const startTouch = touchStartRef.current[0];
      if (!startTouch) return;
      const dx = e.touches[0].clientX - startTouch.clientX;
      const dy = e.touches[0].clientY - startTouch.clientY;
      translateRef.current = {
        x: lastTranslateRef.current.x + dx,
        y: lastTranslateRef.current.y + dy,
      };
      applyTransform();
    }
  };

  const onTouchEnd = () => {
    lastScaleRef.current = scaleRef.current;
    lastTranslateRef.current = { ...translateRef.current };
    touchStartRef.current = [];
    if (scaleRef.current < 1) resetTransform();
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black"
      style={{ touchAction: 'none' }}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/20 px-4 py-2 font-bold text-white backdrop-blur-sm"
      >
        ✕ Close
      </button>
      <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-white/70 pointer-events-none">
        Double tap to zoom · Pinch to zoom · Drag to pan
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className="max-h-screen max-w-full object-contain"
        style={{ transform: 'scale(1)', transformOrigin: 'center center', willChange: 'transform' }}
        draggable={false}
      />
    </div>
  );
}

export default function ProductDetailClient({ product, related = [], reviews = [] }) {
  const images = useMemo(() => getImages(product), [product]);
  const [activeImage, setActiveImage] = useState(images[0] || '');
  const [zoomOpen, setZoomOpen] = useState(false);
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

  const addToCart = () => {
    const saved = window.localStorage.getItem('sethi-cart');
    const cart = saved ? JSON.parse(saved) : [];

    // Check if same product+size+color already in cart
    const existingIndex = cart.findIndex(
      (i) => i.id === product.id && (i.size || '') === selectedSize && (i.color || '') === selectedColor
    );

    let updatedCart;
    if (existingIndex >= 0) {
      // ✅ Already in cart — just increase qty
      updatedCart = cart.map((item, idx) =>
        idx === existingIndex
          ? { ...item, qty: Math.max(1, Number(item.qty || 1)) + qty }
          : item
      );
      toast.success(`Quantity updated to ${Math.max(1, Number(cart[existingIndex].qty || 1)) + qty}`);
    } else {
      // ✅ New item — add to cart
      const item = {
        id: product.id,
        name: product.name,
        price: salePrice,
        qty,
        image: activeImage,
        size: selectedSize,
        color: selectedColor,
      };
      updatedCart = [...cart, item];
      toast.success(`${product.name} added to cart!`);
    }

    window.localStorage.setItem('sethi-cart', JSON.stringify(updatedCart));
    window.dispatchEvent(new Event('cart-updated'));
    setAdded(true);
    setQty(1); // ✅ Reset quantity back to 1
    setTimeout(() => setAdded(false), 2000);
  };

  const productUrl = buildProductUrl(product.id);
  const buyNowMessage = buildBuyNowMessage(product, { quantity: qty, size: selectedSize, color: selectedColor, productUrl });

  const onShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ url }); } catch (e) {}
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Product link copied — paste in WhatsApp to share');
    } catch (e) {
      toast.error('Could not copy link');
    }
  };

  return (
    <div className="space-y-14">
      <div className="grid gap-8 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="space-y-4">
          <div className="relative">
            {discount > 0 && (
              <span className="absolute right-4 top-4 z-10 rounded bg-[#c9a84c] px-3 py-1 text-sm font-bold text-white shadow">
                {discount}% OFF
              </span>
            )}
            <ZoomImage src={activeImage} alt={product.name} onClickFullscreen={() => setZoomOpen(true)} />
          </div>

          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {images.map((image) => (
                <button
                  key={image}
                  type="button"
                  onClick={() => setActiveImage(image)}
                  className={`aspect-square overflow-hidden rounded bg-white ring-2 transition-all duration-200 hover:ring-[#c9a84c] relative ${
                    activeImage === image ? 'ring-[#c9a84c] scale-105' : 'ring-[#ede8df]'
                  }`}
                >
                  <Image src={image} alt="" fill sizes="10vw" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded bg-white p-6 shadow-sm ring-1 ring-[#ede8df] md:p-8">
          <Link href="/products" className="inline-flex items-center gap-2 text-base font-semibold text-[#8a7060] hover:text-[#c9a84c]">
            <ArrowLeft className="h-4 w-4" /> Back to products
          </Link>
          <div className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[#c9a84c]">{category}</div>
          <h1 className="mt-2 text-5xl font-bold leading-none text-[#2c1f14] md:text-6xl">{product.name}</h1>
          {product.brand && (
            <p className="mt-3 text-xl text-[#6b5544]">by <span className="font-bold text-[#2c1f14]">{product.brand}</span></p>
          )}
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <span className="text-4xl font-bold text-[#2c1f14]">{rupee(salePrice)}</span>
            {mrp > salePrice && <span className="pb-1 text-xl text-[#8a7060] line-through">{rupee(mrp)}</span>}
          </div>
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
            <button
              type="button"
              onClick={addToCart}
              disabled={outOfStock}
              className={`flex h-14 items-center justify-center gap-2 rounded text-xl font-bold transition-all duration-300 disabled:opacity-60
                ${added ? 'bg-green-500 text-white scale-95' : 'bg-[#c9a84c] text-white hover:bg-[#a07a28]'}`}
            >
              {added ? <><Check className="h-5 w-5" /> Added!</> : <><ShoppingBag className="h-5 w-5" /> Add to Cart</>}
            </button>
            <a
              href={outOfStock ? undefined : buildWhatsAppLink(buyNowMessage)}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={outOfStock}
              onClick={(e) => outOfStock && e.preventDefault()}
              className={`flex h-14 items-center justify-center gap-2 rounded border border-[#c9a84c] text-xl font-bold text-[#a07a28] transition hover:bg-[#f5f0e8] ${outOfStock ? 'pointer-events-none opacity-60' : ''}`}
            >
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

      {zoomOpen && (
        <MobileFullscreen src={activeImage} alt={product.name} onClose={() => setZoomOpen(false)} />
      )}
    </div>
  );
}
