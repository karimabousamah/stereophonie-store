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
    /*
     * PERFORMANCE
     *
     * Let Next.js resize and optimize Supabase product imagery
     * instead of forcing browsers to download the original file.
     */
    unoptimized: false,

    formats: ["image/webp"],

    qualities: [75, 90, 95, 100],

    /*
     * Responsive output sizes used throughout the storefront.
     * Small product cards no longer need full-resolution originals.
     */
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384],

    /*
     * Optimized variants can remain cached for one week.
     */
    minimumCacheTTL: 604800,

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
