import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth.ts';
import { db } from '../db.ts';
import { getGeminiClient } from '../gemini.ts';

export const miniAppRouter = Router();

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

// GET /api/miniapps - list mini apps
miniAppRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const publishedOnly = req.query.published === 'true';
    const miniApps = db.getMiniApps(userId, publishedOnly);
    return res.json({ miniApps });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve mini apps';
    return res.status(500).json({ error: message });
  }
});

// GET /api/miniapps/:id - get mini app details
miniAppRouter.get('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const miniApp = db.getMiniApp(req.params.id);
    if (!miniApp) {
      return res.status(404).json({ error: 'Mini app not found.' });
    }
    return res.json({ miniApp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve mini app';
    return res.status(500).json({ error: message });
  }
});

// POST /api/miniapps - create mini app
miniAppRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const { name, description, inputs, output_format, instructions, capabilities, is_published } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Mini app name is required.' });
    }

    const miniApp = db.createMiniApp(userId, {
      name: name.trim(),
      description: description || '',
      inputs: Array.isArray(inputs) ? inputs : [],
      output_format: output_format || 'markdown',
      instructions: instructions || 'Help the user achieve their task based on provided inputs.',
      capabilities: Array.isArray(capabilities) ? capabilities : ['text_generation'],
      is_published: Boolean(is_published),
    });

    return res.status(201).json({ miniApp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create mini app';
    return res.status(500).json({ error: message });
  }
});

// PUT /api/miniapps/:id - update mini app
miniAppRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const miniApp = db.updateMiniApp(userId, req.params.id, req.body);
    if (!miniApp) {
      return res.status(404).json({ error: 'Mini app not found or unauthorized.' });
    }
    return res.json({ miniApp });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update mini app';
    return res.status(500).json({ error: message });
  }
});

// DELETE /api/miniapps/:id - delete mini app
miniAppRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const success = db.deleteMiniApp(userId, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Mini app not found or unauthorized.' });
    }
    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete mini app';
    return res.status(500).json({ error: message });
  }
});

// POST /api/miniapps/:id/run - execute mini app
miniAppRouter.post('/:id/run', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const miniApp = db.getMiniApp(req.params.id);
    if (!miniApp) {
      return res.status(404).json({ error: 'Mini app not found.' });
    }

    const userInputs = req.body.inputs || {};
    const ai = getGeminiClient();

    let inputSummary = Object.entries(userInputs)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n');

    const prompt = `You are running the Hynex Mini-App: "${miniApp.name}".
Description: ${miniApp.description}
Instructions: ${miniApp.instructions}
Required Output Format: ${miniApp.output_format}

User Inputs:
${inputSummary}

Execute the application logic faithfully and generate the output now.`;

    const config: any = {};
    if (miniApp.capabilities?.includes('search_grounding')) {
      config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: Object.keys(config).length > 0 ? config : undefined,
    });

    // Increment run count
    db.incrementMiniAppRun(miniApp.id);

    return res.json({
      success: true,
      result: response.text || '',
      mini_app_id: miniApp.id,
      output_format: miniApp.output_format,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Mini app execution failed';
    return res.status(500).json({ error: message });
  }
});
