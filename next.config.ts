import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
  outputFileTracingIncludes: {
    "/api/cron/price-check": ["./node_modules/@sparticuz/chromium/bin/**"],
  },
};

export default nextConfig;
