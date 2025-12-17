import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const BUILD_OUTPUT = process.env.NEXT_STANDALONE_OUTPUT
  ? "standalone"
  : undefined;

export default () => {
  const nextConfig: NextConfig = {
    productionBrowserSourceMaps: false,
    output: BUILD_OUTPUT,
    cleanDistDir: true,
    devIndicators: {
      position: "bottom-right",
    },
    env: {
      NO_HTTPS: process.env.NO_HTTPS,
    },
    experimental: {
      taint: true,
      authInterrupts: true,
      webpackMemoryOptimizations: true,
      turbo: {
        // Disable source maps in Turbopack to prevent memory leaks
        sourceMaps: false,
      },
    },
    webpack: (config, { dev }) => {
      if (dev) {
        config.devtool = false; // Disable source maps in dev
      }
      return config;
    },
  };
  const withNextIntl = createNextIntlPlugin();
  return withNextIntl(nextConfig);
};
