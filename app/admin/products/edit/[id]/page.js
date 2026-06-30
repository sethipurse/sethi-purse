'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AdminShell from '@/components/AdminShell';
import ProductForm from '@/components/ProductForm';
import { toast } from 'sonner';

export default function EditProductPage() {
  const params = useParams();
  const id = params?.id;
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/products/${encodeURIComponent(id)}`);
        if (res.status === 404) {
          if (!cancelled) { setNotFound(true); setLoading(false); }
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) { setProduct(data); setLoading(false); }
      } catch (err) {
        console.error('Load product failed:', err);
        if (!cancelled) {
          toast.error('Could not load product. Please try again.');
          setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  return (
    <AdminShell>
      <div className="max-w-4xl">
        <h2 className="font-serif text-xl font-medium mb-5">Edit product</h2>
        {loading ? (
          <div className="text-sethi-gray500">Loading...</div>
        ) : notFound ? (
          <div className="text-red-600">Product not found.</div>
        ) : (
          <ProductForm initial={product} productId={id} />
        )}
      </div>
    </AdminShell>
  );
}
