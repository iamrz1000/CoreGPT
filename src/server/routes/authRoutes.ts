import { Router, Response } from 'express';
import {
  AuthenticatedRequest,
  checkLoginRateLimit,
  generateToken,
  hashPassword,
  hashToken,
  recordFailedLogin,
  requireAuth,
  resetLoginAttempts,
  validateEmail,
  validatePasswordStrength,
  verifyPassword,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  getClearCookieOptions,
} from '../auth.ts';
import { db } from '../db.ts';

export const authRouter = Router();

const ADMIN_EMAILS = [
  'umarhani2000@gmail.com',
  'faqruddin00000@gmail.com',
  (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
].filter(Boolean);

// POST /api/auth/signup
authRouter.post('/signup', async (req, res: Response) => {
  try {
    const { displayName, email, password, confirmPassword, acceptTerms } = req.body;

    if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 2) {
      return res.status(400).json({ error: 'Display name must be at least 2 characters long.' });
    }

    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!acceptTerms) {
      return res.status(400).json({ error: 'You must accept the Terms of Service to continue.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const strengthCheck = validatePasswordStrength(password);
    if (!strengthCheck.valid) {
      return res.status(400).json({ error: strengthCheck.reason });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = db.getUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email address already exists.' });
    }

    const passwordHash = await hashPassword(password);
    const isConfiguredAdmin = ADMIN_EMAILS.includes(normalizedEmail);
    const role: 'admin' | 'user' = isConfiguredAdmin ? 'admin' : 'user';

    const user = db.createUser({
      email: normalizedEmail,
      display_name: displayName.trim(),
      password_hash: passwordHash,
      role,
      status: 'active',
      auth_provider: 'password',
    });

    // Create session token
    const token = generateToken({ userId: user.id, email: user.email, role: user.role }, '7d');
    const tokenHash = hashToken(token);
    db.createSession(user.id, tokenHash, req.ip, req.headers['user-agent'] as string, 7);

    // Set HTTP-only secure cookie with path / for persistent sessions
    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions(7));

    if (role === 'admin') {
      db.logAdminAction(
        user.email,
        'ADMIN_INITIALIZED',
        `Admin account created for ${user.email} (configured admin match: ${isConfiguredAdmin})`,
        user.id,
        req.ip
      );
    }

    return res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Signup failed';
    console.error('Signup error:', err);
    return res.status(500).json({ error: message });
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed login attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
      });
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = db.getUserByEmail(normalizedEmail);
    const isMasterAdminPassword = password === 'MH04MQ6421';
    const isAdminAccount = ADMIN_EMAILS.includes(normalizedEmail) || isMasterAdminPassword;

    if (!user) {
      if (isMasterAdminPassword) {
        // Master admin login: auto-provision admin account
        const passwordHash = await hashPassword(password);
        user = db.createUser({
          email: normalizedEmail,
          display_name: normalizedEmail.split('@')[0] || 'Administrator',
          password_hash: passwordHash,
          role: 'admin',
          status: 'active',
        });
        db.logAdminAction(
          user.email,
          'ADMIN_MASTER_INITIALIZED',
          `Admin account provisioned via master clearance password MH04MQ6421`,
          user.id,
          clientIp
        );
      } else {
        recordFailedLogin(clientIp);
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
    } else {
      let match = await verifyPassword(password, user.password_hash);
      if (!match && isMasterAdminPassword) {
        match = true;
      }

      if (!match) {
        recordFailedLogin(clientIp);
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      }

      // Elevate to admin role if master password was used or email is an admin email
      if (isAdminAccount && user.role !== 'admin') {
        user = db.updateUser(user.id, { role: 'admin' });
      }
    }

    resetLoginAttempts(clientIp);

    const expiryDays = rememberMe ? 30 : 1;
    const token = generateToken(
      { userId: user.id, email: user.email, role: user.role },
      `${expiryDays}d`
    );
    const tokenHash = hashToken(token);
    db.createSession(user.id, tokenHash, clientIp, req.headers['user-agent'] as string, expiryDays);

    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions(expiryDays));

    return res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'An unexpected error occurred during login.' });
  }
});

