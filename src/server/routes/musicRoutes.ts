import { Router, Response } from 'express';
import { generateLyriaMusic, getTrackList } from '../musicService.ts';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';

export const musicRouter = Router();

// In-memory user daily music generations tracker
const userMusicUsage = new Map<string, { count: number; date: string }>();

musicRouter.get('/list', (req, res) => {
  const tracks = getTrackList();
  res.json({ tracks });
});

musicRouter.post('/generate', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user;
    const { prompt, duration = 'clip', genre = 'Cyberpunk Synthwave', imageAttachment } = req.body;

    if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
      res.status(400).json({ error: 'A music prompt or concept is required.' });
      return;
    }

    const isAdmin =
      user?.role === 'admin' ||
      user?.email === 'umarhani2000@gmail.com' ||
      user?.email === 'faqruddin00000@gmail.com';

    // Check quota for normal users
    const today = new Date().toISOString().slice(0, 10);
    const userId = user?.id || 'guest';
    const userStat = userMusicUsage.get(userId) || { count: 0, date: today };

    if (userStat.date !== today) {
      userStat.count = 0;
      userStat.date = today;
    }

    const musicLimit = 5;
    if (!isAdmin && userStat.count >= musicLimit) {
      res.status(429).json({
        error: `Daily music generation limit of ${musicLimit} tracks reached. Watch a sponsored ad to unlock more creations!`,
        requiresAd: true,
      });
      return;
    }

    const track = await generateLyriaMusic({
      prompt: prompt.trim(),
      duration: duration === 'pro' ? 'pro' : 'clip',
      genre,
      imageAttachment,
    });

    if (!isAdmin) {
      userStat.count += 1;
      userMusicUsage.set(userId, userStat);
    }

    res.json({
      track,
      remainingQuota: isAdmin ? 999999 : Math.max(0, musicLimit - userStat.count),
    });
  } catch (error: any) {
    console.error('[Music Generation Error]:', error);
    res.status(500).json({
      error: error?.message || 'Music generation encountered an unexpected error.',
    });
  }
});
