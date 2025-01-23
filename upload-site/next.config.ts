/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'github.com',
        pathname: '/Mudlet/mudlet-package-repository/**',
      },
    ],
  },
}

module.exports = nextConfig
