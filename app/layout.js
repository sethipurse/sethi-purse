import './globals.css';
import { Toaster } from '@/components/ui/sonner';
import WhatsAppFloat from '@/components/WhatsAppFloat';
import BackToTop from '@/components/BackToTop';
import MobileStickyCTA from '@/components/MobileStickyCTA';
import PWAInstall from '@/components/PWAInstall';
import DecideForMeTeaser from '@/components/DecideForMeTeaser';

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

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* FIX: removed user-scalable=no and maximum-scale=1 — these block scroll events on Android */}
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
              gtag('config', '${GA_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </head>
      <body className="bg-[#faf8f4] text-[#2c1f14] antialiased">
        {/* Aurora blobs — Design 4 warm light background effect */}
        <div aria-hidden="true" style={{position:'fixed',inset:0,zIndex:0,pointerEvents:'none',overflow:'hidden'}}>
          <div style={{position:'absolute',width:500,height:500,borderRadius:'50%',filter:'blur(70px)',background:'rgba(201,168,76,0.16)',top:-100,right:-80,animation:'aurora-float 14s ease-in-out infinite'}} />
          <div style={{position:'absolute',width:400,height:400,borderRadius:'50%',filter:'blur(70px)',background:'rgba(201,100,60,0.1)',bottom:-60,left:-60,animation:'aurora-float 18s ease-in-out infinite reverse'}} />
          <div style={{position:'absolute',width:350,height:350,borderRadius:'50%',filter:'blur(70px)',background:'rgba(140,100,200,0.08)',top:'40%',left:'30%',animation:'aurora-float 12s ease-in-out infinite 3s'}} />
        </div>
        <div style={{position:'relative',zIndex:1}}>{children}</div>
        <PWAInstall />
        <WhatsAppFloat />
        <MobileStickyCTA />
        <BackToTop />
        <DecideForMeTeaser />
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
