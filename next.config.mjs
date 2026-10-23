/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "pub-9350dce8a12e41c091a228ca7b1d7d48.r2.dev" },
    ],
  },
};

export default nextConfig;
