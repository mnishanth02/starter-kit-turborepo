import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@starter/validation', '@starter/db', '@starter/auth', '@starter/api'],
};

export default nextConfig;
