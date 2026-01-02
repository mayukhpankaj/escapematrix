const path = require('path')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'customer-assets.emergentagent.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'media.giphy.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async rewrites() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    const backendUrl = isDevelopment ? 'http://localhost:8000' : process.env.NEXT_PUBLIC_BACKEND_URL || 'https://your-railway-app-url.up.railway.app';
    
    return [
      {
        source: '/api/:path*',
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: '/webhooks/:path*',
        destination: `${backendUrl}/webhooks/:path*`,
      },
      {
        source: '/health',
        destination: `${backendUrl}/health`,
      },
      {
        source: '/webhook-info',
        destination: `${backendUrl}/webhook-info`,
      },
      {
        source: '/auto-setup-webhook',
        destination: `${backendUrl}/auto-setup-webhook`,
      },
    ]
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname, './'),
    }
    return config
  },
}

module.exports = nextConfig
