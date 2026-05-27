import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import BackToTop from '@/components/BackToTop';
import MobileStickyCTA from '@/components/MobileStickyCTA';
import PWAInstall from '@/components/PWAInstall';

const OG_IMAGE =
  'https://bbdatviaaiqpfvwumkkd.supabase.co/storage/v1/object/public/products/og-default.jpg';

export const metadata = {
  metadataBase: new URL('https://sethi-purse.vercel.app'),
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
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'SETHI PURSE Jalandhar' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SETHI PURSE',
    description: 'Premium luggage destination in Jalandhar.',
    images: [OG_IMAGE],
  },
  icons: { icon: '/icons/icon-192.svg', apple: '/icons/icon-192.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Hard-coded fallback — guarantees og:image always appears in HTML */}
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta name="twitter:image" content={OG_IMAGE} />
      </head>
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
