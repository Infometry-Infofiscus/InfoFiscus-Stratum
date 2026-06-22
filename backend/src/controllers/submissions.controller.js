/**
 * submissions.controller.js
 * Handles create / list / update for KPI submissions.
 */
import {
  createSubmissionFile,
  listSubmissionFiles,
  updateSubmissionStatus,
} from '../services/github.service.js';

export async function createSubmission(req, res) {
  const { formData, author } = req.body || {};
  if (!formData) return res.status(400).json({ error: 'Missing formData' });

  try {
    const result = await createSubmissionFile(formData, author);
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function listSubmissions(req, res) {
  const { status, author } = req.query;
  try {
    const submissions = await listSubmissionFiles({ status, author });
    return res.json(submissions);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function updateSubmission(req, res) {
  const { filename, status } = req.body || {};
  if (!filename || !status) return res.status(400).json({ error: 'Missing filename or status' });
  if (!['approved', 'rejected', 'pending'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    const result = await updateSubmissionStatus(filename, status);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
