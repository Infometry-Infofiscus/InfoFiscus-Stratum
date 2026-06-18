import type { GitHubSubmitConfig } from "@/lib/githubConfig";

export class ProxyDuplicateError extends Error {
  constructor() {
    super("Duplicate submission (same content fingerprint).");
    this.name = "ProxyDuplicateError";
  }
}

const API_VERSION = "2022-11-28";

function encodeRepoContentPath(path: string): string {
  return path
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
}

export class GitHubApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: string,
  ) {
    super(message);
    this.name = "GitHubApiError";
  }
}

const USER_AGENT =
  "text2sql-data-collection/1.0 (+https://github.com/Infometry-Infofiscus/InfoFiscus-Stratum; GitHub submit form)";

function authHeaders(cfg: GitHubSubmitConfig, token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VERSION,
    "User-Agent": USER_AGENT,
  };
}

export interface ContentFileResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url?: string;
  git_url?: string;
  download_url: string | null;
  type: "file" | "dir" | "submodule" | "symlink";
}

export async function listDirectoryContents(
  cfg: GitHubSubmitConfig,
  token: string,
  path: string,
): Promise<ContentFileResponse[] | null> {
  const url = new URL(
    `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeRepoContentPath(path)}`,
  );
  url.searchParams.set("ref", cfg.branch);

  const res = await fetch(url.toString(), { headers: authHeaders(cfg, token) });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new GitHubApiError(`GitHub list failed (${res.status})`, res.status, text);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) return null;
  return data as ContentFileResponse[];
}

export interface PutFileResult {
  content?: { html_url?: string; path?: string };
  commit?: { html_url?: string };
}

export async function createOrUpdateFileContents(args: {
  cfg: GitHubSubmitConfig;
  token: string;
  path: string;
  message: string;
  contentBase64: string;
}): Promise<PutFileResult> {
  const { cfg, token, path, message, contentBase64 } = args;
  const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${encodeRepoContentPath(path)}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(cfg, token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: contentBase64,
      branch: cfg.branch,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new GitHubApiError(
      parseGitHubErrorMessage(text, res.status),
      res.status,
      text,
    );
  }
  try {
    return JSON.parse(text) as PutFileResult;
  } catch {
    return {};
  }
}

function parseGitHubErrorMessage(raw: string, status: number): string {
  try {
    const j = JSON.parse(raw) as { message?: string; errors?: { message?: string }[] };
    if (typeof j.message === "string") return j.message;
    if (Array.isArray(j.errors) && j.errors[0]?.message) return j.errors[0].message!;
  } catch {
    /* ignore */
  }
  return `GitHub API error (${status})`;
}

export async function putFileViaProxy(args: {
  cfg: GitHubSubmitConfig;
  path: string;
  message: string;
  contentBase64: string;
  /** When set, the proxy should reject if a pending file already contains this fingerprint prefix. */
  fingerprintPrefix32?: string;
}): Promise<PutFileResult> {
  const { cfg, path, message, contentBase64, fingerprintPrefix32 } = args;
  if (!cfg.proxyUrl) throw new Error("Proxy URL is not configured.");

  const res = await fetch(cfg.proxyUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      owner: cfg.owner,
      repo: cfg.repo,
      branch: cfg.branch,
      path,
      message,
      content: contentBase64,
      pendingPrefix: cfg.pendingPathPrefix,
      fingerprintPrefix32,
    }),
  });
  const text = await res.text();
  if (res.status === 409) {
    throw new ProxyDuplicateError();
  }
  if (!res.ok) {
    throw new GitHubApiError(
      text ? text.slice(0, 500) : `Proxy error (${res.status})`,
      res.status,
      text,
    );
  }
  try {
    return JSON.parse(text) as PutFileResult;
  } catch {
    return {};
  }
}

export function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}
