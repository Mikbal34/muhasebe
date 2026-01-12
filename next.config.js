/** @type {import('next').NextConfig} */
const nextConfig = {
  // Derleme optimizasyonları
  swcMinify: true,

  // Gereksiz paketleri bundle'dan çıkar
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'date-fns'],
  },

  // Powered by header'ı kaldır
  poweredByHeader: false,
}

module.exports = nextConfig
