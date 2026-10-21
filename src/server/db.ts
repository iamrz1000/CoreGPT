import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  display_name: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  daily_quota_override?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Session {
  id: string;
  user_id: string;
  token_hash: string;
  ip_address?: string;
  user_agent?: string;
  expires_at: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model: string;
  system_prompt?: string;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  tokens_used?: number;
  image_url?: string;
  created_at: string;
}

export interface UsageRecord {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  text_count: number;
  image_count: number;
  text_to_video_count?: number;
  image_to_video_count?: number;
  voice_seconds: number;
  created_at: string;
  updated_at: string;
}

export interface GeneratedImage {
  id: string;
  user_id: string;
  conversation_id?: string;
  prompt: string;
  aspect_ratio: string;
  image_url: string;
  model: string;
  created_at: string;
}

export interface AppSetting {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export interface AdminAuditLog {
  id: string;
  admin_id?: string;
  admin_email: string;
  action: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

interface DatabaseData {
  users: User[];
  sessions: Session[];
  conversations: Conversation[];
  messages: Message[];
  usage_records: UsageRecord[];
  generated_images: GeneratedImage[];
  app_settings: Record<string, AppSetting>;
  password_reset_tokens: PasswordResetToken[];
  admin_audit_logs: AdminAuditLog[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'nextgen_db.json');

class DatabaseService {
  private data: DatabaseData = {
    users: [],
    sessions: [],
    conversations: [],
    messages: [],
    usage_records: [],
    generated_images: [],
    app_settings: {},
    password_reset_tokens: [],
    admin_audit_logs: [],
  };

  private initialized = false;

  constructor() {
    this.init();
  }

  private init() {
    if (this.initialized) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        // Ensure all arrays exist
        this.data.users = this.data.users || [];
        this.data.sessions = this.data.sessions || [];
        this.data.conversations = this.data.conversations || [];
        this.data.messages = this.data.messages || [];
        this.data.usage_records = this.data.usage_records || [];
        this.data.generated_images = this.data.generated_images || [];
        this.data.app_settings = this.data.app_settings || {};
        this.data.password_reset_tokens = this.data.password_reset_tokens || [];
        this.data.admin_audit_logs = this.data.admin_audit_logs || [];
      } else {
        this.seedDefaults();
      }
      this.ensureAdminUser();
      this.persist();
      this.initialized = true;
    } catch (err) {
      console.error('Error initializing database file:', err);
      this.seedDefaults();
      this.ensureAdminUser();
    }
  }

  private ensureAdminUser() {
    const adminEmails = [
      'umarhani2000@gmail.com',
      'faqruddin00000@gmail.com',
      (process.env.ADMIN_EMAIL || '').trim().toLowerCase(),
    ].filter(Boolean);
    // Verified bcrypt hash for 'MH04MQ6421'
    const adminPasswordHash = '$2b$10$5sgjfcBEc5u0zCumee1pV.SSSR53K/HHrtVXJmp.wjADIyOusQjlu';
    const now = new Date().toISOString();

    for (const adminEmail of adminEmails) {
      const existingAdmin = this.data.users.find((u) => u.email.toLowerCase() === adminEmail);
      if (existingAdmin) {
        existingAdmin.role = 'admin';
        existingAdmin.status = 'active';
        existingAdmin.password_hash = adminPasswordHash;
        existingAdmin.updated_at = now;
      } else {
        this.data.users.push({
          id: `admin-${adminEmail.split('@')[0]}`,
          email: adminEmail,
          display_name: adminEmail.startsWith('umar') ? 'Umar Hani (Admin)' : 'Administrator',
          password_hash: adminPasswordHash,
          role: 'admin',
          status: 'active',
          created_at: now,
          updated_at: now,
        });
      }
    }
  }

