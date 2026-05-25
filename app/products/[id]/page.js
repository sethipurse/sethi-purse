import { redirect } from 'next/navigation';

export default function LegacyProductPage({ params }) {
  redirect(`/product/${params.id}`);
}
