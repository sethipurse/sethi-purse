'use client';
import { useEffect, useState } from 'react';
import { Instagram } from 'lucide-react';
import { BUSINESS } from '@/lib/constants';

const FEED_URL = 'https://feeds.behold.so/sKoJf7qZWeS1nr1P4VwY';
const PROFILE_URL = BUSINESS.instagram;
const HANDLE = 'sethipurse';

export default function InstagramSection() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(FEED_URL)
      .then((r) => r.json())
      .then((data) => {
        const arr = Array.isArray(data) ? data : (data.posts || []);
        setPosts(arr.slice(0, 9));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-sm bg-[#ede8df] animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-[#8a7060]">
            <Instagram className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Follow us on Instagram <a href={PROFILE_URL} target="_blank" rel="noopener noreferrer" className="text-[#c9a84c] font-semibold hover:underline">@{HANDLE}</a></p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 md:gap-3">
            {posts.map((post, idx) => {
              // behold.pictures CDN = clean cropped images, no Instagram overlays
              const img =
                post.sizes?.small?.mediaUrl ||
                post.sizes?.medium?.mediaUrl ||
                '';
              const caption = post.caption || '';
              const isReel = post.isReel || post.mediaType === 'VIDEO';

              return (
                <a
                  key={post.id || idx}
                  href={post.permalink || PROFILE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative aspect-square overflow-hidden rounded-sm bg-[#f5f0e8]"
                >
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img}
                      alt={caption.slice(0, 60) || 'SETHI PURSE Instagram'}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                  )}
                  {/* Reel play icon */}
                  {isReel && (
                    <div className="absolute top-2 right-2 bg-black/50 rounded-full p-1">
                      <svg className="w-3 h-3 text-white fill-white" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Instagram className="w-6 h-6 text-white" />
                  </div>
                </a>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-6 text-center">
          <p className="text-[#8a7060] text-sm">
            See our latest collection and offers →{' '}
            <a href={PROFILE_URL} target="_blank" rel="noopener noreferrer" className="text-[#c9a84c] font-semibold hover:underline">
              @{HANDLE}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
