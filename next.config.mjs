import { execSync } from "node:child_process";

const UNKNOWN_BUILD_VALUE = "unknown";
// Browsers remember to use HTTPS only for this long (2 years).
const HSTS_MAX_AGE_SECONDS = 63_072_000;

// Short commit of the checkout being built, for GET /api/version. Hosts
// without git can pass BUILD_COMMIT_SHA instead.
function buildCommit() {
  if (process.env.BUILD_COMMIT_SHA) return process.env.BUILD_COMMIT_SHA;
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim()
      || UNKNOWN_BUILD_VALUE;
  } catch {
    return UNKNOWN_BUILD_VALUE;
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Inlined at build time, so they describe the build rather than the restart.
  env: {
    BUILD_COMMIT_SHA: buildCommit(),
    BUILD_TIME: new Date().toISOString(),
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          destination: "/dashboard",
        },
      ],
    };
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: `max-age=${HSTS_MAX_AGE_SECONDS}; includeSubDomains`,
          },
          {
            // The app never uses these browser features.
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
