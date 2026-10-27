import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth.ts';
import { db } from '../db.ts';

export const shareRouter = Router();

function getEffectiveUserId(req: AuthenticatedRequest): string {
  const token =
    req.cookies?.nextgen_session ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (token) {
    const payload = verifyToken(token);
    if (payload?.userId) {
      return payload.userId;
    }
  }
  return req.user?.id || 'guest_user';
}

// POST /api/share - publish a target resource as a shareable link
shareRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const { target_type, target_id, title, description, public_data, visibility, allow_remix } = req.body;

    if (!target_type || !target_id || !title) {
      return res.status(400).json({ error: 'Target type, ID, and title are required.' });
    }

    // Sanitize public data (strip internal secrets, user emails, tokens)
    const sanitizedData = JSON.parse(JSON.stringify(public_data || {}));
    delete sanitizedData.user_id;
    delete sanitizedData.email;
    delete sanitizedData.token;

    const page = db.createSharedPage(userId, {
      target_type,
      target_id,
      title: title.trim(),
      description: description || '',
      public_data: sanitizedData,
      visibility: visibility || 'link',
      allow_remix: allow_remix !== undefined ? allow_remix : true,
    });

    return res.status(201).json({ page, shareUrl: `/shared/${page.id}` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create share page';
    return res.status(500).json({ error: message });
  }
});

// GET /api/share/my - list user's shared links
shareRouter.get('/my', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const pages = db.getUserSharedPages(userId);
    return res.json({ pages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve shared pages';
    return res.status(500).json({ error: message });
  }
});

// GET /api/share/:id - public access to shared page
shareRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = db.getSharedPage(req.params.id);
    if (!page) {
      return res.status(404).json({ error: 'Shared page not found or has expired.' });
    }
    return res.json({ page });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve shared page';
    return res.status(500).json({ error: message });
  }
});

// POST /api/share/:id/remix - clone shared resource into user workspace
shareRouter.post('/:id/remix', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const page = db.getSharedPage(req.params.id);

    if (!page) {
      return res.status(404).json({ error: 'Shared resource not found.' });
    }

    if (!page.allow_remix) {
      return res.status(403).json({ error: 'Remixing is disabled for this shared creation.' });
    }

    let clonedResource: any = null;

    if (page.target_type === 'project') {
      clonedResource = db.createProject(userId, {
        title: `${page.title} (Remix)`,
        description: page.description,
        category: page.public_data?.category || 'general',
      });
    } else if (page.target_type === 'workflow') {
      clonedResource = db.createWorkflow(userId, {
        name: `${page.title} (Remix)`,
        description: page.description,
        inputs: page.public_data?.inputs || [],
        steps: page.public_data?.steps || [],
      });
    } else if ((page.target_type as string) === 'mini_app' || (page.target_type as string) === 'miniapp') {
      clonedResource = db.createMiniApp(userId, {
        name: `${page.title} (Remix)`,
        description: page.description,
        inputs: page.public_data?.inputs || [],
        output_format: page.public_data?.output_format || 'markdown',
        instructions: page.public_data?.instructions || '',
        capabilities: page.public_data?.capabilities || ['text_generation'],
      });
    } else {
      clonedResource = { message: 'Asset remixed to your workspace', data: page.public_data };
    }

    return res.json({
      success: true,
      message: 'Successfully remixed to your workspace!',
      target_type: page.target_type,
      resource: clonedResource,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remix resource';
    return res.status(500).json({ error: message });
  }
});

// DELETE /api/share/:id - delete share link
shareRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const success = db.deleteSharedPage(userId, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Shared page not found or unauthorized.' });
    }
    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete shared page';
    return res.status(500).json({ error: message });
  }
});
