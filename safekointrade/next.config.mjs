import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./lib/i18n/request.js");

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Cache Components is disabled on purpose: nearly every page in this app
  // depends on the signed-in session, so classic request-time rendering keeps
  // auth checks simple and predictable. Public pages still render statically
  // where they don't read cookies.
  cacheComponents: false,
  poweredByHeader: false,
  // Dev-mode logging of Server Function calls prints their arguments — which
  // include passwords on the auth forms. Keep it off.
  logging: { serverFunctions: false },
  images: {
    remotePatterns: [
      // Pexels — free-to-use licence (https://www.pexels.com/license/)
      { protocol: "https", hostname: "images.pexels.com", pathname: "/photos/**" },
    ],
    formats: ["image/avif", "image/webp"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  turbopack: {
    // Optional payment add-ons pulled in by WalletConnect's Base/Coinbase
    // connector. They are never called here, so they resolve to an empty module.
    resolveAlias: Object.fromEntries(
      ["@x402/core/client", "@x402/evm", "@x402/evm/exact/client", "@x402/evm/upto/client", "@x402/svm/exact/client"].map((m) => [m, "./lib/wallet/empty-module.js"])
    ),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
