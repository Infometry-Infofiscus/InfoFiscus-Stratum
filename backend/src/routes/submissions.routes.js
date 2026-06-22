/**
 * submissions.routes.js
 * POST   /api/submissions          — create a new submission
 * GET    /api/submissions          — list submissions (optional ?status= &author=)
 * POST   /api/submissions/update   — approve/reject (admin)
 */
import { Router } from 'express';
import {
  createSubmission,
  listSubmissions,
  updateSubmission,
} from '../controllers/submissions.controller.js';

const router = Router();

router.post('/',       createSubmission);
router.get('/',        listSubmissions);
router.post('/update', updateSubmission);

export default router;
