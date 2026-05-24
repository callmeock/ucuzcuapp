/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      // Admin panelinden yüklenecek dış görseller için
      { protocol: 'https', hostname: '**' },
    ],
  },
}
module.exports = nextConfig
