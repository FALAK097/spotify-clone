/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: [
      '@prisma/client',
      '.prisma/client',
      'pg',
      'pg-native',
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'pg-native': 'commonjs pg-native',
      });
    }
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      '@better-auth/kysely-adapter': false,
    };
    return config;
  },
};
