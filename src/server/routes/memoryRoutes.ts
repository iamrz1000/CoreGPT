import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';
import { db } from '../db.ts';

export const memoryRouter = Router();

// GET /api/memories - Query memories with optional project_id filtering
memoryRouter.get('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, globalOnly } = req.query;

    let memories;
    if (globalOnly === 'true') {
      memories = db.getMemories(req.user!.id, null);
    } else if (typeof projectId === 'string') {
      memories = db.getMemories(req.user!.id, projectId);
    } else {
      memories = db.getMemories(req.user!.id);
    }

    res.json(memories);
  } catch (err: any) {
    console.error('[Memory] Error fetching memories:', err);
    res.status(500).json({ error: 'Failed to retrieve memories.' });
  }
});

// POST /api/memories - Create a memory
memoryRouter.post('/', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key, value, category = 'fact', project_id = null, source = 'user' } = req.body;

    if (!key || typeof key !== 'string' || !key.trim()) {
      return res.status(400).json({ error: 'Memory key/topic is required.' });
    }
    if (!value || typeof value !== 'string' || !value.trim()) {
      return res.status(400).json({ error: 'Memory value/content is required.' });
    }

    const memory = db.createMemory(req.user!.id, {
      key: key.trim(),
      value: value.trim(),
      category,
      project_id: project_id || null,
      source,
    });

    res.status(201).json(memory);
  } catch (err: any) {
    console.error('[Memory] Error creating memory:', err);
    res.status(500).json({ error: 'Failed to create memory.' });
  }
});

// PATCH /api/memories/:id - Update an existing memory
memoryRouter.patch('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { key, value, category, project_id, source } = req.body;
    const updated = db.updateMemory(req.user!.id, req.params.id, {
      key,
      value,
      category,
      project_id,
      source,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Memory not found or access denied.' });
    }

    res.json(updated);
  } catch (err: any) {
    console.error('[Memory] Error updating memory:', err);
    res.status(500).json({ error: 'Failed to update memory.' });
  }
});

// DELETE /api/memories/:id - Delete a memory
memoryRouter.delete('/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const success = db.deleteMemory(req.user!.id, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Memory not found or access denied.' });
    }
    res.json({ success: true, message: 'Memory item deleted.' });
  } catch (err: any) {
    console.error('[Memory] Error deleting memory:', err);
    res.status(500).json({ error: 'Failed to delete memory.' });
  }
});

// POST /api/memories/clear - Clear memories (requires confirmation)
memoryRouter.post('/clear', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { projectId, confirmed } = req.body;
    if (!confirmed) {
      return res.status(400).json({
        error: 'Confirmation required to clear memory items.',
        requiresConfirmation: true,
      });
    }

    const count = db.clearMemories(req.user!.id, projectId !== undefined ? projectId : undefined);
    res.json({
      success: true,
      deletedCount: count,
      message: `Cleared ${count} memory item(s).`,
    });
  } catch (err: any) {
    console.error('[Memory] Error clearing memories:', err);
    res.status(500).json({ error: 'Failed to clear memories.' });
  }
});
