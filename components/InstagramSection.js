import { Instagram } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';

const HANDLE = 'sethipurse';
const PROFILE_URL = BUSINESS.instagram;

// Static preview tiles — gold/dark pattern matching brand colors
const TILES = [
  { bg: '#2c1f14', text: '🧳', label: 'Trolley Bags' },
  { bg: '#c9a84c', text: '👜', label: 'Handbags' },
  { bg: '#6b5544', text: '🎒', label: 'Backpacks' },
  { bg: '#2c1f14', text: '💼', label: 'Travel Bags' },
  { bg: '#a07a28', text: '👛', label: 'Wallets' },
  { bg: '#3d2b1c', text: '✨', label: 'New Arrivals' },
];

export default function InstagramSection() {
  return (
    <section className="section-pad bg-[#faf8f4]">
      <div className="container-sethi">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Instagram className="w-6 h-6 text-[#c9a84c]" />
              <span className="text-sm font-semibold text-[#8a7060] uppercase tracking-wider">Follow Us</span>
            </div>
            <h2 className="heading-section">@{HANDLE}</h2>
            <p className="mt-2 text-[#8a7060]">Latest bags, offers and store updates on Instagram.</p>
          </div>
          <a
            href={PROFILE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary self-start md:self-auto shrink-0"
          >
            <Instagram className="w-4 h-4" /> Follow on Instagram
          </a>
        </div>

        {/* Tile grid */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {TILES.map((tile, idx) => (
            <a
              key={idx}
              href={PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square rounded-sm overflow-hidden flex items-center justify-center transition-transform hover:-translate-y-1 hover:shadow-lg"
              style={{ backgroundColor: tile.bg }}
            >
              <span className="text-4xl">{tile.text}</span>
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <span className="text-white text-xs font-semibold">{tile.label}</span>
              </div>
              {/* Instagram icon on hover */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Instagram className="w-4 h-4 text-white" />
              </div>
            </a>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-6 text-center">
          <p className="text-[#8a7060] text-sm">
            See our latest collection, offers and customer photos →{' '}
            <a href={PROFILE_URL} target="_blank" rel="noopener noreferrer" className="text-[#c9a84c] font-semibold hover:underline">
              @{HANDLE}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
