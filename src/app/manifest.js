export default function manifest() {
  return {
    name: 'THC Group Finance',
    short_name: 'THC Collection',
    description: 'Premium Loan Collection Portal for THC Group Finance.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0A0B',
    theme_color: '#0A0A0B',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ],
    shortcuts: [
      {
        name: 'Due Today',
        short_name: 'Due Today',
        description: 'View cases due for collection today',
        url: '/?filter=Due+Today',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      },
      {
        name: 'My Portfolio',
        short_name: 'Portfolio',
        description: 'View your full collection workload',
        url: '/',
        icons: [{ src: '/icon-192.png', sizes: '192x192' }]
      }
    ]
  }
}
