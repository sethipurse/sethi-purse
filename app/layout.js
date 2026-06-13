import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import BackToTop from '@/components/BackToTop';
import MobileStickyCTA from '@/components/MobileStickyCTA';
import PWAInstall from '@/components/PWAInstall';

const OG_IMAGE =
  'https://bbdatviaaiqpfvwumkkd.supabase.co/storage/v1/object/public/products/og-default.jpg';
const GA_ID = 'G-Z3JBN45975';

export const metadata = {
  metadataBase: new URL('https://sethi-purse.vercel.app'),
  title: "SETHI PURSE | Best Luggage & Bags Shop in Jalandhar, Punjab",
  description:
    'Buy original branded bags, trolley bags, school bags, handbags & wallets at best prices in Jalandhar. American Tourister, Safari, Genie, Arctic Fox. Visit SETHI PURSE — Punjab\'s most trusted luggage store near Mai Hiran Gate.',
  keywords: [
    'luggage shop Jalandhar',
    'bags shop Jalandhar',
    'trolley bags Jalandhar',
    'American Tourister Jalandhar',
    'Safari bags Jalandhar',
    'school bags Jalandhar',
    'handbags Jalandhar',
    'luggage store Punjab',
    'branded bags Jalandhar',
    'cheap luggage Jalandhar',
    'Sethi Purse',
    'bags near Mai Hiran Gate',
    'travel bags Jalandhar',
    'laptop bag Jalandhar',
    'wallet shop Jalandhar',
  ],
  manifest: '/manifest.webmanifest',
  applicationName: 'SETHI PURSE',
  appleWebApp: { capable: true, title: 'SETHI PURSE', statusBarStyle: 'default' },
  openGraph: {
    title: "SETHI PURSE | Best Luggage & Bags Shop in Jalandhar",
    description: 'Original branded bags, trolleys, school bags and handbags at best prices in Jalandhar, Punjab. American Tourister, Safari, Genie, Arctic Fox.',
    url: 'https://sethi-purse.vercel.app',
    siteName: 'SETHI PURSE',
    type: 'website',
    locale: 'en_IN',
    images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: 'SETHI PURSE — Best Luggage Shop in Jalandhar' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SETHI PURSE — Jalandhar\'s Best Luggage Shop',
    description: 'Original branded bags at best prices. Visit us near Mai Hiran Gate, Jalandhar.',
    images: [OG_IMAGE],
  },
  icons: { icon: '/icons/icon-192.svg', apple: '/icons/icon-192.svg' },
  alternates: {
    canonical: 'https://sethi-purse.vercel.app',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* ✅ Disable pinch-to-zoom on mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />

        {/* ✅ Local business structured data for Google */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Store",
              "name": "SETHI PURSE",
              "description": "Punjab's most trusted luggage and bags store in Jalandhar",
              "url": "https://sethi-purse.vercel.app",
              "telephone": "+917986161633",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "Inside Mai Hiran Gate, Near Books Market",
                "addressLocality": "Jalandhar",
                "addressRegion": "Punjab",
                "postalCode": "144001",
                "addressCountry": "IN"
              },
              "geo": {
                "@type": "GeoCoordinates",
                "latitude": "31.3260",
                "longitude": "75.5762"
              },
              "openingHours": "Mo-Su 10:00-20:00",
              "priceRange": "₹₹",
              "image": OG_IMAGE,
              "sameAs": [
                "https://www.instagram.com/sethipurse",
                "https://www.facebook.com/sethipurse",
                "https://www.youtube.com/@sethipurse"
              ]
            })
          }}
        />

        {/* Hard-coded OG fallback */}
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta name="twitter:image" content={OG_IMAGE} />

        {/* Google Analytics */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', { page_path: window.location.pathname });
            `,
          }}
        />
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
