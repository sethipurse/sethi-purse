// Server component — fetches slider data at build/request time, no client delay
import { supabase } from '@/lib/storage';
import HomePageClient from '@/components/HomePageClient';

export const revalidate = 60; // re-fetch every 60s (ISR)

async function getSlides() {
  try {
    const { data, error } = await supabase
      .from('slider_images')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) return [];
    return (data || []).filter((s) => s.is_active !== false);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const slides = await getSlides();
  return <HomePageClient initialSlides={slides} />;
}
