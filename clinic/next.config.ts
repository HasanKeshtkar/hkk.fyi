import type { NextConfig } from 'next';

const isDev = process.env.NODE_ENV === 'development';

// Production: a fully static export (out/) that the Fastify server serves next to the API.
// No Next server runs in production, and nothing is fetched from any other host.
const config: NextConfig = {
  output: isDev ? undefined : 'export',
  trailingSlash: true,
  // `next dev` proxies the API to the Fastify server on :3000 (npm run dev). The API has no
  // trailing slashes, so dev must not redirect /api/me to /api/me/.
  skipTrailingSlashRedirect: isDev,
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  typescript: { tsconfigPath: 'tsconfig.web.json' },
  ...(isDev
    ? {
        async rewrites() {
          return [{ source: '/api/:path*', destination: 'http://127.0.0.1:3000/api/:path*' }];
        },
      }
    : {}),
};

export default config;
