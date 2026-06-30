'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { MessageCircle, ShoppingBag, Check, Flame, Clock, Eye, MapPin, TrendingUp, AlertCircle } from 'lucide-react';
import { buildBuyNowMessage, buildProductUrl, buildWhatsAppLink, resolveImage } from '@/lib/constants';

function useScarcity(product) {
  const [viewers, setViewers] = useState(null);
  const [displayStock, setDisplayStock] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  useEffect(() => {
    const mode = product.scarcity_mode || 'off';
    if (mode === 'off') return;

    // Viewing count
    const min = product.viewing_min ?? 3;
    const max = product.viewing_max ?? 12;
    setViewers(Math.floor(Math.random() * (max - min + 1)) + min);

    // Display stock with decay
    if (product.display_stock != null) {
      const decay = product.stock_decay_speed || 0;
      const decayed = Math.max(1, product.display_stock - Math.floor(Math.random() * decay));
      setDisplayStock(decayed);
    }

    // Price lock timer
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
      const interval = setInterval(tick, 1000);
      return () => clearInterval(interval);
    }
  }, [product]);

  return { viewers, displayStock, timeLeft };
}

export default function ProductCard({ product, onAddToCart }) {
  const [imgErr, setImgErr] = useState(false);
  const [added, setAdded] = useState(false);
  const { viewers, displayStock, timeLeft } = useScarcity(product);

  const salePrice = product.sale_price ?? product.salePrice ?? product.price ?? 0;
  const mrp = product.mrp ?? product.original_price ?? 0;
  const imageUrl = product.image_url ?? product.imageUrl;
  const imageType = product.image_type ?? product.imageType;
  const normalizedProduct = { ...product, salePrice, imageUrl, imageType };
  const discount = product.discount_percent || (mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0);
  const save = mrp - salePrice;
  const outOfStock = product.stock === 0;
  const lowStock = typeof product.stock === 'number' && product.stock > 0 && product.stock <= 5;
  const img = resolveImage(normalizedProduct);
  const productUrl = buildProductUrl(product.id);
  const buyNowMessage = buildBuyNowMessage(product, { quantity: 1, productUrl });
  const scarcityMode = product.scarcity_mode || 'off';
  const isScarcityOn = scarcityMode !== 'off';

  const handleAddToCart = () => {
    if (outOfStock || !onAddToCart) return;
    onAddToCart(product);
    window.dispatchEvent(new Event('cart-updated'));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className={`card-sethi overflow-hidden group flex flex-col ${outOfStock ? 'opacity-70' : ''}`}>
      <Link href={`/product/${product.id}`} className="block relative bg-[#f5f0e8] aspect-[4/5] overflow-hidden">
        {discount > 0 && <span className="badge-discount">{discount}% OFF</span>}
        {outOfStock && <span className="badge-out">Out of Stock</span>}

        {img && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            onError={() => setImgErr(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#f5f0e8]">
            <ShoppingBag className="w-16 h-16 text-sethi-gold" />
          </div>
        )}
      </Link>

      <div className="p-4 md:p-5 flex flex-col flex-1">
        <span className="badge-cat">{product.category || product.category_id}</span>
        <Link href={`/product/${product.id}`} className="mt-1.5 block hover:text-sethi-gold transition-colors">
          <h3 className="font-serif text-lg md:text-xl font-semibold leading-snug line-clamp-2">{product.name}</h3>
        </Link>
        <p className="text-sm text-sethi-gray500 mt-0.5">{product.brand}</p>

        <div className="mt-3 flex items-end gap-3">
          {mrp > salePrice && (
            <span className="text-sm text-sethi-gray500 line-through">Rs.{mrp.toLocaleString('en-IN')}</span>
          )}
          <span className="text-lg md:text-xl font-bold text-sethi-black">Rs.{salePrice.toLocaleString('en-IN')}</span>
        </div>
        {save > 0 && (
          <div className="mt-2">
            <span className="badge-save">Save Rs.{save.toLocaleString('en-IN')}</span>
          </div>
        )}

        {/* Confidence badge — only shown once thresholds are crossed */}
        {(product.purchase_count > 5 || product.view_count > 20) && (
          <div className="mt-2 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-[#c9a84c]" />
            <span className="text-xs font-semibold text-[#6b5544]">
              {product.purchase_count > 5
                ? `${product.purchase_count}+ buyers chose this`
                : `${product.view_count}+ people viewed this`}
            </span>
          </div>
        )}

        {/* Scarcity signals */}
        {isScarcityOn && !outOfStock && (
          <div className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex flex-col gap-2">
            {product.scarcity_label && (
              <div className="flex items-center gap-2 text-xs font-bold text-red-700">
                <TrendingUp className="w-3 h-3" /> {product.scarcity_label}
              </div>
            )}
            {displayStock != null && (
              <div className="flex items-center gap-2 text-xs font-semibold text-red-600">
                <AlertCircle className="w-3 h-3" /> Only {displayStock} left in stock!
              </div>
            )}
            {viewers != null && (
              <div className="flex items-center gap-2 text-xs text-[#8a7060]">
                <Eye className="w-3 h-3" /> {viewers} people viewing this
              </div>
            )}
            {product.local_scarcity && (
              <div className="flex items-center gap-2 text-xs text-[#8a7060]">
                <MapPin className="w-3 h-3" /> Popular in your area
              </div>
            )}
            {timeLeft && (
              <div className="flex items-center gap-2 text-xs font-semibold text-orange-600">
                <Clock className="w-3 h-3" /> Price locked: {timeLeft}
              </div>
            )}
          </div>
        )}

        <div className={`mt-4 grid gap-2 ${onAddToCart ? 'sm:grid-cols-2' : ''}`}>
          {onAddToCart && (
            <button
              type="button"
              disabled={outOfStock}
              onClick={handleAddToCart}
              className={`min-h-[46px] w-full !px-3 !py-2 text-sm font-semibold rounded-sm border transition-all duration-300 flex items-center justify-center gap-2 disabled:pointer-events-none disabled:opacity-60
                ${added
                  ? 'bg-green-500 border-green-500 text-white scale-95'
                  : 'bg-transparent border-sethi-gold text-sethi-gold hover:bg-sethi-gold hover:text-sethi-black'
                }`}
            >
              {added
                ? <><Check className="h-4 w-4" /> Added!</>
                : <><ShoppingBag className="h-4 w-4" /> Add to Cart</>
              }
            </button>
          )}
          <a
            href={outOfStock ? undefined : buildWhatsAppLink(buyNowMessage)}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={outOfStock}
            onClick={(e) => outOfStock && e.preventDefault()}
            className={`btn-primary min-h-[46px] w-full !px-3 !py-2 text-sm ${outOfStock ? 'pointer-events-none opacity-60' : ''}`}
          >
            {outOfStock ? 'Out of Stock' : <><MessageCircle className="h-4 w-4" /> Buy Now</>}
          </a>
        </div>
      </div>
    </div>
  );
}
