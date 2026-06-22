/**
 * env.js — loads and validates environment variables.
 */
import dotenv from 'dotenv';
dotenv.config();

export const env = {
  port:        process.env.PORT || 4000,
  nodeEnv:     process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  githubClientId:     process.env.GITHUB_CLIENT_ID,
  githubClientSecret: process.env.GITHUB_CLIENT_SECRET,
  githubPat:          process.env.GITHUB_PAT,

  githubRepoOwner: process.env.GITHUB_REPO_OWNER,
  githubRepoName:  process.env.GITHUB_REPO_NAME,
  githubDataPath:  process.env.GITHUB_DATA_PATH || 'data/submissions',

  adminGithubLogin: process.env.ADMIN_GITHUB_LOGIN,
};

/** Throws at boot if critical vars are missing — fail fast, not on first request. */
export function assertEnv() {
  const required = ['githubPat', 'githubRepoOwner', 'githubRepoName'];
  const missing = required.filter((k) => !env[k]);
  if (missing.length) {
    console.warn(`⚠️  Missing env vars: ${missing.join(', ')} — submissions API will fail until set.`);
  }
}
