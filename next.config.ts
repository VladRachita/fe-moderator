import type { NextConfig } from "next";

const mediaCdnHost = process.env.MEDIA_CDN_HOST;

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'geolocation=(), microphone=(), camera=()' },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      // Production: use CDN/MinIO hostname from env
      ...(mediaCdnHost
        ? [{ protocol: 'https' as const, hostname: mediaCdnHost }]
        : []),
      // Dev fallback: local MinIO
      ...(!mediaCdnHost
        ? [{ protocol: 'http' as const, hostname: 'localhost', port: '9000', pathname: '/**' }]
        : []),
    ],
  },
};

export default nextConfig;