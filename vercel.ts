import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  buildCommand: "pnpm --filter web build",
  framework: "nextjs",
  rewrites: [
    { source: "/api/:path*", destination: "https://lumina-api.vercel.app/api/:path*" },
  ],
};
