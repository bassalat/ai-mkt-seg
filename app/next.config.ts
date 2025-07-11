import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: '/api/segmentation/status',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-transform',
          },
          {
            key: 'Content-Type',
            value: 'text/event-stream',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
