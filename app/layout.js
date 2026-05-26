import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import BackToTop from '@/components/BackToTop';
import MobileStickyCTA from '@/components/MobileStickyCTA';
import PWAInstall from '@/components/PWAInstall';

// ✅ FIXED: Added default OG image so WhatsApp shows store image for all pages
export const metadata = {
  title: "SETHI PURSE | Punjab's Trusted Premium Luggage Destination",
  description:
    'Shop original branded bags, trolleys, school bags & more at SETHI PURSE, Jalandhar. American Tourister, Safari, Genie, Arctic Fox. Visit us today!',
  manifest: '/manifest.webmanifest',
  applicationName: 'SETHI PURSE',
  appleWebApp: { capable: true, title: 'SETHI PURSE', statusBarStyle: 'default' },
  openGraph: {
    title: "SETHI PURSE | Punjab's Trusted Premium Luggage Destination",
    description: 'Original branded bags, trolleys, school bags and handbags in Jalandhar.',
    url: 'https://sethi-purse.vercel.app',
    siteName: 'SETHI PURSE',
    type: 'website',
    images: [
      {
        url: 'https://sethi-purse.vercel.app/icons/icon-192.svg',
        width: 1200,
        height: 630,
        alt: 'SETHI PURSE Jalandhar',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SETHI PURSE',
    description: 'Premium luggage destination in Jalandhar.',
    images: ['https://sethi-purse.vercel.app/icons/icon-192.svg'],
  },
  icons: { icon: '/icons/icon-192.svg', apple: '/icons/icon-192.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#faf8f4] text-[#2c1f14] antialiased">
        {children}
        <PWAInstall />
        <WhatsAppFloat />
        <MobileStickyCTA />
        <BackToTop />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