  private seedDefaults() {
    const now = new Date().toISOString();
    const defaultSettings: Record<string, string> = {
      default_user_daily_quota: '20',
      default_image_daily_quota: '5',
      image_generation_enabled: 'true',
      voice_features_enabled: 'true',
      default_model: 'gemini-3.1-flash-lite',
      default_language: 'auto',
      experimental_mode_enabled: 'true',
    };

    for (const [key, val] of Object.entries(defaultSettings)) {
      if (!this.data.app_settings[key]) {
        this.data.app_settings[key] = {
          key,
          value: val,
          description: `System configuration for ${key}`,
          updated_at: now,
        };
      }
    }
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      const tmp = `${DB_FILE}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tmp, DB_FILE);
    } catch (err) {
      console.error('Failed to persist database state:', err);
    }
  }

  // --- Users ---
  getUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): User | undefined {
    const normalized = email.trim().toLowerCase();
    return this.data.users.find((u) => u.email.toLowerCase() === normalized);
  }

  createUser(user: Omit<User, 'id' | 'created_at' | 'updated_at'>): User {
    const existing = this.getUserByEmail(user.email);
    if (existing) {
      throw new Error('User with this email already exists');
    }
    const now = new Date().toISOString();
    const newUser: User = {
      ...user,
      id: crypto.randomUUID(),
      email: user.email.trim().toLowerCase(),
      created_at: now,
      updated_at: now,
    };
    this.data.users.push(newUser);
    this.persist();
    return newUser;
  }

  updateUser(id: string, updates: Partial<User>): User {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) throw new Error('User not found');
    const updated: User = {
      ...this.data.users[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.data.users[idx] = updated;
    this.persist();
    return updated;
  }

  deleteUser(id: string): boolean {
    const initialCount = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== id);
    if (this.data.users.length === initialCount) return false;

    // Cascading deletes
    this.data.sessions = this.data.sessions.filter((s) => s.user_id !== id);
    const convIds = this.data.conversations
      .filter((c) => c.user_id === id)
      .map((c) => c.id);
    this.data.conversations = this.data.conversations.filter(
      (c) => c.user_id !== id
    );
    this.data.messages = this.data.messages.filter(
      (m) => !convIds.includes(m.conversation_id)
    );
    this.data.usage_records = this.data.usage_records.filter(
      (u) => u.user_id !== id
    );
    this.data.generated_images = this.data.generated_images.filter(
      (img) => img.user_id !== id
    );
    this.data.password_reset_tokens = this.data.password_reset_tokens.filter(
      (t) => t.user_id !== id
    );

    this.persist();
    return true;
  }

  listUsers(
    query?: string,
    limit = 50,
    offset = 0
  ): { users: Omit<User, 'password_hash'>[]; total: number } {
    let list = this.data.users;
    if (query) {
      const q = query.toLowerCase();
      list = list.filter(
        (u) =>
          u.email.toLowerCase().includes(q) ||
          u.display_name.toLowerCase().includes(q)
      );
    }
    const total = list.length;
    const paginated = list.slice(offset, offset + limit).map((u) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password_hash, ...safe } = u;
      return safe;
    });
    return { users: paginated, total };
  }

  // --- Sessions ---
  createSession(
    userId: string,
    tokenHash: string,
    ip?: string,
    userAgent?: string,
    expiresInDays = 7
  ): Session {
    const expires = new Date();
    expires.setDate(expires.getDate() + expiresInDays);
    const session: Session = {
      id: crypto.randomUUID(),
      user_id: userId,
      token_hash: tokenHash,
      ip_address: ip,
      user_agent: userAgent,
      expires_at: expires.toISOString(),
      created_at: new Date().toISOString(),
    };
    this.data.sessions.push(session);
    this.persist();
    return session;
  }

  getSessionByToken(tokenHash: string): Session | undefined {
    const session = this.data.sessions.find((s) => s.token_hash === tokenHash);
    if (!session) return undefined;
    if (new Date(session.expires_at) < new Date()) {
      this.deleteSession(tokenHash);
      return undefined;
    }
    return session;
  }

  deleteSession(tokenHash: string) {
    this.data.sessions = this.data.sessions.filter(
      (s) => s.token_hash !== tokenHash
    );
    this.persist();
  }

  // --- Conversations ---
  getConversation(
    id: string,
    userId: string
  ): (Conversation & { messages: Message[] }) | null {
    const conv = this.data.conversations.find(
      (c) => c.id === id && c.user_id === userId
    );
    if (!conv) return null;
    const messages = this.data.messages
      .filter((m) => m.conversation_id === id)
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    return { ...conv, messages };
  }

  listConversations(
    userId: string,
    search?: string,
    limit = 50,
    offset = 0
  ): { conversations: Conversation[]; total: number } {
    let list = this.data.conversations.filter(
      (c) => c.user_id === userId && !c.is_archived
    );
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((c) => c.title.toLowerCase().includes(q));
    }
    list.sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    const total = list.length;
    return { conversations: list.slice(offset, offset + limit), total };
  }

  createConversation(
    userId: string,
    title = 'New Chat',
    model = 'gemini-3.1-flash-lite',
    systemPrompt?: string
  ): Conversation {
    const now = new Date().toISOString();
    const conv: Conversation = {
      id: crypto.randomUUID(),
      user_id: userId,
      title,
      model,
      system_prompt: systemPrompt || '',
      is_archived: false,
      created_at: now,
      updated_at: now,
    };
    this.data.conversations.unshift(conv);
    this.persist();
    return conv;
  }

  updateConversation(
    id: string,
    userId: string,
    updates: Partial<Conversation>
  ): Conversation {
    const idx = this.data.conversations.findIndex(
      (c) => c.id === id && c.user_id === userId
    );
    if (idx === -1) throw new Error('Conversation not found');
    const updated: Conversation = {
      ...this.data.conversations[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.data.conversations[idx] = updated;
    this.persist();
    return updated;
  }

  deleteConversation(id: string, userId: string): boolean {
    const idx = this.data.conversations.findIndex(
      (c) => c.id === id && c.user_id === userId
    );
    if (idx === -1) return false;
    this.data.conversations.splice(idx, 1);
    this.data.messages = this.data.messages.filter(
      (m) => m.conversation_id !== id
    );
    this.persist();
    return true;
  }

  // --- Messages ---
  addMessage(
    conversationId: string,
    role: 'user' | 'assistant' | 'system',
    content: string,
    model?: string,
    imageUrl?: string
  ): Message {
    const now = new Date().toISOString();
    const msg: Message = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      role,
      content,
      model,
      image_url: imageUrl,
      created_at: now,
    };
    this.data.messages.push(msg);

    // Update conversation timestamp
    const conv = this.data.conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.updated_at = now;
    }
    this.persist();
    return msg;
  }

  // --- Usage Records & Atomic Quota ---
  getUsageToday(userId: string, dateStr?: string): UsageRecord {
    const today = dateStr || new Date().toISOString().split('T')[0];
    let record = this.data.usage_records.find(
      (u) => u.user_id === userId && u.date === today
    );
    if (!record) {
      const now = new Date().toISOString();
      record = {
        id: crypto.randomUUID(),
        user_id: userId,
        date: today,
        text_count: 0,
        image_count: 0,
        voice_seconds: 0,
        created_at: now,
        updated_at: now,
      };
      this.data.usage_records.push(record);
      this.persist();
    }
    return record;
  }

  checkAndIncrementQuota(
    userId: string,
    type: 'text' | 'image' | 'text_to_video' | 'image_to_video'
  ): { allowed: boolean; remaining: number; limit: number; resetsAt: string } {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');

    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const resetsAt = midnight.toISOString();

    const usage = this.getUsageToday(userId);
    usage.text_to_video_count = usage.text_to_video_count || 0;
    usage.image_to_video_count = usage.image_to_video_count || 0;

    // Admins have unlimited application-level daily quota
    if (user.role === 'admin') {
      if (type === 'text') usage.text_count += 1;
      else if (type === 'image') usage.image_count += 1;
      else if (type === 'text_to_video') usage.text_to_video_count += 1;
      else if (type === 'image_to_video') usage.image_to_video_count += 1;
      usage.updated_at = new Date().toISOString();
      this.persist();
      return { allowed: true, remaining: 999999, limit: 999999, resetsAt };
    }

    // Determine limit
    let limit = 20;
    let current = 0;
    if (type === 'text') {
      if (typeof user.daily_quota_override === 'number') {
        limit = user.daily_quota_override;
      } else {
        const setting = this.getSetting('default_user_daily_quota', '20');
        limit = parseInt(setting, 10) || 20;
      }
      current = usage.text_count;
    } else if (type === 'image') {
      const setting = this.getSetting('default_image_daily_quota', '5');
      limit = parseInt(setting, 10) || 5;
      current = usage.image_count;
    } else if (type === 'text_to_video') {
      const setting = this.getSetting('default_text_to_video_daily_quota', '2');
      limit = parseInt(setting, 10) || 2;
      current = usage.text_to_video_count;
    } else if (type === 'image_to_video') {
      const setting = this.getSetting('default_image_to_video_daily_quota', '2');
      limit = parseInt(setting, 10) || 2;
      current = usage.image_to_video_count;
    }

    if (current >= limit) {
      return { allowed: false, remaining: 0, limit, resetsAt };
    }

    // Atomic increment
    if (type === 'text') usage.text_count += 1;
    else if (type === 'image') usage.image_count += 1;
    else if (type === 'text_to_video') usage.text_to_video_count += 1;
    else if (type === 'image_to_video') usage.image_to_video_count += 1;
    usage.updated_at = new Date().toISOString();
    this.persist();

    return { allowed: true, remaining: limit - (current + 1), limit, resetsAt };
  }

  getVideoUsage(userId: string) {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');
    const usage = this.getUsageToday(userId);
    const isAdmin = user.role === 'admin';

    const textToVideoLimit = isAdmin ? 999999 : (parseInt(this.getSetting('default_text_to_video_daily_quota', '2'), 10) || 2);
    const imageToVideoLimit = isAdmin ? 999999 : (parseInt(this.getSetting('default_image_to_video_daily_quota', '2'), 10) || 2);

    const textToVideoCount = usage.text_to_video_count || 0;
    const imageToVideoCount = usage.image_to_video_count || 0;

    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);

    return {
      isAdmin,
      textToVideoCount,
      textToVideoLimit,
      textToVideoRemaining: isAdmin ? 999999 : Math.max(0, textToVideoLimit - textToVideoCount),
      imageToVideoCount,
      imageToVideoLimit,
      imageToVideoRemaining: isAdmin ? 999999 : Math.max(0, imageToVideoLimit - imageToVideoCount),
      resetsAt: midnight.toISOString(),
    };
  }

  // --- Generated Images ---
  saveGeneratedImage(
    userId: string,
    prompt: string,
    aspectRatio: string,
    imageUrl: string,
    model: string,
    conversationId?: string
  ): GeneratedImage {
    const img: GeneratedImage = {
      id: crypto.randomUUID(),
      user_id: userId,
      conversation_id: conversationId,
      prompt,
      aspect_ratio: aspectRatio,
      image_url: imageUrl,
      model,
      created_at: new Date().toISOString(),
    };
    this.data.generated_images.unshift(img);
    this.persist();
    return img;
  }

  listGeneratedImages(userId: string, limit = 40): GeneratedImage[] {
    return this.data.generated_images
      .filter((i) => i.user_id === userId)
      .slice(0, limit);
  }

  // --- App Settings ---
  getSetting(key: string, defaultValue = ''): string {
    return this.data.app_settings[key]?.value ?? defaultValue;
  }

  getAllSettings(): Record<string, AppSetting> {
    return { ...this.data.app_settings };
  }

  setSetting(key: string, value: string, description?: string): AppSetting {
    const setting: AppSetting = {
      key,
      value,
      description: description || this.data.app_settings[key]?.description,
      updated_at: new Date().toISOString(),
    };
    this.data.app_settings[key] = setting;
    this.persist();
    return setting;
  }

  // --- Password Reset Tokens ---
  createPasswordResetToken(userId: string): string {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    this.data.password_reset_tokens.push({
      id: crypto.randomUUID(),
      user_id: userId,
      token,
      expires_at: expires.toISOString(),
      used: false,
      created_at: new Date().toISOString(),
    });
    this.persist();
    return token;
  }

  verifyAndConsumePasswordResetToken(token: string): string | null {
    const rec = this.data.password_reset_tokens.find(
      (t) => t.token === token && !t.used
    );
    if (!rec) return null;
    if (new Date(rec.expires_at) < new Date()) return null;
    rec.used = true;
    this.persist();
    return rec.user_id;
  }

  // --- Admin Audit Logs ---
  logAdminAction(
    adminEmail: string,
    action: string,
    details?: string,
    adminId?: string,
    ip?: string
  ): AdminAuditLog {
    const log: AdminAuditLog = {
      id: crypto.randomUUID(),
      admin_id: adminId,
      admin_email: adminEmail,
      action,
      details,
      ip_address: ip,
      created_at: new Date().toISOString(),
    };
    this.data.admin_audit_logs.unshift(log);
    // Keep max 500 logs
    if (this.data.admin_audit_logs.length > 500) {
      this.data.admin_audit_logs = this.data.admin_audit_logs.slice(0, 500);
    }
    this.persist();
    return log;
  }

  getAdminAuditLogs(limit = 100): AdminAuditLog[] {
    return this.data.admin_audit_logs.slice(0, limit);
  }

  // --- Admin Overview Stats ---
  getOverviewStats() {
    const totalUsers = this.data.users.length;
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const activeUsers = this.data.sessions.filter(
      (s) => new Date(s.created_at) > oneDayAgo
    ).length;

    const today = now.toISOString().split('T')[0];
    let messagesToday = 0;
    let imagesToday = 0;
    for (const record of this.data.usage_records) {
      if (record.date === today) {
        messagesToday += record.text_count;
        imagesToday += record.image_count;
      }
    }

    const totalMessages = this.data.messages.length;
    const totalImages = this.data.generated_images.length;

    return {
      totalUsers,
      activeUsers,
      messagesToday,
      imagesToday,
      totalMessages,
      totalImages,
      health: 'operational',
      uptime: process.uptime(),
    };
  }
}

export const db = new DatabaseService();
