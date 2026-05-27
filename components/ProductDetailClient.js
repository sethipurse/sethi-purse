'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowLeft, Check, MessageCircle, Minus, Plus, Share2, ShoppingBag, Star } from 'lucide-react';
import { toast } from 'sonner';
import ProductCard from '@/components/ProductCard';
import ReviewCard from '@/components/ReviewCard';
import { buildWhatsAppLink, resolveImage } from '@/lib/constants';

function rupee(value) {
  return `Rs.${Number(value || 0).toLocaleString('en-IN')}`;
}

function getImages(product) {
  const gallery = product.gallery_images || product.gallery || product.images || [];
  const parsed = Array.isArray(gallery) ? gallery : String(gallery || '').split(',').map((v) => v.trim()).filter(Boolean);
  return [resolveImage(product), ...parsed].filter(Boolean);
}

export default function ProductDetailClient({ product, related = [], reviews = [] }) {
  const images = useMemo(() => getImages(product), [product]);
  const [activeImage, setActiveImage] = useState(images[0] || '');
  const [zoomOpen, setZoomOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const salePrice = product.sale_price ?? product.salePrice ?? product.price ?? 0;
  const mrp = product.mrp ?? product.original_price ?? 0;
  const discount = product.discount_percent || (mrp > salePrice ? Math.round(((mrp - salePrice) / mrp) * 100) : 0);
  const category = product.category || product.category_id || 'Collection';
  const sizes = Array.isArray(product.sizes) ? product.sizes : ['Standard'];
  const colors = Array.isArray(product.colors) ? product.colors : ['Classic'];
  const outOfStock = product.stock === 0;

  const addToCart = () => {
    const item = { id: product.id, name: product.name, price: salePrice, qty, image: activeImage, size: selectedSize, color: selectedColor };
    const saved = window.localStorage.getItem('sethi-cart');
    const cart = saved ? JSON.parse(saved) : [];
    window.localStorage.setItem('sethi-cart', JSON.stringify([...cart, item]));
    toast.success('Added to cart');
  };

  const productUrl = typeof window !== 'undefined' ? window.location.href : '';
  const waMsg = `Hi SETHI PURSE, I am interested in ${product.name}${product.brand ? ` by ${product.brand}` : ''} priced at ${rupee(salePrice)}. Quantity: ${qty}. ${selectedSize ? `Size: ${selectedSize}. ` : ''}${selectedColor ? `Color: ${selectedColor}. ` : ''}Product link: ${productUrl}${activeImage ? ` Image: ${activeImage}` : ''}`;

  // ✅ FIXED: Share URL only — no title/text
  // When navigator.share sends title+text+url together, WhatsApp treats it as a message
  // and does NOT generate a link preview.
  // Sharing URL alone forces WhatsApp to fetch the page and show the OG image preview.
  const onShare = async () => {
    const url = window.location.href;

    if (navigator.share) {
      try {
        // ✅ Share URL only — this is what makes WhatsApp show the image preview
        await navigator.share({ url });
      } catch (e) {
        // User dismissed — do nothing
      }
      return;
    }

    // Fallback for desktop: copy URL to clipboard
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
          <button type="button" onClick={() => setZoomOpen(true)} className="relative aspect-[4/5] w-full overflow-hidden rounded bg-white text-left shadow-sm ring-1 ring-[#ede8df]">
            {discount > 0 && <span className="absolute right-4 top-4 z-10 rounded bg-[#c9a84c] px-3 py-1 text-sm font-bold text-white">{discount}% OFF</span>}
            {activeImage ? <img src={activeImage} alt={product.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center bg-[#f5f0e8]"><ShoppingBag className="h-24 w-24 text-[#c9a84c]" /></div>}
            <span className="absolute bottom-4 left-4 rounded bg-white/95 px-3 py-1 text-sm font-bold text-[#6b5544] shadow">Tap to zoom</span>
          </button>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-3">
              {images.map((image) => (
                <button key={image} type="button" onClick={() => setActiveImage(image)} className={`aspect-square overflow-hidden rounded bg-white ring-2 ${activeImage === image ? 'ring-[#c9a84c]' : 'ring-[#ede8df]'}`}>
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded bg-white p-6 shadow-sm ring-1 ring-[#ede8df] md:p-8">
          <Link href="/products" className="inline-flex items-center gap-2 text-base font-semibold text-[#8a7060] hover:text-[#c9a84c]"><ArrowLeft className="h-4 w-4" /> Back to products</Link>
          <div className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[#c9a84c]">{category}</div>
          <h1 className="mt-2 text-5xl font-bold leading-none text-[#2c1f14] md:text-6xl">{product.name}</h1>
          {product.brand && <p className="mt-3 text-xl text-[#6b5544]">by <span className="font-bold text-[#2c1f14]">{product.brand}</span></p>}
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <span className="text-4xl font-bold text-[#2c1f14]">{rupee(salePrice)}</span>
            {mrp > salePrice && <span className="pb-1 text-xl text-[#8a7060] line-through">{rupee(mrp)}</span>}
          </div>
          <p className="mt-6 text-xl leading-8 text-[#6b5544]">{product.description || 'Premium quality product from SETHI PURSE, Jalandhar. Message us for availability, latest images, and best store price.'}</p>

          <div className="mt-7 grid gap-5 border-y border-[#ede8df] py-6">
            <div>
              <div className="mb-3 text-lg font-bold text-[#2c1f14]">Size</div>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button key={size} type="button" onClick={() => setSelectedSize(size)} className={`rounded border px-4 py-2 text-base font-semibold ${selectedSize === size ? 'border-[#c9a84c] bg-[#c9a84c] text-white' : 'border-[#ede8df] text-[#6b5544]'}`}>{size}</button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-3 text-lg font-bold text-[#2c1f14]">Color</div>
              <div className="flex flex-wrap gap-2">
                {colors.map((color) => (
                  <button key={color} type="button" onClick={() => setSelectedColor(color)} className={`rounded border px-4 py-2 text-base font-semibold ${selectedColor === color ? 'border-[#c9a84c] bg-[#c9a84c] text-white' : 'border-[#ede8df] text-[#6b5544]'}`}>{color}</button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-bold">Quantity</span>
              <div className="flex h-11 items-center overflow-hidden rounded border border-[#ede8df]">
                <button type="button" onClick={() => setQty(Math.max(1, qty - 1))} className="flex h-11 w-11 items-center justify-center"><Minus className="h-4 w-4" /></button>
                <span className="w-12 text-center text-lg font-bold">{qty}</span>
                <button type="button" onClick={() => setQty(qty + 1)} className="flex h-11 w-11 items-center justify-center"><Plus className="h-4 w-4" /></button>
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <button type="button" onClick={addToCart} disabled={outOfStock} className="flex h-14 items-center justify-center gap-2 rounded bg-[#c9a84c] text-xl font-bold text-white transition hover:bg-[#a07a28] disabled:opacity-60"><ShoppingBag className="h-5 w-5" /> Add to Cart</button>
            <a href={buildWhatsAppLink(waMsg)} target="_blank" rel="noopener noreferrer" className="flex h-14 items-center justify-center gap-2 rounded border border-[#c9a84c] text-xl font-bold text-[#a07a28] transition hover:bg-[#f5f0e8]"><MessageCircle className="h-5 w-5" /> WhatsApp</a>
          </div>
          <button type="button" onClick={onShare} className="mt-3 flex h-12 items-center gap-2 text-lg font-semibold text-[#6b5544] hover:text-[#c9a84c]"><Share2 className="h-4 w-4" /> Share product</button>

          <div className="mt-6 grid gap-2 text-lg text-[#6b5544]">
            {['Original branded collection', 'Store pickup and WhatsApp support', 'Best available SETHI PURSE pricing'].map((text) => <div key={text} className="flex items-center gap-2"><Check className="h-5 w-5 text-[#c9a84c]" /> {text}</div>)}
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
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 p-4" onClick={() => setZoomOpen(false)}>
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 font-bold text-[#2c1f14]">Close</button>
          {activeImage && <img src={activeImage} alt={product.name} className="max-h-[90vh] max-w-[95vw] rounded object-contain shadow-2xl" />}
        </div>
      )}
    </div>
  );
}
