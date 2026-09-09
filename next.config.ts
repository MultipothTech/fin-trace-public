import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "thesvg.org",
        pathname: "/icons/**",
      },
    ],
  },
};

export default nextConfig;
