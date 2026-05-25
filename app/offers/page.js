import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import OfferCard from '@/components/OfferCard';
import SectionHeading from '@/components/SectionHeading';
import { getOffers } from '@/lib/data';

export const metadata = {
  title: 'Special Offers | SETHI PURSE',
  description: 'Explore trolley bags, school bags, handbags, backpacks, wallets and more at SETHI PURSE Jalandhar.',
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
