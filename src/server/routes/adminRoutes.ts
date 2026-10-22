import { Router, Response } from 'express';
import { AuthenticatedRequest, requireAdmin } from '../auth.ts';
import { db } from '../db.ts';

export const adminRouter = Router();

// GET /api/admin/overview
adminRouter.get('/overview', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = db.getOverviewStats();
    return res.json(stats);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch admin overview';
    return res.status(500).json({ error: message });
  }
});

// GET /api/admin/users
adminRouter.get('/users', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = parseInt(req.query.offset as string, 10) || 0;

    const data = db.listUsers(search, limit, offset);
    return res.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to list users';
    return res.status(500).json({ error: message });
  }
});

// PATCH /api/admin/users/:id
adminRouter.patch('/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { id } = req.params;
    const { status, role, dailyQuotaOverride } = req.body;

    const targetUser = db.getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const updates: Record<string, unknown> = {};

    if (status === 'active' || status === 'suspended') {
      updates.status = status;
    }

    if (role === 'admin' || role === 'user') {
      // Prevent self-demotion if you're the only admin
      if (role === 'user' && targetUser.id === admin.id) {
        return res.status(400).json({ error: 'You cannot revoke your own administrator privileges.' });
      }
      updates.role = role;
    }

    if (dailyQuotaOverride !== undefined) {
      if (dailyQuotaOverride === null || dailyQuotaOverride === '') {
        updates.daily_quota_override = null;
      } else {
        const val = parseInt(dailyQuotaOverride, 10);
        if (!isNaN(val) && val >= 0) {
          updates.daily_quota_override = val;
        }
      }
    }

    const updated = db.updateUser(id, updates);

    db.logAdminAction(
      admin.email,
      'USER_UPDATED',
      `Updated user ${targetUser.email}: ${JSON.stringify(updates)}`,
      admin.id,
      req.ip
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...safeUser } = updated;
    return res.json({ user: safeUser });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update user';
    return res.status(500).json({ error: message });
  }
});

// DELETE /api/admin/users/:id
adminRouter.delete('/users/:id', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { id } = req.params;

    const targetUser = db.getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Protect against self-deletion
    if (targetUser.id === admin.id) {
      return res.status(400).json({ error: 'You cannot delete your own administrator account.' });
    }

    const success = db.deleteUser(id);
    if (!success) {
      return res.status(500).json({ error: 'Failed to delete user account.' });
    }

    db.logAdminAction(
      admin.email,
      'USER_DELETED',
      `Permanently deleted user account ${targetUser.email} (Name: ${targetUser.display_name}) along with all chat history and data.`,
      admin.id,
      req.ip
    );

    return res.json({ message: `User ${targetUser.email} has been permanently deleted.` });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete user';
    return res.status(500).json({ error: message });
  }
});

// GET /api/admin/users/:id/history
adminRouter.get('/users/:id/history', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const targetUser = db.getUserById(id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const history = db.getUserHistory(id);
    return res.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        displayName: targetUser.display_name,
        role: targetUser.role,
        status: targetUser.status,
      },
      ...history,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve user history';
    return res.status(500).json({ error: message });
  }
});

// GET /api/admin/settings
adminRouter.get('/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const settings = db.getAllSettings();
    return res.json({ settings });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch settings';
    return res.status(500).json({ error: message });
  }
});

// PATCH /api/admin/settings
adminRouter.patch('/settings', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const admin = req.user!;
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Invalid settings payload.' });
    }

    for (const [key, val] of Object.entries(settings)) {
      if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
        db.setSetting(key, String(val));
      }
    }

    db.logAdminAction(
      admin.email,
      'SETTINGS_UPDATED',
      `Updated settings: ${Object.keys(settings).join(', ')}`,
      admin.id,
      req.ip
    );

    return res.json({
      message: 'Settings updated successfully',
      settings: db.getAllSettings(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update settings';
    return res.status(500).json({ error: message });
  }
});

// GET /api/admin/audit-logs
adminRouter.get('/audit-logs', requireAdmin, (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string, 10) || 100;
    const logs = db.getAdminAuditLogs(limit);
    return res.json({ logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch audit logs';
    return res.status(500).json({ error: message });
  }
});

// POST /api/admin/setup (One-time setup using ADMIN_SETUP_SECRET)
adminRouter.post('/setup', (req, res: Response) => {
  try {
    const { setupSecret, email } = req.body;
    const expectedSecret = process.env.ADMIN_SETUP_SECRET || 'nextgen-admin-setup-secret-key-2025';

    if (!setupSecret || setupSecret !== expectedSecret) {
      return res.status(403).json({ error: 'Invalid admin setup secret.' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Target user email is required.' });
    }

    const user = db.getUserByEmail(email.trim().toLowerCase());
    if (!user) {
      return res.status(404).json({ error: 'User with provided email does not exist.' });
    }

    db.updateUser(user.id, { role: 'admin' });
    db.logAdminAction(
      email,
      'ADMIN_ONE_TIME_SETUP',
      `User ${user.email} promoted to admin via setup secret`,
      user.id,
      req.ip
    );

    return res.json({
      message: `User ${user.email} has been successfully promoted to administrator.`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Setup failed';
    return res.status(500).json({ error: message });
  }
});
