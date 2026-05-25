'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminShell from '@/components/AdminShell';
import { toast } from 'sonner';
import { Trash2, Edit, Plus, Search } from 'lucide-react';
import { resolveImage } from '@/lib/constants';

export default function AdminProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [sort, setSort] = useState('newest');
  const [confirm, setConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
      ]);
      if (!pRes.ok) throw new Error(`Products HTTP ${pRes.status}`);
      if (!cRes.ok) throw new Error(`Categories HTTP ${cRes.status}`);
      const [p, c] = await Promise.all([pRes.json(), cRes.json()]);
      setProducts(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(c) ? c : []);
    } catch (err) {
      console.error('Load products failed:', err);
      toast.error('Could not load products. Please refresh.');
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let list = [...products];
    if (cat !== 'All') list = list.filter((p) => p.category === cat);
    if (q.trim()) {
      const t = q.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(t) || (p.brand || '').toLowerCase().includes(t));
    }
    switch (sort) {
      case 'oldest': list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); break;
      case 'price_asc': list.sort((a, b) => (a.salePrice ?? a.sale_price ?? a.price ?? 0) - (b.salePrice ?? b.sale_price ?? b.price ?? 0)); break;
      case 'price_desc': list.sort((a, b) => (b.salePrice ?? b.sale_price ?? b.price ?? 0) - (a.salePrice ?? a.sale_price ?? a.price ?? 0)); break;
      default: list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return list;
  }, [products, q, cat, sort]);

  const doDelete = async (id) => {
    if (!id) { toast.error('Invalid product'); setConfirm(null); return; }
    try {
      const res = await fetch(`/api/products/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || `Failed to delete (status ${res.status})`);
        return;
      }
      toast.success('Product deleted');
      setConfirm(null);
      load();
    } catch (err) {
      console.error('Delete product failed:', err);
      toast.error('Network error while deleting. Please try again.');
      setConfirm(null);
    }
  };

  return (
    <AdminShell>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="font-serif text-2xl">All Products ({products.length})</h2>
        <Link href="/admin/products/add" className="btn-primary"><Plus className="w-4 h-4" /> Add New Product</Link>
      </div>

      <div className="bg-white border border-sethi-gray200 rounded-sm p-4 mb-5 grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sethi-gray500" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or brand..." className="input-sethi !pl-10" />
        </div>
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="input-sethi">
          <option>All</option>
          {categories.map((c) => <option key={c.id}>{c.name}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input-sethi">
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      <div className="bg-white border border-sethi-gray200 rounded-sm overflow-hidden">
        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-sethi-gray100 text-left text-xs uppercase tracking-wider text-sethi-gray500">
              <tr>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Sale Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="text-center p-8 text-sethi-gray500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan="7" className="text-center p-8 text-sethi-gray500">No products found.</td></tr>
              ) : filtered.map((p) => (
                <tr key={p.id} className="border-t border-sethi-gray200 hover:bg-sethi-gray100/50">
                  <td className="px-4 py-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={resolveImage(p)} alt="" className="w-12 h-12 object-cover rounded-sm bg-sethi-gray100" />
                  </td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-sethi-gray500">{p.brand}</td>
                  <td className="px-4 py-3">{p.category}</td>
                  <td className="px-4 py-3 font-semibold">Rs.{p.salePrice ?? p.sale_price ?? p.price}</td>
                  <td className="px-4 py-3">{p.stock === null || p.stock === undefined ? '∞' : p.stock}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Link href={`/admin/products/edit/${p.id}`} className="inline-flex items-center gap-1 border border-sethi-gold text-sethi-gold px-3 py-1 rounded-sm hover:bg-sethi-gold hover:text-sethi-black transition-colors">
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </Link>
                      <button onClick={() => setConfirm(p)} className="inline-flex items-center gap-1 border border-red-500 text-red-600 px-3 py-1 rounded-sm hover:bg-red-500 hover:text-white transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-sethi-gray200">
          {loading ? (
            <div className="p-6 text-sethi-gray500 text-center">Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sethi-gray500 text-center">No products found.</div>
          ) : filtered.map((p) => (
            <div key={p.id} className="p-4 flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={resolveImage(p)} alt="" className="w-16 h-16 object-cover rounded-sm bg-sethi-gray100" />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{p.name}</div>
                <div className="text-xs text-sethi-gray500">{p.brand} • {p.category}</div>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  <span className="font-semibold">Rs.{p.salePrice ?? p.sale_price ?? p.price}</span>
                  <span className="text-sethi-gray500">Stock: {p.stock ?? '∞'}</span>
                </div>
                <div className="flex gap-2 mt-2">
                  <Link href={`/admin/products/edit/${p.id}`} className="text-sm text-sethi-gold underline">Edit</Link>
                  <button onClick={() => setConfirm(p)} className="text-sm text-red-600 underline">Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-sm p-6 max-w-md w-full">
            <h3 className="font-serif text-xl mb-2">Delete product?</h3>
            <p className="text-sethi-gray500 text-sm mb-5">Are you sure you want to delete “{confirm.name}”? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirm(null)} className="btn-ghost">Cancel</button>
              <button onClick={() => doDelete(confirm.id)} className="inline-flex items-center gap-2 min-h-[48px] px-6 bg-red-600 text-white font-semibold rounded-sm hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
