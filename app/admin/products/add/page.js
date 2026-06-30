'use client';
import AdminShell from '@/components/AdminShell';
import ProductForm from '@/components/ProductForm';

export default function AddProductPage() {
  return (
    <AdminShell>
      <div className="max-w-4xl">
        <h2 className="font-serif text-2xl mb-5">Add New Product</h2>
        <ProductForm />
      </div>
    </AdminShell>
  );
}
