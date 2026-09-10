/** @type {import('next').NextConfig} */

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8089';

if (process.env.NODE_ENV === 'production') {
  if (!process.env.BACKEND_URL) {
    console.error(
      '\n[FATAL] BACKEND_URL env var is missing on Vercel.\n' +
      'API rewrites will point to http://localhost:8089 which is unreachable in production.\n' +
      'Fix: Vercel Dashboard → Project → Settings → Environment Variables → Production\n' +
      '      Add: BACKEND_URL = https://airbnb-homestay.onrender.com\n' +
      '      Then click "Redeploy".\n'
    );
  } else if (backendUrl.includes('localhost') || backendUrl.includes('127.0.0.1')) {
    console.error(
      '\n[FATAL] BACKEND_URL is set to localhost (' + backendUrl + '). ' +
      'API rewrites will fail in production.\n' +
      'Fix: set BACKEND_URL = https://airbnb-homestay.onrender.com in Vercel env vars.\n'
    );
  } else {
    console.log('[next.config.js] BACKEND_URL = ' + backendUrl);
  }
}

const popupSafeHeaders = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'unsafe-none' },
];

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'example.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8089',
        pathname: '/uploads/**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '8088',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'airbnb-homestay.onrender.com',
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'ui-avatars.com',
        pathname: '/api/**',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  webpack: (config) => {
    return config;
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/uploads/:path*',
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: popupSafeHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
