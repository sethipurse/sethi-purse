import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import BackToTop from '@/components/BackToTop';
import MobileStickyCTA from '@/components/MobileStickyCTA';
import PWAInstall from '@/components/PWAInstall';
import { getActiveTheme } from '@/lib/data';

const OG_IMAGE =
  'https://bbdatviaaiqpfvwumkkd.supabase.co/storage/v1/object/public/products/og-default.jpg';
const GA_ID = 'G-Z3JBN45975';

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

export default async function RootLayout({ children }) {
  const theme = await getActiveTheme();

  return (
    <html lang="en" data-theme={theme}>
      <head>
        {/* FIX: removed user-scalable=no and maximum-scale=1 — these block scroll events on Android */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:type" content="image/jpeg" />
        <meta name="twitter:image" content={OG_IMAGE} />
        {/* Google Fonts — all theme fonts loaded upfront so switching is instant */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Syne:wght@400;600;700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&display=swap"
          rel="stylesheet"
        />
        {/* Google Analytics */}
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </head>
      <body className="antialiased">
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
