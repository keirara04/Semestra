import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Minimal production image for Docker/DigitalOcean App Platform — see frontend/Dockerfile.
  output: "standalone",
};

export default nextConfig;
