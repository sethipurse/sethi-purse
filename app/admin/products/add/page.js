'use client';
import AdminShell from '@/components/AdminShell';
import ProductForm from '@/components/ProductForm';

export default function AddProductPage() {
  return (
    <AdminShell>
      <div className="max-w-4xl">
        <h2 className="font-serif text-xl font-medium mb-5">Add new product</h2>
        <ProductForm />
      </div>
    </AdminShell>
  );
}
