/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // PWA assets (manifest, service worker) live in /public and are registered
  // client-side in src/components/pwa-register.tsx — no paid build plugin needed.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