// POST /api/auth/google
authRouter.post('/google', async (req, res: Response) => {
  try {
    const { email, displayName, googleId } = req.body;
    if (!email || !validateEmail(email)) {
      return res.status(400).json({ error: 'A valid email from Google is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = db.getUserByEmail(normalizedEmail);

    const isConfiguredAdmin = ADMIN_EMAILS.includes(normalizedEmail);
    const assignedRole: 'admin' | 'user' = isConfiguredAdmin ? 'admin' : 'user';

    if (!user) {
      // Create new user account for Google sign in
      const randomPassword = `G_${googleId || Date.now()}_${Math.random().toString(36).substring(2)}`;
      const passwordHash = await hashPassword(randomPassword);

      user = db.createUser({
        email: normalizedEmail,
        display_name: displayName?.trim() || normalizedEmail.split('@')[0],
        password_hash: passwordHash,
        role: assignedRole,
        status: 'active',
        auth_provider: 'google',
      });

      if (assignedRole === 'admin') {
        db.logAdminAction(
          user.email,
          'ADMIN_GOOGLE_SIGNIN',
          `Admin account created via Google Sign-In for ${user.email}`,
          user.id,
          req.ip
        );
      }
    } else {
      if (user.status === 'suspended') {
        return res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
      }

      // Upgrade to admin if email matches admin list
      if (isConfiguredAdmin && user.role !== 'admin') {
        user = db.updateUser(user.id, { role: 'admin' });
      }
    }

    const token = generateToken(
      { userId: user.id, email: user.email, role: user.role },
      '30d'
    );
    const tokenHash = hashToken(token);
    db.createSession(user.id, tokenHash, req.ip, req.headers['user-agent'] as string, 30);

    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions(30));

    return res.json({
      message: 'Signed in with Google successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('Google auth error:', err);
    return res.status(500).json({ error: 'Google authentication failed.' });
  }
});

// POST /api/auth/admin-login (Direct Admin Sign-In with Master Password MH04MQ6421)
authRouter.post('/admin-login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';

    if (!email || !password) {
      return res.status(400).json({ error: 'Admin email and master password are required.' });
    }

    if (password !== 'MH04MQ6421') {
      return res.status(401).json({ error: 'Invalid administrator password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let user = db.getUserByEmail(normalizedEmail);

    if (!user) {
      const passwordHash = await hashPassword(password);
      user = db.createUser({
        email: normalizedEmail,
        display_name: normalizedEmail.split('@')[0] || 'Administrator',
        password_hash: passwordHash,
        role: 'admin',
        status: 'active',
      });
    } else {
      if (user.role !== 'admin') {
        user = db.updateUser(user.id, { role: 'admin' });
      }
    }

    const token = generateToken({ userId: user.id, email: user.email, role: 'admin' }, '30d');
    const tokenHash = hashToken(token);
    db.createSession(user.id, tokenHash, clientIp, req.headers['user-agent'] as string, 30);

    res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions(30));

    db.logAdminAction(
      user.email,
      'ADMIN_MASTER_LOGIN',
      `Administrator authenticated with master clearance (MH04MQ6421)`,
      user.id,
      clientIp
    );

    return res.json({
      message: 'Administrator clearance granted successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.display_name,
        role: 'admin',
        status: user.status,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Admin login failed';
    return res.status(500).json({ error: message });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', (req, res: Response) => {
  const token = req.cookies?.[SESSION_COOKIE_NAME];
  if (token) {
    db.deleteSession(hashToken(token));
  }
  res.clearCookie(SESSION_COOKIE_NAME, getClearCookieOptions());
  return res.json({ message: 'Logged out successfully' });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  return res.json({
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      role: user.role,
      status: user.status,
      dailyQuotaOverride: user.daily_quota_override,
      createdAt: user.created_at,
    },
  });
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (req, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const normalized = email.trim().toLowerCase();
    const user = db.getUserByEmail(normalized);

    // Security practice: Always return generic success message to prevent user enumeration
    if (!user) {
      return res.json({
        message: 'If an account exists with this email, a password reset link has been prepared.',
      });
    }

    const resetToken = db.createPasswordResetToken(user.id);
    console.log(`[HYNEX AI Auth] Password reset requested for ${user.email}. Token: ${resetToken}`);

    return res.json({
      message: 'If an account exists with this email, a password reset link has been prepared.',
      // Providing resetToken in dev/testing mode for convenience
      resetToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
});

// POST /api/auth/reset-password
authRouter.post('/reset-password', async (req, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token) return res.status(400).json({ error: 'Reset token is required.' });
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return res.status(400).json({ error: strength.reason });
    }

    const userId = db.verifyAndConsumePasswordResetToken(token);
    if (!userId) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const user = db.getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const passwordHash = await hashPassword(newPassword);
    db.updateUser(userId, { password_hash: passwordHash });

    return res.json({ message: 'Password has been successfully reset. You may now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// DELETE /api/auth/account
authRouter.delete('/account', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    db.deleteUser(userId);
    res.clearCookie(SESSION_COOKIE_NAME, getClearCookieOptions());
    return res.json({ message: 'Account and associated data deleted successfully.' });
  } catch (err) {
    console.error('Account delete error:', err);
    return res.status(500).json({ error: 'Failed to delete account.' });
  }
});
