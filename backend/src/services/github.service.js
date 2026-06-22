/**
 * github.service.js
 * All direct calls to GitHub's REST API live here.
 * Controllers call these functions — never touch `fetch` to github.com directly.
 */
import { env } from '../config/env.js';

const GH_API = 'https://api.github.com';

const ghHeaders = () => ({
  Authorization:          `Bearer ${env.githubPat}`,
  Accept:                 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type':         'application/json',
});

// ── OAuth ──────────────────────────────────────────────────────────────────

/**
 * Exchange an OAuth `code` for a user access_token.
 * Needs the client secret — this is why it must run server-side.
 */
export async function exchangeOAuthCode(code) {
  const res = await fetch('https://github.com/login/oauth/access_token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id:     env.githubClientId,
      client_secret: env.githubClientSecret,
      code,
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error_description || data.error);
  return data.access_token;
}

// ── Submissions ──────────────────────────────────────────────────────────

/**
 * Write a new submission JSON file to the data repo.
 * @returns {{ id, filename }}
 */
export async function createSubmissionFile(formData, author) {
  const id        = Math.random().toString(36).slice(2, 10);
  const timestamp = new Date().toISOString();
  const filename  = `${timestamp.replace(/[:.]/g, '-')}-${id}.json`;
  const filePath  = `${env.githubDataPath}/${filename}`;

  const submission = {
    id,
    filename,
    createdAt: timestamp,
    status:    'pending',
    author:    author || { login: 'anonymous', name: 'Anonymous' },
    ...formData,
  };

  const content = Buffer.from(JSON.stringify(submission, null, 2)).toString('base64');

  const res = await fetch(
    `${GH_API}/repos/${env.githubRepoOwner}/${env.githubRepoName}/contents/${filePath}`,
    {
      method:  'PUT',
      headers: ghHeaders(),
      body: JSON.stringify({
        message: `feat(stratum): add submission "${(formData.businessQuestion || '').slice(0, 60)}"`,
        content,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'GitHub write failed');
  }

  return { id, filename };
}

/**
 * List all submission JSON files, optionally filtered.
 * @param {{ status?: string, author?: string }} filters
 */
export async function listSubmissionFiles(filters = {}) {
  const listRes = await fetch(
    `${GH_API}/repos/${env.githubRepoOwner}/${env.githubRepoName}/contents/${env.githubDataPath}`,
    { headers: ghHeaders() }
  );

  if (listRes.status === 404) return []; // folder doesn't exist yet

  if (!listRes.ok) {
    const err = await listRes.json();
    throw new Error(err.message || 'GitHub read failed');
  }

  const files = await listRes.json();
  const jsonFiles = Array.isArray(files)
    ? files.filter((f) => f.name.endsWith('.json')).slice(0, 100)
    : [];

  const results = await Promise.allSettled(
    jsonFiles.map((f) => fetch(f.download_url).then((r) => r.json()))
  );

  let submissions = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (filters.status) submissions = submissions.filter((s) => s.status === filters.status);
  if (filters.author) submissions = submissions.filter((s) => s.author?.login === filters.author);

  return submissions;
}

/**
 * Update a submission's status (approve/reject).
 */
export async function updateSubmissionStatus(filename, status) {
  const filePath = `${env.githubDataPath}/${filename}`;

  const getRes = await fetch(
    `${GH_API}/repos/${env.githubRepoOwner}/${env.githubRepoName}/contents/${filePath}`,
    { headers: ghHeaders() }
  );
  if (!getRes.ok) {
    const err = await getRes.json();
    throw new Error(err.message || 'File not found');
  }
  const fileData = await getRes.json();

  const current = JSON.parse(Buffer.from(fileData.content, 'base64').toString('utf-8'));
  current.status     = status;
  current.reviewedAt = new Date().toISOString();

  const newContent = Buffer.from(JSON.stringify(current, null, 2)).toString('base64');

  const putRes = await fetch(
    `${GH_API}/repos/${env.githubRepoOwner}/${env.githubRepoName}/contents/${filePath}`,
    {
      method:  'PUT',
      headers: ghHeaders(),
      body: JSON.stringify({
        message: `chore(stratum): ${status} submission ${current.id}`,
        content: newContent,
        sha:     fileData.sha,
      }),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.json();
    throw new Error(err.message || 'GitHub update failed');
  }

  return { id: current.id, status };
}
