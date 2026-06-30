import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import InquiryForm from '@/components/InquiryForm';
import SectionHeading from '@/components/SectionHeading';
import { MapPin, Phone, Clock, MessageCircle, ExternalLink, Star } from 'lucide-react';
import { BUSINESS, WHATSAPP_URL } from '@/lib/constants';

export const metadata = {
  title: 'Visit Our Store | SETHI PURSE',
  description: 'Find SETHI PURSE at Mai Hiran Gate, Jalandhar. Open 10AM\u20138PM daily. Call or WhatsApp +91 7986161633.',
};

export default function ContactPage() {
  return (
    <>
      <Navbar />

      {/* SECTION 1 — Hero (small) */}
      <section className="bg-sethi-black text-white">
        <div className="container-sethi py-16 md:py-24 text-center">
          <span className="text-sethi-gold text-xs tracking-[0.3em] uppercase">Get in Touch</span>
          <h1 className="heading-hero mt-3 text-white">Visit our <span className="text-sethi-gold">store</span></h1>
          <p className="mt-4 text-sethi-gray500 max-w-xl mx-auto">We&apos;d love to see you in person.</p>
        </div>
      </section>

      {/* SECTION 2 — Store info + map */}
      <section className="section-pad">
        <div className="container-sethi grid lg:grid-cols-2 gap-8">
          <div className="card-sethi p-7 md:p-9">
            <h2 className="font-serif text-xl font-medium">Find us</h2>
            <span className="gold-rule mt-3 mb-6" />
            <ul className="space-y-5 text-sethi-gray800">
              <li className="flex items-start gap-3">
                <MapPin className="w-6 h-6 text-sethi-gold shrink-0" />
                <div>
                  <div className="font-semibold mb-0.5">Address</div>
                  <p>Inside Mai Hiran Gate, Near Books Market,<br />Jalandhar, Punjab 144001</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="w-6 h-6 text-sethi-gold shrink-0" />
                <div>
                  <div className="font-semibold mb-0.5">Phone</div>
                  <a href="tel:+917986161633" className="hover:text-sethi-gold underline-offset-2 hover:underline">+91 7986161633</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <MessageCircle className="w-6 h-6 text-sethi-gold shrink-0" />
                <div>
                  <div className="font-semibold mb-0.5">WhatsApp</div>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="hover:text-sethi-gold underline-offset-2 hover:underline">+91 7986161633</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Clock className="w-6 h-6 text-sethi-gold shrink-0" />
                <div>
                  <div className="font-semibold mb-0.5">Store Timings</div>
                  <p>Monday – Sunday: 10:00 AM – 8:00 PM</p>
                </div>
              </li>
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href={BUSINESS.maps} target="_blank" rel="noopener noreferrer" className="btn-primary">
                <ExternalLink className="w-4 h-4" /> Get Directions
              </a>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="btn-secondary">
                <MessageCircle className="w-4 h-4" /> WhatsApp Us
              </a>
            </div>
          </div>

          <div className="rounded-[4px] overflow-hidden border border-sethi-gray200 bg-sethi-gray100" style={{ minHeight: 400 }}>
            <iframe
              title="SETHI PURSE location"
              src="https://www.google.com/maps?q=SETHI+PURSE+Mai+Hiran+Gate+Jalandhar+Punjab&output=embed"
              width="100%"
              height="100%"
              style={{ minHeight: 400, border: 0, display: 'block' }}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </section>

      {/* SECTION 3 — Google Reviews */}
      <section className="section-pad bg-sethi-gray100">
        <div className="container-sethi text-center max-w-2xl mx-auto">
          <h2 className="heading-section">Our Google reviews</h2>
          <span className="gold-rule mx-auto mt-4" />
          <div className="mt-6 flex items-center justify-center gap-1">
            {[1,2,3,4,5].map((n) => <Star key={n} className="w-7 h-7 text-sethi-gold fill-sethi-gold" />)}
          </div>
          <p className="mt-4 text-sethi-gray800">Rated highly by our customers on Google.</p>
          <a href={BUSINESS.reviews} target="_blank" rel="noopener noreferrer" className="btn-primary mt-7">
            <ExternalLink className="w-4 h-4" /> Read All Google Reviews
          </a>
        </div>
      </section>

      {/* SECTION 4 — Inquiry form */}
      <section className="section-pad pb-32 md:pb-20">
        <div className="container-sethi">
          <div className="text-center mb-10">
            <h2 className="heading-section">Send us a message</h2>
            <span className="gold-rule mx-auto mt-4" />
            <p className="mt-4 text-sethi-gray500">We&apos;ll get back to you within 24 hours.</p>
          </div>
          <div className="max-w-3xl mx-auto">
            <InquiryForm />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
