import { Router, Response } from 'express';
import { AuthenticatedRequest, verifyToken } from '../auth.ts';
import { db } from '../db.ts';
import { getGeminiClient } from '../gemini.ts';

export const creatorDnaRouter = Router();

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

// GET /api/creator-dna - list all Creator DNA profiles
creatorDnaRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const profiles = db.getCreatorDNAs(userId);
    return res.json({ profiles });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve Creator DNA profiles';
    return res.status(500).json({ error: message });
  }
});

// GET /api/creator-dna/default - get active default profile
creatorDnaRouter.get('/default', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const profile = db.getDefaultCreatorDNA(userId);
    return res.json({ profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve default profile';
    return res.status(500).json({ error: message });
  }
});

// POST /api/creator-dna - create new profile
creatorDnaRouter.post('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const {
      name,
      niche,
      target_audience,
      language,
      writing_style,
      visual_style,
      brand_colors,
      typography,
      aspect_ratio,
      caption_preferences,
      character_refs,
      is_default,
    } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Profile name is required.' });
    }

    const profile = db.createCreatorDNA(userId, {
      name: name.trim(),
      niche: niche || 'General',
      target_audience: target_audience || 'Global Audience',
      language: language || 'en',
      writing_style: writing_style || 'Professional and engaging',
      visual_style: visual_style || 'Cinematic, high contrast, crisp details',
      brand_colors: Array.isArray(brand_colors) ? brand_colors : ['#3b82f6', '#10b981'],
      typography: typography || 'Modern Sans-Serif',
      aspect_ratio: aspect_ratio || '16:9',
      caption_preferences: caption_preferences || 'Minimalist bold subtitles',
      character_refs: Array.isArray(character_refs) ? character_refs : [],
      is_default: Boolean(is_default),
    });

    return res.status(201).json({ profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create Creator DNA profile';
    return res.status(500).json({ error: message });
  }
});

// PUT /api/creator-dna/:id - update profile
creatorDnaRouter.put('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const profile = db.updateCreatorDNA(userId, req.params.id, req.body);
    if (!profile) {
      return res.status(404).json({ error: 'Creator DNA profile not found.' });
    }
    return res.json({ profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update Creator DNA profile';
    return res.status(500).json({ error: message });
  }
});

// DELETE /api/creator-dna/:id - delete profile
creatorDnaRouter.delete('/:id', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const success = db.deleteCreatorDNA(userId, req.params.id);
    if (!success) {
      return res.status(404).json({ error: 'Creator DNA profile not found.' });
    }
    return res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete Creator DNA profile';
    return res.status(500).json({ error: message });
  }
});

// POST /api/creator-dna/check-style - review draft content against DNA profile
creatorDnaRouter.post('/check-style', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = getEffectiveUserId(req);
    const { profile_id, content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required for style review.' });
    }

    const profiles = db.getCreatorDNAs(userId);
    const profile = profile_id
      ? profiles.find((p) => p.id === profile_id)
      : db.getDefaultCreatorDNA(userId) || profiles[0];

    if (!profile) {
      return res.status(400).json({ error: 'No Creator DNA profile found to check against.' });
    }

    const ai = getGeminiClient();
    const prompt = `You are Hynex Brand & Style Consistency Auditor.
Review the following draft content against the brand's Creator DNA.

Creator DNA:
- Name: ${profile.name}
- Niche: ${profile.niche}
- Target Audience: ${profile.target_audience}
- Preferred Tone/Writing Style: ${profile.writing_style}
- Visual Style / Aesthetics: ${profile.visual_style}
- Typography & Layout: ${profile.typography}
- Preferred Aspect Ratio: ${profile.aspect_ratio}

Draft Content:
"""${content.trim().slice(0, 3000)}"""

Evaluate consistency and output STRICT JSON:
{
  "compliance_score": 88, // 0 to 100
  "tone_aligned": true,
  "visual_aligned": true,
  "strengths": ["Clear hooks", "Consistent tone"],
  "conflicts": ["Overly formal opening phrase", "Lacks the punchy short sentence structure"],
  "recommended_rewrites": ["Here is a rewritten version adhering strictly to Creator DNA..."]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    let result = {
      compliance_score: 85,
      tone_aligned: true,
      visual_aligned: true,
      strengths: ['Relevant to audience'],
      conflicts: [],
      recommended_rewrites: [response.text || ''],
    };

    try {
      const clean = (response.text || '').replace(/```json\n?|\n?```/g, '').trim();
      result = JSON.parse(clean);
    } catch {}

    return res.json({ success: true, result, profile });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Style check failed';
    return res.status(500).json({ error: message });
  }
});
