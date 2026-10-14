import type { NextConfig } from "next";

const chromiumFiles = ["./node_modules/@sparticuz/chromium/bin/**"];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core", "puppeteer"],
  outputFileTracingIncludes: {
    "/api/tracked-products": chromiumFiles,
    "/api/cron/update-prices": chromiumFiles,
  },
};

export default nextConfig;
