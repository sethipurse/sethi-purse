export default function manifest() {
  return {
    name: 'SETHI PURSE',
    short_name: 'Sethi Purse',
    description: 'Premium bags, luggage, handbags and school bags in Jalandhar.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#faf8f4',
    theme_color: '#c9a84c',
    categories: ['shopping', 'lifestyle'],
    icons: [
      {
        src: '/icons/icon-192.svg',
        sizes: '192x192',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
      {
        src: '/icons/icon-512.svg',
        sizes: '512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable',
      },
    ],
  };
}
