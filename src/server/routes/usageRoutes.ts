import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAuth } from '../auth.ts';
import { db } from '../db.ts';

export const usageRouter = Router();

usageRouter.use(requireAuth);

// GET /api/usage
usageRouter.get('/', (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const usage = db.getUsageToday(user.id);

    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    const defaultTextQuota = parseInt(db.getSetting('default_user_daily_quota', '20'), 10) || 20;
    const defaultImageQuota = parseInt(db.getSetting('default_image_daily_quota', '5'), 10) || 5;

    const textLimit =
      user.role === 'admin'
        ? 999999
        : (typeof user.daily_quota_override === 'number'
        ? user.daily_quota_override
        : defaultTextQuota) + (usage.bonus_text_credits || 0);

    const imageLimit = user.role === 'admin' ? 999999 : defaultImageQuota + (usage.bonus_image_credits || 0);

    const textRemaining = Math.max(0, textLimit - usage.text_count);
    const imageRemaining = Math.max(0, imageLimit - usage.image_count);

    return res.json({
      role: user.role,
      isAdmin: user.role === 'admin',
      date: usage.date,
      textCount: usage.text_count,
      textLimit,
      textRemaining,
      bonusTextCredits: usage.bonus_text_credits || 0,
      imageCount: usage.image_count,
      imageLimit,
      imageRemaining,
      bonusImageCredits: usage.bonus_image_credits || 0,
      resetsAt: midnight.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch usage';
    return res.status(500).json({ error: message });
  }
});
