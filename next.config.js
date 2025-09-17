/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Temporarily disable strict mode
  experimental: {
    typedRoutes: true,
  },
  images: {
    domains: [],
  },
}

module.exports = nextConfig