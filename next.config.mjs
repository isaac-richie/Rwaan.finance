/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  webpack: (config, { isServer, webpack }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };

    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^(@stripe\/crypto|@farcaster\/mini-app-solana)$/,
      }),
    );

    return config;
  },
};

export default nextConfig;
