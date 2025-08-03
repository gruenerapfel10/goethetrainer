import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: '*.s3.*.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'image-storage-moterra.s3.eu-north-1.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
    domains: [
      'www.google.com',
      'moterra-genai-erp-logo-store.s3.eu-central-1.amazonaws.com',
      'moterra-genai-erp-logo-store.s3.amazonaws.com',
      'image-storage-moterra.s3.eu-central-1.amazonaws.com',
      'moterra-genai-erp-logo-store.s3.*.amazonaws.com',
    ],
  },

  webpack(config, { dev }) {
    if (dev) {
      config.devtool = 'source-map';
    }
    return config;
  },
};

export default withNextIntl(nextConfig);
