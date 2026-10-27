import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth.ts';
import { db } from '../db.ts';

export const templateRouter = Router();

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

// GET /api/templates - list community templates with search and category filter
templateRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const templates = db.getCommunityTemplates(category, search);
    return res.json({ templates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve templates';
    return res.status(500).json({ error: message });
  }
});

// GET /api/templates/:id - get template details
templateRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const template = db.getCommunityTemplate(req.params.id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found.' });
    }
    return res.json({ template });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve template';
    return res.status(500).json({ error: message });
  }
});

// POST /api/templates/:id/clone - clone template into user workspace
templateRouter.post('/:id/clone', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const template = db.getCommunityTemplate(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found.' });
    }

    db.incrementTemplateClone(template.id);

    let createdEntity: any = null;

    if (template.type === 'project') {
      createdEntity = db.createProject(userId, {
        title: `${template.title}`,
        description: template.description,
        category: (template.category.toLowerCase().includes('video') ? 'short_video' : 'general') as any,
      });

      // If template contains deliverables or workflow instructions, seed them
      if (template.template_data?.instructions) {
        db.updateProject(userId, createdEntity.id, {
          instructions: template.template_data.instructions,
        });
      }
    } else if (template.type === 'workflow') {
      createdEntity = db.createWorkflow(userId, {
        name: template.title,
        description: template.description,
        inputs: template.template_data?.inputs || [],
        steps: template.template_data?.steps || [],
      });
    } else if (template.type === 'mini_app') {
      createdEntity = db.createMiniApp(userId, {
        name: template.title,
        description: template.description,
        inputs: template.template_data?.inputs || [],
        output_format: template.template_data?.output_format || 'markdown',
        instructions: template.template_data?.instructions || '',
        capabilities: template.template_data?.capabilities || ['text_generation'],
      });
    }

    return res.json({
      success: true,
      message: `Template "${template.title}" successfully cloned into your workspace!`,
      type: template.type,
      entity: createdEntity,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to clone template';
    return res.status(500).json({ error: message });
  }
});
