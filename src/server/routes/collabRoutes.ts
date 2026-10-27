import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth.ts';
import { db } from '../db.ts';

export const collabRouter = Router();

function getEffectiveUser(req: AuthenticatedRequest): { id: string; email: string; name: string } {
  const token =
    req.cookies?.nextgen_session ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (token) {
    const payload = verifyToken(token);
    if (payload?.userId) {
      const user = db.getUserById(payload.userId);
      if (user) {
        return { id: user.id, email: user.email, name: user.display_name };
      }
    }
  }
  return {
    id: req.user?.id || 'guest_user',
    email: req.user?.email || 'guest@example.com',
    name: req.user?.display_name || 'Guest User',
  };
}

// GET /api/collab/projects/:projectId/members - list project collaborators
collabRouter.get('/projects/:projectId/members', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getEffectiveUser(req);
    const { projectId } = req.params;

    const access = db.checkProjectAccess(user.id, user.email, projectId);
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'Access denied to this project.' });
    }

    const members = db.getCollabMembers(projectId);
    return res.json({ members, currentUserRole: access.role });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve members';
    return res.status(500).json({ error: message });
  }
});

// POST /api/collab/projects/:projectId/invite - invite collaborator
collabRouter.post('/projects/:projectId/invite', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getEffectiveUser(req);
    const { projectId } = req.params;
    const { email, role } = req.body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }

    const access = db.checkProjectAccess(user.id, user.email, projectId);
    if (!access.hasAccess || (access.role !== 'owner' && access.role !== 'editor')) {
      return res.status(403).json({ error: 'Only project owners and editors can invite collaborators.' });
    }

    const member = db.inviteCollabMember(user.id, projectId, email.trim(), role || 'editor');
    return res.status(201).json({ member });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to invite collaborator';
    return res.status(500).json({ error: message });
  }
});

// DELETE /api/collab/members/:memberId - remove collaborator
collabRouter.delete('/members/:memberId', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getEffectiveUser(req);
    const success = db.removeCollabMember(user.id, req.params.memberId);
    if (!success) {
      return res.status(404).json({ error: 'Collaborator not found.' });
    }
    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remove member';
    return res.status(500).json({ error: message });
  }
});

// GET /api/collab/projects/:projectId/comments - list project comments
collabRouter.get('/projects/:projectId/comments', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getEffectiveUser(req);
    const { projectId } = req.params;

    const access = db.checkProjectAccess(user.id, user.email, projectId);
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const comments = db.getProjectComments(projectId);
    return res.json({ comments });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve comments';
    return res.status(500).json({ error: message });
  }
});

// POST /api/collab/projects/:projectId/comments - add comment
collabRouter.post('/projects/:projectId/comments', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getEffectiveUser(req);
    const { projectId } = req.params;
    const { text, asset_id } = req.body;

    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    const access = db.checkProjectAccess(user.id, user.email, projectId);
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const comment = db.addProjectComment(projectId, user.id, user.name, text.trim(), asset_id);
    return res.status(201).json({ comment });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to post comment';
    return res.status(500).json({ error: message });
  }
});

// PUT /api/collab/projects/:projectId/comments/:commentId/resolve - resolve comment
collabRouter.put('/projects/:projectId/comments/:commentId/resolve', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = getEffectiveUser(req);
    const { projectId, commentId } = req.params;
    const { resolved = true } = req.body;

    const access = db.checkProjectAccess(user.id, user.email, projectId);
    if (!access.hasAccess) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const success = db.resolveProjectComment(projectId, commentId, Boolean(resolved));
    if (!success) {
      return res.status(404).json({ error: 'Comment not found.' });
    }
    return res.json({ success: true, resolved });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to resolve comment';
    return res.status(500).json({ error: message });
  }
});
