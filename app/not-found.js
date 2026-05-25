import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <span className="text-sethi-gold text-sm tracking-[0.3em] uppercase mb-3">404</span>
      <h1 className="font-serif text-4xl md:text-6xl mb-4">Page Not Found</h1>
      <p className="text-sethi-gray500 mb-8">The page you&apos;re looking for doesn&apos;t exist.</p>
      <Link href="/" className="btn-primary">Back to Home</Link>
    </div>
  );
}
