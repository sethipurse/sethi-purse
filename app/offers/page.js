import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import OfferCard from '@/components/OfferCard';
import SectionHeading from '@/components/SectionHeading';
import { getOffers } from '@/lib/data';

// ✅ FIXED: Added OG image so WhatsApp shows store image when sharing offers
export const metadata = {
  title: 'Special Offers | SETHI PURSE',
  description: 'Explore trolley bags, school bags, handbags, backpacks, wallets and more at SETHI PURSE Jalandhar.',
  openGraph: {
    title: 'Special Offers | SETHI PURSE Jalandhar',
    description: 'Limited-time deals on premium bags, luggage and accessories. Shop now at SETHI PURSE Jalandhar.',
    url: 'https://sethi-purse.vercel.app/offers',
    siteName: 'SETHI PURSE',
    type: 'website',
    images: [
      {
        url: 'https://sethi-purse.vercel.app/icons/icon-192.svg',
        width: 1200,
        height: 630,
        alt: 'SETHI PURSE Special Offers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Special Offers | SETHI PURSE',
    description: 'Limited-time deals on premium bags and luggage.',
    images: ['https://sethi-purse.vercel.app/icons/icon-192.svg'],
  },
};

export default async function OffersPage() {
  const offers = await getOffers();
  return (
    <>
      <Navbar />
      <main className="section-pad">
        <div className="container-sethi">
          <SectionHeading title="Special Offers" subtitle="Limited-time deals you don't want to miss." />
          {offers.length === 0 ? (
            <p className="text-center text-sethi-gray500 py-12">No active offers at the moment.</p>
          ) : (
            <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {offers.map((o) => <OfferCard key={o.id} offer={o} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
