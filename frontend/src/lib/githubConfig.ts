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

function t(v: string | undefined): string | undefined {
  const s = v?.trim();
  return s ? s : undefined;
}

/**
 * Next.js inlines `NEXT_PUBLIC_*` at build time only for **direct**
 * `process.env.NEXT_PUBLIC_*` reads. Never use `process.env[dynamicKey]` here.
 */
export function getGitHubSubmitConfig(): GitHubSubmitConfig | null {
  const owner = t(process.env.NEXT_PUBLIC_GITHUB_OWNER);
  const repo = t(process.env.NEXT_PUBLIC_GITHUB_REPO);
  if (!owner || !repo) return null;

  const branch = t(process.env.NEXT_PUBLIC_GITHUB_BRANCH) ?? "main";
  const pendingPathPrefix =
    t(process.env.NEXT_PUBLIC_GITHUB_PENDING_PREFIX) ?? "submissions/pending";

  const proxyUrl = t(process.env.NEXT_PUBLIC_GITHUB_SUBMIT_PROXY);
  const token = t(process.env.NEXT_PUBLIC_GITHUB_TOKEN);

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
