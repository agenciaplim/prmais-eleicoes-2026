import type { NextConfig } from "next";

const production = process.env.NODE_ENV === "production";

// Next inlines its bootstrap scripts and the result bars use inline widths, hence 'unsafe-inline'.
// Everything else is limited to our origin; the only third-party frame is the YouTube embed.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-src https://www.youtube-nocookie.com",
  "form-action 'self' https://prmais.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests"
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Dev server needs eval for fast refresh, so CSP and HSTS apply to production builds only.
          ...(production
            ? [
                { key: "Content-Security-Policy", value: contentSecurityPolicy },
                { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }
              ]
            : [])
        ]
      },
      {
        source: "/maps/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }]
      }
    ];
  }
};

export default nextConfig;
