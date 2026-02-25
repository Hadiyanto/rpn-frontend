import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public/js",
  scope: "/",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  swcMinify: true,
  disable: process.env.NODE_ENV === "development",
  customWorkerSrc: "sw-push.js",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/:file(sw\\.js|workbox-.*|swe-worker-.*)",
        destination: "/js/:file",
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/js/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },
};

export default withPWA(nextConfig);
