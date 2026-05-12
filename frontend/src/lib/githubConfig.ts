export type GitHubSubmitMode = "direct" | "proxy";

export interface GitHubSubmitConfig {
  mode: GitHubSubmitMode;
  owner: string;
  repo: string;
  branch: string;
  pendingPathPrefix: string;
  /** GitHub PAT with repo Contents scope (direct mode only). */
  token?: string;
  /** HTTPS endpoint that forwards PUT /contents (proxy mode). */
  proxyUrl?: string;
}

function readEnv(key: string): string | undefined {
  if (typeof process === "undefined" || !process.env) return undefined;
  const v = process.env[key];
  return v && v.trim() ? v.trim() : undefined;
}

/**
 * Resolves configuration from Next.js public env vars.
 *
 * Security: `NEXT_PUBLIC_GITHUB_TOKEN` is exposed in the browser bundle on static hosting.
 * Prefer `NEXT_PUBLIC_GITHUB_SUBMIT_PROXY` + a small edge worker that holds `GITHUB_TOKEN`.
 */
export function getGitHubSubmitConfig(): GitHubSubmitConfig | null {
  const owner = readEnv("NEXT_PUBLIC_GITHUB_OWNER");
  const repo = readEnv("NEXT_PUBLIC_GITHUB_REPO");
  if (!owner || !repo) return null;

  const branch = readEnv("NEXT_PUBLIC_GITHUB_BRANCH") ?? "main";
  const pendingPathPrefix =
    readEnv("NEXT_PUBLIC_GITHUB_PENDING_PREFIX") ?? "submissions/pending";

  const proxyUrl = readEnv("NEXT_PUBLIC_GITHUB_SUBMIT_PROXY");
  const token = readEnv("NEXT_PUBLIC_GITHUB_TOKEN");

  if (proxyUrl) {
    return { mode: "proxy", owner, repo, branch, pendingPathPrefix, proxyUrl };
  }
  if (token) {
    return { mode: "direct", owner, repo, branch, pendingPathPrefix, token };
  }
  return null;
}

export function isGitHubSubmitConfigured(): boolean {
  return getGitHubSubmitConfig() !== null;
}
