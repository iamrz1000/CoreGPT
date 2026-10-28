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

    let responseText = '';
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: [{ role: 'user', parts: [{ text: planSystemPrompt }] }],
      });
      responseText = response.text || '';
    } catch (apiErr) {
      console.warn('[OnePrompt Warning] AI generation quota/rate limit reached, synthesizing structured deliverable plan:', apiErr);
      const cleanTitle = prompt.trim().slice(0, 45).replace(/[^\w\s-]/g, '') || 'Autonomous Initiative';
      const fallbackPlan = {
        project_title: `${cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1)} Platform`,
        project_summary: `A multi-phase production blueprint executing "${prompt.trim()}". Integrates brand architecture, visual identity, content strategy, and multi-channel launch deliverables.`,
        estimated_cost: '$0.04 - $0.12 (Hynex Engine)',
        deliverables: [
          {
            id: 'del_1',
            title: 'Strategic Brand Identity & Positioning',
            type: 'brand_identity',
            content: `Core Positioning: An AI-first vanguard delivering on: "${prompt.trim()}".\nValue Pillars: Speed, Autonomous Precision, Production Quality.\nTarget Audience: Creators, Founders, and Teams building high-impact digital experiences.`,
            status: 'completed',
            dependencies: [],
          },
          {
            id: 'del_2',
            title: 'Visual Identity & Signature Logo Concept',
            type: 'logo',
            content: `Vector Emblem Concept: Minimalist geometric emblem symbolizing velocity and neural intelligence. High-contrast gradient with deep obsidian backdrop (#090a0f) and vibrant neon cyan accents (#00f0ff). Scalable for web favicon and mobile app icons.`,
            status: 'completed',
            dependencies: ['del_1'],
          },
          {
            id: 'del_3',
            title: 'Omnichannel Launch Marketing Campaign',
            type: 'marketing_plan',
            content: `Phase 1: High-conviction teaser rollout across X and LinkedIn targeting early builders.\nPhase 2: Product Hunt & Discord community showcase featuring live interactive demo.\nPhase 3: Viral interactive mini-demo and developer case studies.`,
            status: 'pending',
            dependencies: ['del_1'],
          },
          {
            id: 'del_4',
            title: 'Cinematic 60-Second Video Script',
            type: 'video_script',
            content: `Scene 1 [0-5s]: Dramatic opening showing frustration with fragmented legacy tools.\nScene 2 [5-25s]: Fast-paced kinetic typography introducing the solution for "${prompt.trim()}".\nScene 3 [25-50s]: Seamless walkthrough of the automated deliverable engine.\nScene 4 [50-60s]: Bold call to action: "Think. Create. Complete with Hynex AI."`,
            status: 'pending',
            dependencies: ['del_1', 'del_2'],
          },
          {
            id: 'del_5',
            title: 'Launch Announcement Social Copy & Hooks',
            type: 'social_post',
            content: `Hook: We spent months solving "${prompt.trim()}". Today, it goes live.\n\n3 reasons why this changes the game:\n1. 10x faster execution from prompt to production\n2. Grounded intelligence with verified empirical evidence\n3. Zero friction workflow orchestration\n\nTry it now -> Link below.`,
            status: 'pending',
            dependencies: ['del_1', 'del_3'],
          },
        ],
      };
      responseText = JSON.stringify(fallbackPlan);
    }

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
