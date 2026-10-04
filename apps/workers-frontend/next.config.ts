import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        // Read from env so staging/prod just change .env
        hostname: process.env.NEXT_PUBLIC_CDN_HOSTNAME ?? "d3bjd59ge2rr0k.cloudfront.net",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "decentralized-fiverr-jp.s3.ap-south-1.amazonaws.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
