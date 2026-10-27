import { Router, Response } from 'express';
import { AuthenticatedRequest } from '../auth.ts';
import { getGeminiClient } from '../gemini.ts';

export const promptRouter = Router();

// POST /api/prompt/enhance - enhance prompt based on category
promptRouter.post('/enhance', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt, category = 'image' } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Original prompt is required.' });
    }

    const ai = getGeminiClient();

    let categoryInstructions = '';
    switch (category) {
      case 'image':
        categoryInstructions =
          'Optimize for photorealistic or artistic text-to-image synthesis (Nano Banana / Imagen 3). Add subject details, depth of field, 8K textures, dynamic lighting (e.g., volumetric rays, golden hour), camera lens (e.g. 85mm f/1.4), artistic style, and composition.';
        break;
      case 'video':
        categoryInstructions =
          'Optimize for cinematic text-to-video / image-to-video synthesis (Veo 2). Specify camera movement (pan, dolly, crane, tracking shot), motion dynamics, fps, lighting changes, atmosphere, and temporal cohesion.';
        break;
      case 'writing':
        categoryInstructions =
          'Optimize for captivating prose, essay, copy, or creative writing. Specify tone, voice, audience, depth, structure, rhetorical devices, and stylistic cadence.';
        break;
      case 'research':
        categoryInstructions =
          'Optimize for deep investigation, academic rigor, source verification, comparative analysis, counter-arguments, and empirical evidence gathering.';
        break;
      case 'coding':
        categoryInstructions =
          'Optimize for software engineering. Specify technical requirements, frameworks, architectural patterns, error handling, performance considerations, edge cases, and unit tests.';
        break;
      case 'business':
        categoryInstructions =
          'Optimize for executive leadership, marketing strategy, pitch decks, ROI calculations, and market positioning.';
      case 'education':
        categoryInstructions =
          'Optimize for pedagogical clarity, step-by-step scaffolding, real-world analogies, self-assessment questions, and conceptual retention.';
        break;
      default:
        categoryInstructions = 'Enhance clarity, specificity, and actionable detail while strictly preserving core user intent.';
    }

    const metaPrompt = `You are Hynex AI Expert Prompt Engineer.
Enhance the following prompt for the category: "${category}".
Category Specific Guidelines: ${categoryInstructions}

Original user prompt:
"${prompt.trim()}"

Respond strictly with valid JSON:
{
  "enhancedPrompt": "The expanded, precise, highly effective prompt",
  "highlights": ["Key improvement 1", "Key improvement 2", "Key improvement 3"],
  "category": "${category}"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: metaPrompt }] }],
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(
      response.text?.replace(/```json/g, '').replace(/```/g, '').trim() ||
        JSON.stringify({ enhancedPrompt: prompt, highlights: [], category })
    );

    return res.json({
      originalPrompt: prompt.trim(),
      enhancedPrompt: parsed.enhancedPrompt || prompt,
      highlights: parsed.highlights || [],
      category: parsed.category || category,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Prompt enhancement failed';
    return res.status(500).json({ error: message });
  }
});
