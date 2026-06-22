/**
 * routes/index.js — combines all route modules under /api
 */
import { Router } from 'express';
import authRoutes from './auth.routes.js';
import submissionsRoutes from './submissions.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/submissions', submissionsRoutes);

export default router;
