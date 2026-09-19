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

const nextConfig = {
  async redirects() {
    return [
      {
        source: "/pesan",
        destination: "/",
        permanent: false,
      },
    ];
  },
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

module.exports = withPWA(nextConfig);
