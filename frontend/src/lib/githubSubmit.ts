import type { SubmissionRecord } from "@/types/submission";
import { getGitHubSubmitConfig } from "@/lib/githubConfig";
import {
  createOrUpdateFileContents,
  GitHubApiError,
  listDirectoryContents,
  ProxyDuplicateError,
  putFileViaProxy,
  utf8ToBase64,
} from "@/lib/githubApi";
import { buildCanonicalBody, canonicalJsonString, sha256Hex } from "@/lib/submissionCanonical";
import { validateSubmissionRecord } from "@/lib/submissionValidate";

const SESSION_FP_KEY = "text2sql.submission_fingerprints_v1";

export class DuplicateSubmissionError extends Error {
  constructor(message = "This entry was already submitted (duplicate content).") {
    super(message);
    this.name = "DuplicateSubmissionError";
  }
}

function randomSuffix(): string {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function buildPendingFilename(record: SubmissionRecord, fingerprintPrefix: string): string {
  const cfg = getGitHubSubmitConfig();
  const prefix = cfg?.pendingPathPrefix ?? "submissions/pending";
  const safePrefix = fingerprintPrefix.slice(0, 32);
  const idShort = record.submission_id.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 8);
  return `${prefix}/fp-${safePrefix}-${idShort}-${Date.now()}-${randomSuffix()}.json`;
}

function readSessionFingerprints(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(SESSION_FP_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(arr.filter((x) => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function rememberSessionFingerprint(fp32: string): void {
  if (typeof window === "undefined") return;
  const set = readSessionFingerprints();
  set.add(fp32);
  sessionStorage.setItem(SESSION_FP_KEY, JSON.stringify([...set]));
}

function assertSessionNotDuplicate(fp32: string): void {
  if (readSessionFingerprints().has(fp32)) {
    throw new DuplicateSubmissionError();
  }
}

async function assertRemotePendingNotDuplicate(
  cfg: NonNullable<ReturnType<typeof getGitHubSubmitConfig>>,
  token: string,
  fp32: string,
): Promise<void> {
  const listing = await listDirectoryContents(cfg, token, cfg.pendingPathPrefix);
  if (!listing) return;
  const needle = `fp-${fp32}`;
  const clash = listing.some(
    (item) => item.type === "file" && item.name.endsWith(".json") && item.name.includes(needle),
  );
  if (clash) throw new DuplicateSubmissionError();
}

export interface SubmitToGitHubResult {
  path: string;
  htmlUrl?: string;
}

/**
 * Validates, checks duplicate fingerprint (session + repo listing when PAT is available),
 * encodes JSON, creates file via GitHub API or proxy.
 */
export async function submitPendingSubmission(
  record: SubmissionRecord,
): Promise<SubmitToGitHubResult> {
  const cfg = getGitHubSubmitConfig();
  if (!cfg) {
    throw new Error(
      "GitHub submission is not configured. Set NEXT_PUBLIC_GITHUB_OWNER, NEXT_PUBLIC_GITHUB_REPO, and either NEXT_PUBLIC_GITHUB_TOKEN or NEXT_PUBLIC_GITHUB_SUBMIT_PROXY.",
    );
  }

  const validationError = validateSubmissionRecord(record);
  if (validationError) throw new Error(validationError);

  const canonical = buildCanonicalBody(record);
  const fpFull = await sha256Hex(canonicalJsonString(canonical));
  const fp32 = fpFull.slice(0, 32);

  assertSessionNotDuplicate(fp32);

  const json = JSON.stringify(record, null, 2);
  const b64 = utf8ToBase64(json);
  const path = buildPendingFilename(record, fpFull);
  const message = `chore(submissions): add pending entry ${record.submission_id}`;

  if (cfg.mode === "direct") {
    if (!cfg.token) throw new Error("NEXT_PUBLIC_GITHUB_TOKEN is missing.");
    await assertRemotePendingNotDuplicate(cfg, cfg.token, fp32);
    const result = await createOrUpdateFileContents({
      cfg,
      token: cfg.token,
      path,
      message,
      contentBase64: b64,
    });
    rememberSessionFingerprint(fp32);
    return {
      path,
      htmlUrl: result.content?.html_url ?? result.commit?.html_url,
    };
  }

  const result = await putFileViaProxy({
    cfg,
    path,
    message,
    contentBase64: b64,
    fingerprintPrefix32: fp32,
  });
  rememberSessionFingerprint(fp32);
  return {
    path,
    htmlUrl: result.content?.html_url ?? result.commit?.html_url,
  };
}

export function formatSubmitError(err: unknown): string {
  if (err instanceof DuplicateSubmissionError) return err.message;
  if (err instanceof ProxyDuplicateError) return err.message;
  if (err instanceof GitHubApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Submission failed.";
}
