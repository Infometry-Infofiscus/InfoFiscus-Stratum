/**
 * Cloudflare Worker: GitHub submission proxy (keeps PAT off the static site).
 *
 * Wrangler secrets:
 *   wrangler secret put GITHUB_TOKEN
 *
 * Vars (wrangler.toml [vars]):
 *   ALLOWED_ORIGINS = "https://YOURNAME.github.io,http://localhost:3000"
 *
 * POST JSON:
 * {
 *   "owner", "repo", "branch", "path", "message", "content" (base64),
 *   "pendingPrefix": "submissions/pending",
 *   "fingerprintPrefix32": "hex..."
 * }
 */

const GH_API = "https://api.github.com";
const API_VER = "2022-11-28";

function encodePath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map((s) => encodeURIComponent(s))
    .join("/");
}

function corsHeaders(env, req) {
  const origin = req.headers.get("Origin") || "";
  const allowed = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const ok = allowed.some((o) => origin === o || (o.endsWith("/") && origin.startsWith(o)));
  const allowOrigin = ok ? origin : allowed[0] || "*";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

async function githubFetch(token, url, init = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": API_VER,
    // GitHub REST API rejects requests without a proper User-Agent (403).
    "User-Agent": "text2sql-github-submit-proxy/1.0 (+https://github.com/Infometry-Infofiscus/InfoFiscus-Stratum)",
    ...(init.headers || {}),
  };
  return fetch(url, { ...init, headers });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env, request) });
    }
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: corsHeaders(env, request),
      });
    }

    const origin = request.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const originOk = allowed.some((o) => origin === o || origin.startsWith(o));
    if (!originOk) {
      return new Response("Forbidden origin", { status: 403, headers: corsHeaders(env, request) });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Invalid JSON", { status: 400, headers: corsHeaders(env, request) });
    }

    const {
      owner,
      repo,
      branch,
      path,
      message,
      content,
      pendingPrefix,
      fingerprintPrefix32,
    } = body;
    if (!owner || !repo || !branch || !path || !message || !content) {
      return new Response("Missing required fields", {
        status: 400,
        headers: corsHeaders(env, request),
      });
    }

    const token = env.GITHUB_TOKEN;
    if (!token) {
      return new Response("Server misconfigured", {
        status: 500,
        headers: corsHeaders(env, request),
      });
    }

    if (pendingPrefix && fingerprintPrefix32) {
      const encPrefix = encodePath(pendingPrefix);
      const listUrl = `${GH_API}/repos/${owner}/${repo}/contents/${encPrefix}?ref=${encodeURIComponent(branch)}`;
      const listRes = await githubFetch(token, listUrl);
      if (listRes.ok) {
        const items = await listRes.json();
        if (Array.isArray(items)) {
          const needle = `fp-${String(fingerprintPrefix32).slice(0, 32)}`;
          const clash = items.some(
            (it) =>
              it.type === "file" &&
              typeof it.name === "string" &&
              it.name.endsWith(".json") &&
              it.name.includes(needle),
          );
          if (clash) {
            return new Response(
              JSON.stringify({ error: "Duplicate submission (same content fingerprint)." }),
              {
                status: 409,
                headers: { ...corsHeaders(env, request), "Content-Type": "application/json" },
              },
            );
          }
        }
      }
    }

    const encPath = encodePath(path);
    const putUrl = `${GH_API}/repos/${owner}/${repo}/contents/${encPath}`;
    const putRes = await githubFetch(token, putUrl, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, content, branch }),
    });
    const text = await putRes.text();
    return new Response(text, {
      status: putRes.status,
      headers: { ...corsHeaders(env, request), "Content-Type": "application/json" },
    });
  },
};
