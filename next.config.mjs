const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self' https://api.fish.audio https://v2.aicodee.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  }
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        headers: securityHeaders,
        source: "/:path*"
      }
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ["@node-rs/bcrypt"]
  },
  webpack(config, { dev, isServer }) {
    if (dev && isServer) {
      config.output.chunkFilename = "[name].js";
    }

    return config;
  },
  reactStrictMode: true
};

export default nextConfig;
