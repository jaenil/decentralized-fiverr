import type { NextConfig } from "next";

let cloudfrontHost = "d3bjd59ge2rr0k.cloudfront.net";
if (process.env.NEXT_PUBLIC_CLOUDFRONT_URL) {
  try {
    cloudfrontHost = new URL(process.env.NEXT_PUBLIC_CLOUDFRONT_URL).hostname;
  } catch {}
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: cloudfrontHost,
      },
      {
        protocol: "https",
        hostname: "*.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "decentralized-fiverr-jp.s3.ap-south-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
