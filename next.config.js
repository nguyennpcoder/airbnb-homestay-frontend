/** @type {import('next').NextConfig} */

const backendUrl = process.env.BACKEND_URL || 'http://localhost:8089';

if (process.env.NODE_ENV === 'production' && backendUrl.includes('localhost')) {
  console.warn(
    '[next.config.js] WARNING: BACKEND_URL is not set in production. ' +
    'API rewrites will point to localhost, which fails in production. ' +
    'Set BACKEND_URL=https://airbnb-homestay.onrender.com in your Vercel env vars.'
  );
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
