import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // src/proxy.ts buffers request bodies (default 10MB, then truncates).
    // The studio's "Add to a page gallery" uploads 1080p clips of 15MB+.
    proxyClientMaxBodySize: "100mb",
  },
  async redirects() {
    // Sections inherited from the memoir app that have no content for this
    // book. Temporary redirects so they can come back without cache trouble.
    return [
      { source: "/principles/:path*", destination: "/codex", permanent: false },
      // The per-type index pages are now filters on the one codex index.
      { source: "/characters", destination: "/codex?type=characters", permanent: false },
      { source: "/factions", destination: "/codex?type=factions", permanent: false },
      { source: "/locations", destination: "/codex?type=locations", permanent: false },
      { source: "/artifacts", destination: "/codex?type=artifacts", permanent: false },
      { source: "/vaults", destination: "/codex?type=vaults", permanent: false },
      { source: "/rules", destination: "/codex?type=rules", permanent: false },
      { source: "/arcs", destination: "/codex?type=characters", permanent: false },
      { source: "/themes/:path*", destination: "/stories", permanent: false },
      { source: "/journeys/:path*", destination: "/codex", permanent: false },
      { source: "/tell/:path*", destination: "/", permanent: false },
    ];
  },
};

export default nextConfig;
