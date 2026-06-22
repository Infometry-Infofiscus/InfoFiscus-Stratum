/**
 * auth.routes.js
 * POST /api/auth/github/token  — exchange OAuth code for access token
 */
import { Router } from 'express';
import { exchangeToken } from '../controllers/auth.controller.js';

const router = Router();

router.post('/github/token', exchangeToken);

export default router;
