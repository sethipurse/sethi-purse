import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ReviewCard from '@/components/ReviewCard';
import SectionHeading from '@/components/SectionHeading';
import { BUSINESS } from '@/lib/constants';
import { getReviews } from '@/lib/data';
import { ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'Customer Reviews | SETHI PURSE',
  description: "See what our customers say about SETHI PURSE — Punjab's most trusted luggage destination.",
};

export default async function ReviewsPage() {
  const reviews = await getReviews();
  return (
    <>
      <Navbar />
      <main className="section-pad pb-32 md:pb-20">
        <div className="container-sethi">
          <SectionHeading title="Customer Stories" subtitle="Real experiences from our valued customers" />
          <div className="text-center mb-10">
            <a href={BUSINESS.reviews} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sethi-gold hover:underline font-medium">
              <ExternalLink className="w-4 h-4" /> Read our Google Reviews
            </a>
          </div>
          {reviews.length === 0 ? (
            <p className="text-center text-sethi-gray500 py-12">No reviews yet.</p>
          ) : (
            <div className="grid gap-6 md:gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
