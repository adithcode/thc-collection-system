/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  allowedDevOrigins: ['100.123.109.4', 'localhost:3000'],
};

export default nextConfig;
