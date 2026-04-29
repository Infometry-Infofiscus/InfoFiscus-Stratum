/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";
const repoName =
  process.env.NEXT_PUBLIC_REPO_NAME ||
  process.env.GITHUB_REPOSITORY?.split("/")[1] ||
  "text2sql_data_collection_platform";

const nextConfig = {
  reactStrictMode: true,
  // output: "export" is only needed for GitHub Pages static export (not local dev)
  ...(isDev ? {} : { output: "export", trailingSlash: true }),
  basePath: isDev ? "" : `/${repoName}`,
  assetPrefix: isDev ? "" : `/${repoName}/`,
  env: {
    NEXT_PUBLIC_BASE_PATH: isDev ? "" : `/${repoName}`,
  },
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;