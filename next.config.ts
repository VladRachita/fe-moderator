import type { NextConfig } from "next";

const mediaCdnHost = process.env.MEDIA_CDN_HOST;

const nextConfig: NextConfig = {
  output: 'standalone',
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