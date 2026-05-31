/** @type {import('next').NextConfig} */
module.exports = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push({
        'kysely': 'commonjs kysely',
        '@better-auth/kysely-adapter': 'commonjs @better-auth/kysely-adapter',
        'pg-native': 'commonjs pg-native',
      });
    }
    return config;
  },
};
