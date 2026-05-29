import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

function SkeletonCard() {
  return <div className="h-[360px] animate-pulse rounded bg-white shadow-sm ring-1 ring-[#ede8df]" />;
}

export default function CategoryLoading() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#faf8f4] py-8 md:py-12">
        <div className="container-sethi">
          <div className="mb-8 space-y-3">
            <div className="h-4 w-28 animate-pulse rounded bg-[#e8d5a3]" />
            <div className="h-12 w-64 animate-pulse rounded bg-white ring-1 ring-[#ede8df] md:h-16" />
            <div className="h-5 w-full max-w-md animate-pulse rounded bg-white ring-1 ring-[#ede8df]" />
          </div>
          <div className="mb-8 flex gap-3 overflow-hidden">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="h-10 w-28 shrink-0 animate-pulse rounded-full bg-white ring-1 ring-[#ede8df]" />
            ))}
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonCard key={index} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
