import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, User } from './db.ts';

const SESSION_SECRET =
  process.env.SESSION_SECRET || 'nextgen-ai-secret-default-change-me-2025';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

// Rate limiting map for auth endpoints: IP -> { attempts: number, lastAttempt: number }
const loginAttempts = new Map<string, { attempts: number; lastAttempt: number }>();

export function checkLoginRateLimit(ip: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);
  if (!entry) return { allowed: true };

  // If locked out (more than 5 attempts within 15 minutes)
  const windowMs = 15 * 60 * 1000;
  if (now - entry.lastAttempt > windowMs) {
    loginAttempts.delete(ip);
    return { allowed: true };
  }

  if (entry.attempts >= 7) {
    const remainingMs = windowMs - (now - entry.lastAttempt);
    return { allowed: false, retryAfterSeconds: Math.ceil(remainingMs / 1000) };
  }

  return { allowed: true };
}

export function recordFailedLogin(ip: string) {
  const now = Date.now();
  const entry = loginAttempts.get(ip) || { attempts: 0, lastAttempt: now };
  entry.attempts += 1;
  entry.lastAttempt = now;
  loginAttempts.set(ip, entry);
}

export function resetLoginAttempts(ip: string) {
  loginAttempts.delete(ip);
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;
  return emailRegex.test(email.trim());
}

export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password) && !/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain letters.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one numeric digit.' };
  }
  return { valid: true };
}

export async function hashPassword(plainText: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainText, salt);
}

export async function verifyPassword(plainText: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainText, hash);
}

export function generateToken(payload: { userId: string; email: string; role: string }, expiresIn = '7d'): string {
  return jwt.sign(payload, SESSION_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): { userId: string; email: string; role: string } | null {
  try {
    return jwt.verify(token, SESSION_SECRET) as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_NAME = 'nextgen_session';

export function getSessionCookieOptions(maxAgeDays = 7) {
  return {
    httpOnly: true,
    secure: true, // Required for HTTPS & Cloud Run iframe environments
    sameSite: 'none' as const, // Required for cross-site iframe embedding
    path: '/',
    maxAge: maxAgeDays * 24 * 60 * 60 * 1000,
  };
}

export function getClearCookieOptions() {
  return {
    httpOnly: true,
    secure: true,
    sameSite: 'none' as const,
    path: '/',
  };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const token =
      req.cookies?.[SESSION_COOKIE_NAME] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : null);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.clearCookie(SESSION_COOKIE_NAME, getClearCookieOptions());
      return res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
    }

    const user = db.getUserById(payload.userId);
    if (!user) {
      res.clearCookie(SESSION_COOKIE_NAME, getClearCookieOptions());
      return res.status(401).json({ error: 'User account not found.' });
    }

    if (user.status === 'suspended') {
      res.clearCookie(SESSION_COOKIE_NAME, getClearCookieOptions());
      return res.status(403).json({ error: 'Your account has been suspended by an administrator.' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('requireAuth middleware error:', err);
    return res.status(500).json({ error: 'Authentication validation failed.' });
  }
}

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      const adminEmail = req.user?.email || 'unauthenticated';
      db.logAdminAction(
        adminEmail,
        'UNAUTHORIZED_ADMIN_ACCESS_ATTEMPT',
        `User ${req.user?.id || 'none'} tried to access ${req.originalUrl}`,
        req.user?.id,
        req.ip
      );
      return res.status(403).json({
        error: 'Forbidden: Administrator privileges required for this action.',
      });
    }
    next();
  });
}
