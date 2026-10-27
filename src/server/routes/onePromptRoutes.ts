import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth.ts';
import { db } from '../db.ts';
import { getGeminiClient } from '../gemini.ts';
import { ProjectDeliverable } from '../../types/index.ts';

export const onePromptRouter = Router();

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

// POST /api/one-prompt/plan - generate structured deliverable plan from an objective
onePromptRouter.post('/plan', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const { prompt, projectId } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Objective prompt is required.' });
    }

    const ai = getGeminiClient();

    const planSystemPrompt = `You are Hynex One-Prompt Universe Engine.
Convert the user's high-level objective into a structured, production-ready project plan with discrete deliverables and inter-deliverable dependencies.

Objective:
"${prompt.trim()}"

Requirements:
1. Generate between 4 and 6 structured deliverables:
   - brand_identity
   - logo (visual prompt)
   - marketing_plan
   - video_script
   - social_post
   - web_copy
2. Clearly define dependencies (e.g., logo and video_script depend on brand_identity).
3. Provide initial drafted content for the first 2 key deliverables right away.
4. Provide estimated tool requirements and pricing guidance.
5. Provide output strictly in JSON format matching this schema:
{
  "project_title": "Concise Project Title",
  "project_summary": "1-2 sentence executive summary",
  "estimated_cost": "$0.02 - $0.15 (Gemini Flash & Imagen)",
  "deliverables": [
    {
      "id": "del_1",
      "title": "Brand Identity & Positioning",
      "type": "brand_identity",
      "content": "Full drafted brand positioning...",
      "status": "completed",
      "dependencies": []
    },
    {
      "id": "del_2",
      "title": "Signature Logo Concept",
      "type": "logo",
      "content": "Minimalist vector emblem depicting...",
      "status": "waiting_approval",
      "dependencies": ["del_1"]
    },
    {
      "id": "del_3",
      "title": "Launch Marketing Plan",
      "type": "marketing_plan",
      "content": "3-phase rollout roadmap...",
      "status": "pending",
      "dependencies": ["del_1"]
    },
    {
      "id": "del_4",
      "title": "60-Second Video Commercial Script",
      "type": "video_script",
      "content": "Scene 1: [Visual Hook] ...",
      "status": "pending",
      "dependencies": ["del_1", "del_2"]
    }
  ]
}

DO NOT output conversational preamble or markdown code blocks outside JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: planSystemPrompt }] }],
    });

    const responseText = response.text || '';
    let parsed: any = null;

    try {
      const clean = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = {
        project_title: prompt.slice(0, 40),
        project_summary: 'Comprehensive multi-stage project roadmap.',
        estimated_cost: '$0.05',
        deliverables: [
          {
            id: 'del_1',
            title: 'Concept & Positioning',
            type: 'brand_identity',
            content: responseText.slice(0, 500),
            status: 'completed',
            dependencies: [],
          },
        ],
      };
    }

    // If projectId is provided, save deliverables directly to project
    let project = null;
    if (projectId) {
      project = db.getProject(userId, projectId);
      if (project) {
        const deliverables: ProjectDeliverable[] = (parsed.deliverables || []).map((d: any) => ({
          id: d.id || `del_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          title: d.title || 'Deliverable',
          type: d.type || 'brand_identity',
          content: d.content || '',
          status: d.status || 'pending',
          dependencies: d.dependencies || [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));

        db.updateProject(userId, project.id, {
          deliverables,
        });
        db.logProjectActivity(project.id, userId, 'one_prompt_plan', `Generated ${deliverables.length} deliverables from objective.`);
      }
    }

    return res.json({
      success: true,
      plan: parsed,
      project_id: projectId || null,
    });
  } catch (err: unknown) {
    console.error('[OnePrompt Error]:', err);
    const message = err instanceof Error ? err.message : 'Plan generation failed';
    return res.status(500).json({ error: message });
  }
});
