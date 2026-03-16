
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Fix for cross-origin warning in the cloud environment
  experimental: {
    allowedDevOrigins: [
      "9000-firebase-studio-1773460384801.cluster-edb2jv34dnhjisxuq5m7l37ccy.cloudworkstations.dev",
      "localhost:9002"
    ],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
      },
    ],
  },
};

export default nextConfig;
