'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { buildWhatsAppLink, resolveImage } from '@/lib/constants';

export default function ProductCard({ product }) {
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

  const waMsg = `Hi SETHI PURSE, I am interested in ${product.name} by ${product.brand} priced at Rs.${salePrice}. Product link: ${typeof window !== 'undefined' ? `${window.location.origin}/product/${product.id}` : `/product/${product.id}`}${img ? ` Image: ${img}` : ''}. Please confirm availability.`;

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
        <a
          href={outOfStock ? undefined : buildWhatsAppLink(waMsg)}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={outOfStock}
          onClick={(e) => outOfStock && e.preventDefault()}
          className={`btn-primary mt-4 w-full text-sm ${outOfStock ? 'pointer-events-none opacity-60' : ''}`}
        >
          {outOfStock ? 'Out of Stock' : 'Inquire on WhatsApp'}
        </a>
      </div>
    </div>
  );
}
