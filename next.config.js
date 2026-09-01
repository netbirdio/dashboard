/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
  env: {
    APP_ENV: process.env.APP_ENV || "production",
    NEXT_PUBLIC_DASHBOARD_VERSION:
      process.env.NEXT_PUBLIC_DASHBOARD_VERSION || "development",
  },
  // The assistant SDKs are consumed as packed tarballs under ./vendor, so
  // they live inside node_modules like any other dependency; they ship
  // prebuilt ESM with "use client" banners, which Next consumes directly.
  transpilePackages: ["@netbird/assistant-react"],
};

module.exports = nextConfig;
