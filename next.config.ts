import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  /**
   * Testing on a phone hits the dev server by LAN IP, not localhost. Next
   * treats that as a cross-origin dev request and blocks hot reload unless the
   * origin is listed here, which shows up as "the page loads but never
   * updates". Dev only — it has no effect on a production build.
   *
   * The address is DHCP and does change, so the subnet is wildcarded.
   */
  allowedDevOrigins: ['192.168.1.*', '192.168.0.*'],

  async headers() {
    /**
     * 'unsafe-inline' for styles is unavoidable here: the design is built from
     * inline style attributes throughout, faithfully to the prototype, and a
     * nonce cannot cover those. Scripts need it too until Next's hydration
     * bootstrap is nonce-wrapped, which needs middleware on every route.
     *
     * The directives that actually stop things are the rest: nothing may frame
     * this site, no plugins, no <base> rewriting, forms may only post back to
     * us, and connections are limited to R2 and the map.
     */
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.googleapis.com https://*.gstatic.com https://maps.google.com",
      "font-src 'self' data:",
      // The signed upload goes straight from the browser to the bucket.
      "connect-src 'self' https://*.r2.cloudflarestorage.com",
      // The society's location.
      "frame-src https://maps.google.com https://www.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ].join('; ');

    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          // Belt and braces for browsers that predate frame-ancestors.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=()',
          },
          {
            // Ignored over plain http, so this is harmless locally and
            // required the moment the site is served over TLS.
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
