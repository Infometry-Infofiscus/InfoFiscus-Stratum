/**
 * auth.controller.js
 * Handles the OAuth code → token exchange endpoint.
 */
import { exchangeOAuthCode } from '../services/github.service.js';

export async function exchangeToken(req, res) {
  const { code } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    const access_token = await exchangeOAuthCode(code);
    return res.json({ access_token });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
}
