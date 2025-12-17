import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const BUILD_OUTPUT = process.env.NEXT_STANDALONE_OUTPUT
  ? "standalone"
  : undefined;

export default () => {
  const nextConfig: NextConfig = {
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
    },
    webpack: (config, { dev, isServer }) => {
      if (dev && !isServer) {
        config.optimization = {
          ...config.optimization,
          moduleIds: "deterministic",
          runtimeChunk: "single",
          splitChunks: {
            chunks: "all",
            cacheGroups: {
              default: false,
              vendors: false,
              shiki: {
                name: "shiki",
                test: /[\\/]node_modules[\\/]shiki[\\/]/,
                priority: 10,
                reuseExistingChunk: true,
              },
            },
          },
        };
        config.cache = {
          type: "filesystem",
          buildDependencies: {
            config: [__filename],
          },
        };
      }
      return config;
    },
  };
  const withNextIntl = createNextIntlPlugin();
  return withNextIntl(nextConfig);
};
