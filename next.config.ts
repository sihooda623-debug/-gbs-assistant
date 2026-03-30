import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  allowedDevOrigins: ["127.0.0.1", "localhost", "::1", "10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16"],
  reactStrictMode: false,
};

export default nextConfig;
