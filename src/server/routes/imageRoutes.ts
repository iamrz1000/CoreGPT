import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';
import { db } from '../db.ts';
import { generateGeminiImage, enhanceImagePrompt, editGeminiImage } from '../gemini.ts';

export const imageRouter = Router();

imageRouter.use(requireAuth);

// GET /api/images
imageRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const images = db.listGeneratedImages(userId);
    return res.json({ images });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list images';
    return res.status(500).json({ error: message });
  }
});

// POST /api/images/enhance-prompt
imageRouter.post('/enhance-prompt', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { prompt, style } = req.body;
    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required for enhancement.' });
    }

    const enhancedPrompt = await enhanceImagePrompt(prompt.trim(), style);
    return res.json({ enhancedPrompt });
  } catch (err: unknown) {
    console.error('Enhance prompt error:', err);
    const message = err instanceof Error ? err.message : 'Failed to enhance prompt';
    return res.status(500).json({ error: message });
  }
});

// POST /api/images/generate
imageRouter.post('/generate', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const {
      prompt,
      aspectRatio = '1:1',
      conversationId,
      autoEnhance = true,
      style,
      model,
      upscale = true,
      imageSize = '2K',
    } = req.body;

    const isEnabled = db.getSetting('image_generation_enabled', 'true') === 'true';
    if (!isEnabled && user.role !== 'admin') {
      return res.status(403).json({
        error: 'Image generation feature is currently disabled by the administrator.',
      });
    }

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({ error: 'Image prompt is required.' });
    }

    // Atomic quota check
    const quota = db.checkAndIncrementQuota(user.id, 'image');
    if (!quota.allowed) {
      return res.status(429).json({
        error: `You've reached your daily image generation limit (${quota.limit} images). Your quota resets at midnight.`,
        limit: quota.limit,
        resetsAt: quota.resetsAt,
      });
    }

    const result = await generateGeminiImage(prompt.trim(), aspectRatio, {
      autoEnhance,
      style,
      model,
      upscale: Boolean(upscale),
      imageSize: (imageSize === '4K' || imageSize === '2K' || imageSize === '1K') ? imageSize : (upscale ? '2K' : '1K'),
    });

    const savedImage = db.saveGeneratedImage(
      user.id,
      result.finalPrompt,
      aspectRatio,
      result.imageUrl,
      result.model,
      conversationId
    );

    // If a conversationId was attached, also append an assistant message with this image
    if (conversationId) {
      const conv = db.getConversation(conversationId, user.id);
      if (conv) {
        db.addMessage(
          conversationId,
          'assistant',
          `Generated image for prompt: "${result.finalPrompt}"`,
          result.model,
          result.imageUrl
        );
      }
    }

    return res.status(201).json({
      image: savedImage,
      remainingQuota: quota.remaining,
      finalPrompt: result.finalPrompt,
      originalPrompt: result.originalPrompt,
      wasEnhanced: result.wasEnhanced,
      imageSize: result.imageSize,
      upscale: result.upscale,
    });
  } catch (err: unknown) {
    console.error('Image generation error:', err);
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to generate image. Please verify your prompt and model configuration.';
    return res.status(500).json({ error: message });
  }
});

// POST /api/images/edit (using gemini-nano-banana-2.1)
imageRouter.post('/edit', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { prompt, base64Image, mimeType = 'image/png', aspectRatio = '1:1', conversationId } = req.body;

    if (!prompt || !base64Image) {
      return res.status(400).json({ error: 'Both image and editing prompt are required.' });
    }

    const result = await editGeminiImage(prompt.trim(), base64Image, mimeType, aspectRatio);

    const savedImage = db.saveGeneratedImage(
      user.id,
      `[Edited] ${result.finalPrompt}`,
      aspectRatio,
      result.imageUrl,
      'gemini-nano-banana-2.1',
      conversationId
    );

    return res.status(201).json({
      image: savedImage,
      finalPrompt: result.finalPrompt,
      originalPrompt: result.originalPrompt,
    });
  } catch (err: unknown) {
    console.error('Image edit error:', err);
    const message = err instanceof Error ? err.message : 'Failed to edit image';
    return res.status(500).json({ error: message });
  }
});

