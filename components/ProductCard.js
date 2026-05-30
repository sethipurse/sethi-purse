'use client';
import Link from 'next/link';
import { useState } from 'react';
import { MessageCircle, ShoppingBag } from 'lucide-react';
import { buildBuyNowMessage, buildProductUrl, buildWhatsAppLink, resolveImage } from '@/lib/constants';

export default function ProductCard({ product, onAddToCart }) {
  const [imgErr, setImgErr] = useState(false);
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

  return (
    <div className={`card-sethi overflow-hidden group flex flex-col ${outOfStock ? 'opacity-70' : ''}`}>
      <Link href={`/product/${product.id}`} className="block relative bg-[#f5f0e8] aspect-[4/5] overflow-hidden">
        {discount > 0 && <span className="badge-discount">{discount}% OFF</span>}
        {outOfStock && <span className="badge-out">Out of Stock</span>}
        {!outOfStock && lowStock && <span className="badge-stock-low">Only {product.stock} left!</span>}
        {img && !imgErr ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.name}
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
        <div className={`mt-4 grid gap-2 ${onAddToCart ? 'sm:grid-cols-2' : ''}`}>
          {onAddToCart && (
            <button
              type="button"
              disabled={outOfStock}
              onClick={() => onAddToCart(product)}
              className="btn-secondary min-h-[46px] w-full !px-3 !py-2 text-sm disabled:pointer-events-none disabled:opacity-60"
            >
              <ShoppingBag className="h-4 w-4" /> Add to Cart
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
