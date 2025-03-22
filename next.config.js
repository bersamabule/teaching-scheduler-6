/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone', // Optimized for Docker deployment
  images: {
    domains: ['tdcxyktnqtdeyvcpogyg.supabase.co'],
    formats: ['image/avif', 'image/webp'],
  },
  // Additional env variables that should be available to the client
  env: {
    SUPABASE_URL: process.env.SUPABASE_URL,
  },
  // Function to modify webpack config
  webpack: (config, { dev, isServer }) => {
    // Enable tree shaking and optimize build
    if (!dev && !isServer) {
      config.optimization.minimize = true;
    }
    
    return config;
  },
};

module.exports = nextConfig; 