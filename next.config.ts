import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  poweredByHeader: false,
  reactStrictMode: true,
  turbopack: {
    root: process.cwd(),
  },
  // The in-app manual reads docs/manual and docs/screenshots at request time.
  outputFileTracingIncludes: {
    "/manual": ["./docs/manual/**", "./docs/screenshots/**"],
    "/manual/[chapter]": ["./docs/manual/**"],
    "/manual/imagem/[file]": ["./docs/screenshots/**"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
