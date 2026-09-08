import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The .h5p export needs the vendored H5P runtime libraries (a committed zip).
  // Make sure Vercel's file tracing bundles it with the serverless functions.
  outputFileTracingIncludes: {
    "/api/mcp": ["./lib/h5p/vendor/**"],
    "/api/demo": ["./lib/h5p/vendor/**"],
  },
};

export default nextConfig;
