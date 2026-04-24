import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/TFS_Plan_B',
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
};

export default nextConfig;