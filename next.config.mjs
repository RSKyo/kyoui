import path from "path";

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias["@"] = path.resolve(".", "src");
    return config;
  },
  // experimental: {
  //   turbo: false, // ← 禁用 Turbopack
  // },
};

export default nextConfig;
