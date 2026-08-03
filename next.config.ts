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
};

export default nextConfig;
