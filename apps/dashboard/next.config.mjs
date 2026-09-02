/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Workspace TS source; only node-free subpaths (e.g. @diffchroma/shared/csv)
  // may be imported from client code.
  transpilePackages: ["@diffchroma/shared"],
};

export default nextConfig;
