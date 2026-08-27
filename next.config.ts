import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,

  /*
   * Sharp uses platform-specific native packages under @img.
   *
   * Vercel's output-file tracing was not including the Linux
   * libvips package in the production serverless functions.
   * Explicitly include the native Sharp dependencies.
   */
  outputFileTracingIncludes: {
    "/*": [
      "./node_modules/@img/sharp-linux-x64/**/*",
      "./node_modules/@img/sharp-libvips-linux-x64/**/*",
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value:
              "camera=(), microphone=(), geolocation=(self), payment=()",
          },
        ],
      },
    ];
  },

  allowedDevOrigins: ["192.168.1.74", "10.222.2.69"],

  images: {
    unoptimized: true,
    qualities: [75, 90, 95, 100],
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },

  experimental: {
    proxyClientMaxBodySize: "50mb",
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
};

export default nextConfig;
