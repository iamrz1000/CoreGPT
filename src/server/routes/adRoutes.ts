import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';
import { db } from '../db.ts';

export const adRouter = Router();

// Unity Ads configuration
const UNITY_ADS_CONFIG = {
  enabled: true,
  gameId: '800411610',
  placementId: '800411610',
  rewardAmount: 2,
  provider: 'Unity Ads',
};

// GET /api/ads/config (Public ad configuration)
adRouter.get('/config', (_req, res: Response) => {
  return res.json(UNITY_ADS_CONFIG);
});

// All reward endpoints require an authenticated user
adRouter.use(requireAuth);

// POST /api/ads/reward
// Grants 2 bonus credits after a normal user successfully views a Unity Ad
adRouter.post('/reward', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { rewardType = 'text' } = req.body;

    // Normal users only: Admin already has unlimited access
    if (user.role === 'admin') {
      return res.json({
        success: true,
        isAdmin: true,
        creditsGranted: 0,
        message: 'Admin accounts possess unlimited clearance and are exempt from ads and limits.',
      });
    }

    const validTypes = ['text', 'image', 'video', 'text_to_video', 'image_to_video'];
    const chosenType = validTypes.includes(rewardType) ? rewardType : 'text';

    const result = db.grantAdRewardCredits(user.id, chosenType as any, 2);

    // Fetch updated usage states to return directly to caller
    const generalUsage = db.getUsageToday(user.id);
    const videoUsage = db.getVideoUsage(user.id);

    return res.json({
      success: true,
      isAdmin: false,
      gameId: UNITY_ADS_CONFIG.gameId,
      rewardType: chosenType,
      creditsGranted: 2,
      result,
      videoUsage,
      generalUsage: {
        textCount: generalUsage.text_count,
        bonusTextCredits: generalUsage.bonus_text_credits || 0,
        imageCount: generalUsage.image_count,
        bonusImageCredits: generalUsage.bonus_image_credits || 0,
      },
      message: `🎉 Success! 2 ${chosenType} credits have been added to your daily quota.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to process ad reward';
    return res.status(500).json({ error: message });
  }
});
