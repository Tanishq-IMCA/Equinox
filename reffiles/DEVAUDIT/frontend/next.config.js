/** @type {import('next').NextConfig} */

const replitDomains = process.env.REPLIT_DOMAINS
  ? process.env.REPLIT_DOMAINS.split(',').map(d => d.trim())
  : [];

const nextConfig = {
  reactStrictMode: false,
  outputFileTracingRoot: process.cwd(),
  experimental: {
    esmExternals: 'loose',
  },
  allowedDevOrigins: [
    ...replitDomains,
    // Replit proxy origins — covers all current and future shard subdomains
    '*.replit.dev',
    '*.sisko.replit.dev',
    '*.repl.co',
    '*.pike.replit.dev',
    '*.hacker.replit.dev',
    '127.0.0.1',
    'localhost',
  ],
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/api/:path*',
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
