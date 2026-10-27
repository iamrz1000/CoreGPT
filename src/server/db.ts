
export interface ResearchReport {
  id: string;
  user_id: string;
  query: string;
  report_markdown: string;
  sources: Array<{ title: string; url: string; snippet?: string }>;
  findings: string[];
  created_at: string;
}

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
  auth_provider?: 'password' | 'google';
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
  bonus_text_credits?: number;
  bonus_image_credits?: number;
  bonus_text_to_video_credits?: number;
  bonus_image_to_video_credits?: number;
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

export interface CharacterRef {
  id: string;
  name: string;
  description: string;
  avatar_url?: string;
  visual_traits?: string[];
  voice_id?: string;
}

export interface Scene {
  id: string;
  scene_number: number;
  title: string;
  description: string;
  dialogue?: string;
  image_prompt: string;
  image_url?: string;
  video_prompt?: string;
  video_url?: string;
  video_status?: 'idle' | 'generating' | 'completed' | 'failed';
  video_job_id?: string;
  duration_seconds: number;
  camera_angle?: string;
  audio_notes?: string;
}

export interface ProjectDecision {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'approved' | 'suggested' | 'unconfirmed' | 'completed';
  approved_at?: string;
  created_at: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  snapshot: any;
  changelog: string;
  created_at: string;
}

export interface ProjectActivity {
  id: string;
  project_id: string;
  user_id: string;
  user_name?: string;
  action: string;
  details?: string;
  created_at: string;
}

export interface ProjectDeliverable {
  id: string;
  title: string;
  type:
    | 'brand_identity'
    | 'logo'
    | 'web_copy'
    | 'product_description'
    | 'marketing_plan'
    | 'social_post'
    | 'video_script'
    | 'promo_image'
    | 'video_clip'
    | 'content_calendar';
  content: string;
  asset_url?: string;
  status: 'pending' | 'generating' | 'completed' | 'waiting_approval' | 'approved' | 'rejected';
  dependencies?: string[];
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'film' | 'short_video' | 'animation' | 'commercial' | 'general';
  status: 'draft' | 'in_progress' | 'completed' | 'archived';
  instructions?: string;
  target_audience?: string;
  preferred_language?: string;
  current_stage?: 'planning' | 'scripting' | 'storyboarding' | 'media_generation' | 'assembling' | 'review' | 'completed';
  creator_dna_id?: string;
  character_refs: CharacterRef[];
  scenes: Scene[];
  decisions?: ProjectDecision[];
  versions?: ProjectVersion[];
  activity?: ProjectActivity[];
  deliverables?: ProjectDeliverable[];
  script: string;
  subtitles_srt?: string;
  subtitles_vtt?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatorDNA {
  id: string;
  user_id: string;
  name: string;
  niche: string;
  target_audience: string;
  language: string;
  writing_style: string;
  visual_style: string;
  brand_colors: string[];
  typography: string;
  aspect_ratio: '16:9' | '9:16' | '1:1' | '4:5';
  caption_preferences: string;
  character_refs: CharacterRef[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowDef {
  id: string;
  user_id: string;
  project_id?: string | null;
  name: string;
  description: string;
  inputs: Array<{ key: string; label: string; type: 'text' | 'textarea' | 'select' | 'number'; default_value?: string; options?: string[] }>;
  steps: Array<{ id: string; step_number: number; title: string; tool: 'generate_text' | 'truth_check' | 'search_web' | 'generate_image' | 'generate_video' | 'transform_content' | 'user_approval' | 'save_project_asset'; config: any; dependencies?: string[]; requires_approval?: boolean }>;
  created_at: string;
  updated_at: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  user_id: string;
  project_id?: string | null;
  status: 'pending' | 'running' | 'completed' | 'paused' | 'failed' | 'cancelled';
  inputs: Record<string, any>;
  current_step_index: number;
  step_results: Record<string, { status: string; output?: any; error?: string; executed_at: string }>;
  created_at: string;
  updated_at: string;
}

export interface CollabMember {
  id: string;
  project_id: string;
  user_id?: string;
  email: string;
  role: 'owner' | 'editor' | 'reviewer' | 'viewer';
  status: 'pending' | 'accepted' | 'declined';
  invited_by: string;
  created_at: string;
}

export interface ProjectComment {
  id: string;
  project_id: string;
  asset_id?: string;
  user_id: string;
  user_name: string;
  text: string;
  resolved: boolean;
  created_at: string;
}

export interface MiniApp {
  id: string;
  user_id: string;
  name: string;
  description: string;
  inputs: Array<{ key: string; label: string; type: 'text' | 'textarea' | 'select'; placeholder?: string; options?: string[] }>;
  output_format: 'markdown' | 'json' | 'image_prompt' | 'bullet_list';
  instructions: string;
  capabilities: string[];
  is_published: boolean;
  run_count: number;
  created_at: string;
  updated_at: string;
}

export interface SharedPage {
  id: string;
  user_id: string;
  target_type: 'image' | 'video' | 'project' | 'workflow' | 'miniapp';
  target_id: string;
  title: string;
  description: string;
  public_data: any;
  visibility: 'private' | 'link' | 'public';
  allow_remix: boolean;
  view_count: number;
  created_at: string;
}

export interface CommunityTemplate {
  id: string;
  title: string;
  description: string;
  category: any;
  creator_name?: string;
  tools?: string[];
  inputs?: any[];
  outputs?: any[];
  config?: any;
  tags?: string[];
  type?: 'project' | 'workflow' | 'mini_app';
  preview_image?: string;
  featured?: boolean;
  template_data?: any;
  clone_count: number;
  is_official: boolean;
  created_at: string;
}

export interface TruthCheckReport {
  id: string;
  user_id: string;
  message_id?: string;
  target_text: string;
  claim_verifications: Array<{
    claim: string;
    status: 'supported' | 'contradicted' | 'inconclusive' | 'unverified';
    evidence: string;
    sources: Array<{ title: string; url: string; snippet?: string; date?: string }>;
    uncertainty?: string;
  }>;
  overall_score: number;
  created_at: string;
}

export interface Memory {
  id: string;
  user_id: string;
  project_id?: string | null;
  category: 'preference' | 'fact' | 'directive' | 'character' | 'style' | 'project';
  key: string;
  value: string;
  source: 'user' | 'agent' | 'project';
  created_at: string;
  updated_at: string;
}

export interface AgentStep {
  id: string;
  step_number: number;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  tool_name?: string;
  tool_input?: any;
  tool_output?: any;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

export interface AgentTask {
  id: string;
  user_id: string;
  project_id?: string | null;
  title: string;
  goal: string;
  status: 'planned' | 'running' | 'completed' | 'failed' | 'cancelled';
  steps: AgentStep[];
  requires_confirmation: boolean;
  confirmation_action?: {
    type: string;
    description: string;
    payload: any;
  } | null;
  is_confirmed?: boolean;
  result?: string | null;
  error?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFile {
  id: string;
  user_id: string;
  project_id?: string | null;
  name: string;
  mime_type: string;
  size: number;
  url: string;
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
  projects: Project[];
  memories: Memory[];
  agent_tasks: AgentTask[];
  user_files: UserFile[];
  creator_dnas: CreatorDNA[];
  workflows: WorkflowDef[];
  workflow_executions: WorkflowExecution[];
  collab_members: CollabMember[];
  project_comments: ProjectComment[];
  mini_apps: MiniApp[];
  shared_pages: SharedPage[];
  community_templates: CommunityTemplate[];
  truthcheck_reports: TruthCheckReport[];
  research_reports: ResearchReport[];
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
    projects: [],
    memories: [],
    agent_tasks: [],
    user_files: [],
    creator_dnas: [],
    workflows: [],
    workflow_executions: [],
    collab_members: [],
    project_comments: [],
    mini_apps: [],
    shared_pages: [],
    community_templates: [],
    truthcheck_reports: [],
      research_reports: [],
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
        this.data.projects = this.data.projects || [];
        this.data.memories = this.data.memories || [];
        this.data.agent_tasks = this.data.agent_tasks || [];
        this.data.user_files = this.data.user_files || [];
        this.data.creator_dnas = this.data.creator_dnas || [];
        this.data.workflows = this.data.workflows || [];
        this.data.workflow_executions = this.data.workflow_executions || [];
        this.data.collab_members = this.data.collab_members || [];
        this.data.project_comments = this.data.project_comments || [];
        this.data.mini_apps = this.data.mini_apps || [];
        this.data.shared_pages = this.data.shared_pages || [];
        this.data.community_templates = this.data.community_templates || [];
        this.data.truthcheck_reports = this.data.truthcheck_reports || [];
      } else {
        this.seedDefaults();
      }
      this.seedCommunityTemplatesIfEmpty();
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
  ): {
    users: (Omit<User, 'password_hash'> & {
      displayName: string;
      createdAt: string;
      authType: 'password' | 'google';
      passwordHashPreview: string;
      conversationCount: number;
      messageCount: number;
      lastActive?: string;
    })[];
    total: number;
  } {
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
      const userConvs = this.data.conversations.filter((c) => c.user_id === u.id);
      const convIds = new Set(userConvs.map((c) => c.id));
      const userMessages = this.data.messages.filter((m) => convIds.has(m.conversation_id));

      const authType: 'password' | 'google' = u.auth_provider
        ? u.auth_provider
        : (u.email.endsWith('@gmail.com') && !u.password_hash.includes('MH04MQ6421') ? 'google' : 'password');

      const latestMsg = userMessages.length > 0 ? userMessages[userMessages.length - 1].created_at : undefined;
      const latestConv = userConvs.length > 0 ? userConvs[0].updated_at : undefined;
      const lastActive = latestMsg || latestConv || u.updated_at || u.created_at;

      return {
        ...safe,
        displayName: u.display_name,
        createdAt: u.created_at,
        authType,
        passwordHashPreview: u.password_hash
          ? `${u.password_hash.substring(0, 10)}...${u.password_hash.substring(u.password_hash.length - 4)}`
          : 'OAuth Token Protected',
        conversationCount: userConvs.length,
        messageCount: userMessages.length,
        lastActive,
      };
    });
    return { users: paginated, total };
  }

  getUserHistory(userId: string): {
    conversations: (Conversation & { messages: Message[] })[];
    totalConversations: number;
    totalMessages: number;
  } {
    const userConvs = this.data.conversations
      .filter((c) => c.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    const conversations = userConvs.map((conv) => {
      const messages = this.data.messages
        .filter((m) => m.conversation_id === conv.id)
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      return {
        ...conv,
        messages,
      };
    });

    const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);

    return {
      conversations,
      totalConversations: userConvs.length,
      totalMessages,
    };
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

    // Determine limit (including bonus credits earned from Unity Ads)
    let limit = 20;
    let current = 0;
    if (type === 'text') {
      if (typeof user.daily_quota_override === 'number') {
        limit = user.daily_quota_override;
      } else {
        const setting = this.getSetting('default_user_daily_quota', '20');
        limit = parseInt(setting, 10) || 20;
      }
      limit += (usage.bonus_text_credits || 0);
      current = usage.text_count;
    } else if (type === 'image') {
      const setting = this.getSetting('default_image_daily_quota', '5');
      limit = (parseInt(setting, 10) || 5) + (usage.bonus_image_credits || 0);
      current = usage.image_count;
    } else if (type === 'text_to_video') {
      const setting = this.getSetting('default_text_to_video_daily_quota', '2');
      limit = (parseInt(setting, 10) || 2) + (usage.bonus_text_to_video_credits || 0);
      current = usage.text_to_video_count;
    } else if (type === 'image_to_video') {
      const setting = this.getSetting('default_image_to_video_daily_quota', '2');
      limit = (parseInt(setting, 10) || 2) + (usage.bonus_image_to_video_credits || 0);
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

  grantAdRewardCredits(
    userId: string,
    type: 'text' | 'image' | 'video' | 'text_to_video' | 'image_to_video',
    amount = 2
  ) {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');
    if (user.role === 'admin') {
      return {
        success: true,
        isAdmin: true,
        type,
        amountAdded: 0,
        message: 'Admin accounts have unlimited access without ads.',
      };
    }

    const usage = this.getUsageToday(userId);
    usage.bonus_text_credits = usage.bonus_text_credits || 0;
    usage.bonus_image_credits = usage.bonus_image_credits || 0;
    usage.bonus_text_to_video_credits = usage.bonus_text_to_video_credits || 0;
    usage.bonus_image_to_video_credits = usage.bonus_image_to_video_credits || 0;

    if (type === 'text') {
      usage.bonus_text_credits += amount;
    } else if (type === 'image') {
      usage.bonus_image_credits += amount;
    } else if (type === 'text_to_video') {
      usage.bonus_text_to_video_credits += amount;
    } else if (type === 'image_to_video') {
      usage.bonus_image_to_video_credits += amount;
    } else if (type === 'video') {
      usage.bonus_text_to_video_credits += amount;
      usage.bonus_image_to_video_credits += amount;
    }

    usage.updated_at = new Date().toISOString();
    this.persist();

    return {
      success: true,
      isAdmin: false,
      type,
      amountAdded: amount,
      bonusTextCredits: usage.bonus_text_credits,
      bonusImageCredits: usage.bonus_image_credits,
      bonusTextToVideoCredits: usage.bonus_text_to_video_credits,
      bonusImageToVideoCredits: usage.bonus_image_to_video_credits,
      message: `Granted ${amount} bonus credits for ${type}!`,
    };
  }

  getVideoUsage(userId: string) {
    const user = this.getUserById(userId);
    if (!user) throw new Error('User not found');
    const usage = this.getUsageToday(userId);
    const isAdmin = user.role === 'admin';

    const baseTextLimit = parseInt(this.getSetting('default_text_to_video_daily_quota', '2'), 10) || 2;
    const baseImageLimit = parseInt(this.getSetting('default_image_to_video_daily_quota', '2'), 10) || 2;

    const textToVideoLimit = isAdmin ? 999999 : baseTextLimit + (usage.bonus_text_to_video_credits || 0);
    const imageToVideoLimit = isAdmin ? 999999 : baseImageLimit + (usage.bonus_image_to_video_credits || 0);

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

  // ==========================================
  // --- Hynex Project Hub Methods ---
  // ==========================================

  getProjects(userId: string): Project[] {
    return this.data.projects
      .filter((p) => p.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  getProject(userId: string, projectId: string): Project | null {
    const project = this.data.projects.find((p) => p.id === projectId && p.user_id === userId);
    return project || null;
  }

  createProject(
    userId: string,
    data: {
      title: string;
      description?: string;
      category?: Project['category'];
      status?: Project['status'];
      character_refs?: CharacterRef[];
      scenes?: Scene[];
      script?: string;
    }
  ): Project {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: `proj_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      user_id: userId,
      title: data.title.trim() || 'Untitled Creative Project',
      description: data.description?.trim() || '',
      category: data.category || 'general',
      status: data.status || 'draft',
      character_refs: data.character_refs || [],
      scenes: data.scenes || [],
      script: data.script || '',
      created_at: now,
      updated_at: now,
    };
    this.data.projects.unshift(newProject);
    this.persist();
    return newProject;
  }

  updateProject(
    userId: string,
    projectId: string,
    updates: Partial<Omit<Project, 'id' | 'user_id' | 'created_at'>>
  ): Project | null {
    const project = this.getProject(userId, projectId);
    if (!project) return null;

    if (updates.title !== undefined) project.title = updates.title.trim();
    if (updates.description !== undefined) project.description = updates.description.trim();
    if (updates.category !== undefined) project.category = updates.category;
    if (updates.status !== undefined) project.status = updates.status;
    if (updates.character_refs !== undefined) project.character_refs = updates.character_refs;
    if (updates.scenes !== undefined) project.scenes = updates.scenes;
    if (updates.script !== undefined) project.script = updates.script;
    if (updates.subtitles_srt !== undefined) project.subtitles_srt = updates.subtitles_srt;
    if (updates.subtitles_vtt !== undefined) project.subtitles_vtt = updates.subtitles_vtt;

    project.updated_at = new Date().toISOString();
    this.persist();
    return project;
  }

  deleteProject(userId: string, projectId: string): boolean {
    const index = this.data.projects.findIndex((p) => p.id === projectId && p.user_id === userId);
    if (index === -1) return false;
    this.data.projects.splice(index, 1);

    // Also clean up project-scoped memories, agent tasks, and files
    this.data.memories = this.data.memories.filter((m) => !(m.user_id === userId && m.project_id === projectId));
    this.data.agent_tasks = this.data.agent_tasks.filter((t) => !(t.user_id === userId && t.project_id === projectId));
    this.data.user_files = this.data.user_files.filter((f) => !(f.user_id === userId && f.project_id === projectId));

    this.persist();
    return true;
  }

  // ==========================================
  // --- Hynex Memory Methods ---
  // ==========================================

  getMemories(userId: string, projectId?: string | null): Memory[] {
    return this.data.memories
      .filter((m) => {
        if (m.user_id !== userId) return false;
        if (projectId !== undefined) {
          return m.project_id === projectId;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  getMemory(userId: string, memoryId: string): Memory | null {
    return this.data.memories.find((m) => m.id === memoryId && m.user_id === userId) || null;
  }

  createMemory(
    userId: string,
    data: {
      key: string;
      value: string;
      category?: Memory['category'];
      project_id?: string | null;
      source?: Memory['source'];
    }
  ): Memory {
    const now = new Date().toISOString();
    const newMemory: Memory = {
      id: `mem_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      user_id: userId,
      project_id: data.project_id || null,
      category: data.category || 'fact',
      key: data.key.trim(),
      value: data.value.trim(),
      source: data.source || 'user',
      created_at: now,
      updated_at: now,
    };
    this.data.memories.unshift(newMemory);
    this.persist();
    return newMemory;
  }

  updateMemory(
    userId: string,
    memoryId: string,
    updates: Partial<Omit<Memory, 'id' | 'user_id' | 'created_at'>>
  ): Memory | null {
    const memory = this.getMemory(userId, memoryId);
    if (!memory) return null;

    if (updates.key !== undefined) memory.key = updates.key.trim();
    if (updates.value !== undefined) memory.value = updates.value.trim();
    if (updates.category !== undefined) memory.category = updates.category;
    if (updates.project_id !== undefined) memory.project_id = updates.project_id;
    if (updates.source !== undefined) memory.source = updates.source;

    memory.updated_at = new Date().toISOString();
    this.persist();
    return memory;
  }

  deleteMemory(userId: string, memoryId: string): boolean {
    const index = this.data.memories.findIndex((m) => m.id === memoryId && m.user_id === userId);
    if (index === -1) return false;
    this.data.memories.splice(index, 1);
    this.persist();
    return true;
  }

  clearMemories(userId: string, projectId?: string | null): number {
    const initialCount = this.data.memories.length;
    this.data.memories = this.data.memories.filter((m) => {
      if (m.user_id !== userId) return true;
      if (projectId !== undefined) {
        return m.project_id !== projectId;
      }
      return false; // delete all for user if no projectId specified
    });
    const deletedCount = initialCount - this.data.memories.length;
    this.persist();
    return deletedCount;
  }

  // ==========================================
  // --- Hynex Agent Task Methods ---
  // ==========================================

  getAgentTasks(userId: string, projectId?: string | null): AgentTask[] {
    return this.data.agent_tasks
      .filter((t) => {
        if (t.user_id !== userId) return false;
        if (projectId !== undefined) {
          return t.project_id === projectId;
        }
        return true;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  getAgentTask(userId: string, taskId: string): AgentTask | null {
    return this.data.agent_tasks.find((t) => t.id === taskId && t.user_id === userId) || null;
  }

  createAgentTask(
    userId: string,
    data: {
      title: string;
      goal: string;
      project_id?: string | null;
      status?: AgentTask['status'];
      steps?: AgentStep[];
      requires_confirmation?: boolean;
      confirmation_action?: AgentTask['confirmation_action'];
    }
  ): AgentTask {
    const now = new Date().toISOString();
    const newTask: AgentTask = {
      id: `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      user_id: userId,
      project_id: data.project_id || null,
      title: data.title.trim(),
      goal: data.goal.trim(),
      status: data.status || 'planned',
      steps: data.steps || [],
      requires_confirmation: data.requires_confirmation ?? false,
      confirmation_action: data.confirmation_action || null,
      is_confirmed: false,
      result: null,
      error: null,
      created_at: now,
      updated_at: now,
    };
    this.data.agent_tasks.unshift(newTask);
    this.persist();
    return newTask;
  }

  updateAgentTask(
    userId: string,
    taskId: string,
    updates: Partial<Omit<AgentTask, 'id' | 'user_id' | 'created_at'>>
  ): AgentTask | null {
    const task = this.getAgentTask(userId, taskId);
    if (!task) return null;

    if (updates.title !== undefined) task.title = updates.title.trim();
    if (updates.goal !== undefined) task.goal = updates.goal.trim();
    if (updates.project_id !== undefined) task.project_id = updates.project_id;
    if (updates.status !== undefined) task.status = updates.status;
    if (updates.steps !== undefined) task.steps = updates.steps;
    if (updates.requires_confirmation !== undefined) task.requires_confirmation = updates.requires_confirmation;
    if (updates.confirmation_action !== undefined) task.confirmation_action = updates.confirmation_action;
    if (updates.is_confirmed !== undefined) task.is_confirmed = updates.is_confirmed;
    if (updates.result !== undefined) task.result = updates.result;
    if (updates.error !== undefined) task.error = updates.error;

    task.updated_at = new Date().toISOString();
    this.persist();
    return task;
  }

  deleteAgentTask(userId: string, taskId: string): boolean {
    const index = this.data.agent_tasks.findIndex((t) => t.id === taskId && t.user_id === userId);
    if (index === -1) return false;
    this.data.agent_tasks.splice(index, 1);
    this.persist();
    return true;
  }

  // ==========================================
  // --- User Files Isolation Methods ---
  // ==========================================

  getUserFiles(userId: string, projectId?: string | null): UserFile[] {
    return this.data.user_files
      .filter((f) => {
        if (f.user_id !== userId) return false;
        if (projectId !== undefined) {
          return f.project_id === projectId;
        }
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  createUserFile(
    userId: string,
    data: {
      name: string;
      mime_type: string;
      size: number;
      url: string;
      project_id?: string | null;
    }
  ): UserFile {
    const now = new Date().toISOString();
    const newFile: UserFile = {
      id: `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      user_id: userId,
      project_id: data.project_id || null,
      name: data.name,
      mime_type: data.mime_type,
      size: data.size,
      url: data.url,
      created_at: now,
    };
    this.data.user_files.unshift(newFile);
    this.persist();
    return newFile;
  }

  deleteUserFile(userId: string, fileId: string): boolean {
    const index = this.data.user_files.findIndex((f) => f.id === fileId && f.user_id === userId);
    if (index === -1) return false;
    this.data.user_files.splice(index, 1);
    this.persist();
    return true;
  }

  // ==========================================
  // --- Seed Initial Community Templates ---
  // ==========================================

  private seedCommunityTemplatesIfEmpty() {
    if (this.data.community_templates.length > 0) return;
    const initialTemplates: CommunityTemplate[] = [
      {
        id: 'tpl_youtube_faceless',
        title: 'Faceless YouTube Documentary Creator',
        description: 'Complete pipeline for generating an engaging 60-second historical or scientific video short with scripts, visuals, subtitles, and reel assembly.',
        category: 'YouTube',
        creator_name: 'Hynex Media Labs',
        tools: ['Gemini 3.1 Flash', 'Nano Banana 2.1', 'Veo 3', 'FFmpeg Stitcher'],
        inputs: [
          { key: 'topic', label: 'Video Subject / Mystery', type: 'text', default: 'The Apollo 11 Guidance Computer Glitch' },
          { key: 'target_length', label: 'Duration (seconds)', type: 'number', default: 60 }
        ],
        outputs: ['Screenplay', 'Scene Keyframes', 'Animated Video Clips', 'SRT Subtitles', 'Stitched Reel'],
        config: { targetSceneCount: 4, aspectRatio: '9:16', style: 'Cinematic Documentary' },
        clone_count: 342,
        is_official: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'tpl_brand_launch',
        title: 'One-Prompt Brand Launch Suite',
        description: 'Generates brand identity, logo concepts, landing page copy, product descriptions, marketing campaigns, and video teaser prompts.',
        category: 'Marketing',
        creator_name: 'Hynex Strategy Group',
        tools: ['Gemini 3.1 Flash Lite', 'TruthCheck Grounding', 'Nano Banana 2.1'],
        inputs: [
          { key: 'brand_idea', label: 'Brand Concept & Target Market', type: 'text', default: 'Ergonomic bamboo smart desk for remote workers' },
          { key: 'tone', label: 'Brand Voice', type: 'select', default: 'Premium, modern, mindful' }
        ],
        outputs: ['Brand Guide', 'Logo Prompts', 'Web Copy', '3 Product Summaries', 'Social Posts', 'Launch Calendar'],
        config: { deliverablesCount: 6, autoDependencyLink: true },
        clone_count: 518,
        is_official: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'tpl_academic_factcheck',
        title: 'TruthCheck Research & Claim Verification',
        description: 'Extracts empirical claims from any text or research paper, cross-references live search sources, and produces a factual verification matrix.',
        category: 'Research',
        creator_name: 'Hynex Verification Engine',
        tools: ['TruthCheck Engine', 'Google Search Grounding'],
        inputs: [
          { key: 'source_text', label: 'Claim or Document Text', type: 'textarea', default: 'Quantum dot solar cells have achieved 45% laboratory efficiency.' }
        ],
        outputs: ['Claim Breakdown', 'Evidence Comparison', 'Conflicting Sources Report', 'Citation Links'],
        config: { searchDepth: 'deep' },
        clone_count: 289,
        is_official: true,
        created_at: new Date().toISOString(),
      },
      {
        id: 'tpl_game_character_dna',
        title: 'RPG Character Lore & Visual DNA Matrix',
        description: 'Builds deep character profiles with visual traits, costume specs, backstory arcs, dialogue mannerisms, and reference portraits.',
        category: 'Design',
        creator_name: 'Hynex Creative Studio',
        tools: ['Creator DNA', 'Nano Banana 2.1 (2K Upscale)'],
        inputs: [
          { key: 'character_concept', label: 'Character Archetype', type: 'text', default: 'Cyber-shaman wandering neon ruins' }
        ],
        outputs: ['Lore Bio', 'Visual Trait Guide', 'Color Palette', 'Consistency Anchor Prompts'],
        config: { autoApplyToProject: true },
        clone_count: 412,
        is_official: true,
        created_at: new Date().toISOString(),
      },
    ];

    this.data.community_templates = initialTemplates;
    this.persist();
  }

  // ==========================================
  // --- Project Twin & Context Enhancements ---
  // ==========================================

  addProjectDecision(
    userId: string,
    projectId: string,
    decision: { title: string; description: string; category?: string; status?: ProjectDecision['status'] }
  ): ProjectDecision | null {
    const project = this.getProject(userId, projectId);
    if (!project) return null;

    project.decisions = project.decisions || [];
    const newDecision: ProjectDecision = {
      id: `dec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      title: decision.title.trim(),
      description: decision.description.trim(),
      category: decision.category || 'general',
      status: decision.status || 'suggested',
      approved_at: decision.status === 'approved' ? new Date().toISOString() : undefined,
      created_at: new Date().toISOString(),
    };
    project.decisions.unshift(newDecision);
    this.logProjectActivity(projectId, userId, 'added_decision', `Added decision: "${newDecision.title}"`);
    this.persist();
    return newDecision;
  }

  updateProjectDecision(
    userId: string,
    projectId: string,
    decisionId: string,
    updates: Partial<Omit<ProjectDecision, 'id' | 'created_at'>>
  ): ProjectDecision | null {
    const project = this.getProject(userId, projectId);
    if (!project || !project.decisions) return null;

    const dec = project.decisions.find((d) => d.id === decisionId);
    if (!dec) return null;

    if (updates.title !== undefined) dec.title = updates.title.trim();
    if (updates.description !== undefined) dec.description = updates.description.trim();
    if (updates.category !== undefined) dec.category = updates.category;
    if (updates.status !== undefined) {
      dec.status = updates.status;
      if (updates.status === 'approved' && !dec.approved_at) {
        dec.approved_at = new Date().toISOString();
      }
    }

    this.logProjectActivity(projectId, userId, 'updated_decision', `Updated decision: "${dec.title}" (${dec.status})`);
    this.persist();
    return dec;
  }

  deleteProjectDecision(userId: string, projectId: string, decisionId: string): boolean {
    const project = this.getProject(userId, projectId);
    if (!project || !project.decisions) return false;

    const index = project.decisions.findIndex((d) => d.id === decisionId);
    if (index === -1) return false;
    project.decisions.splice(index, 1);
    this.persist();
    return true;
  }

  createProjectVersion(userId: string, projectId: string, changelog: string): ProjectVersion | null {
    const project = this.getProject(userId, projectId);
    if (!project) return null;

    project.versions = project.versions || [];
    const nextVer = project.versions.length + 1;
    const version: ProjectVersion = {
      id: `ver_${Date.now()}_v${nextVer}`,
      project_id: projectId,
      version_number: nextVer,
      snapshot: {
        title: project.title,
        description: project.description,
        instructions: project.instructions,
        script: project.script,
        scenesCount: project.scenes.length,
        characterRefsCount: project.character_refs.length,
        decisions: project.decisions || [],
        deliverables: project.deliverables || [],
      },
      changelog: changelog.trim() || `Version ${nextVer} checkpoint`,
      created_at: new Date().toISOString(),
    };
    project.versions.unshift(version);
    this.logProjectActivity(projectId, userId, 'created_version', `Created snapshot v${nextVer}: ${version.changelog}`);
    this.persist();
    return version;
  }

  getProjectVersions(userId: string, projectId: string): ProjectVersion[] {
    const project = this.getProject(userId, projectId);
    if (!project) return [];
    return project.versions || [];
  }

  logProjectActivity(projectId: string, userId: string, action: string, details?: string, userName?: string): ProjectActivity {
    const activity: ProjectActivity = {
      id: `act_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      project_id: projectId,
      user_id: userId,
      user_name: userName,
      action,
      details,
      created_at: new Date().toISOString(),
    };

    const project = this.data.projects.find((p) => p.id === projectId);
    if (project) {
      project.activity = project.activity || [];
      project.activity.unshift(activity);
      if (project.activity.length > 100) {
        project.activity = project.activity.slice(0, 100);
      }
      this.persist();
    }
    return activity;
  }

  getProjectActivity(userId: string, projectId: string): ProjectActivity[] {
    const project = this.getProject(userId, projectId);
    if (!project) return [];
    return project.activity || [];
  }

  checkProjectConsistency(
    userId: string,
    projectId: string
  ): {
    issues: Array<{ id: string; type: 'outdated_reference' | 'missing_dependency' | 'conflicting_decision'; description: string; affected_assets: string[]; suggested_fix: string }>;
    overall_health: number;
  } {
    const project = this.getProject(userId, projectId);
    if (!project) throw new Error('Project not found');

    const issues: Array<{ id: string; type: 'outdated_reference' | 'missing_dependency' | 'conflicting_decision'; description: string; affected_assets: string[]; suggested_fix: string }> = [];

    // 1. Check decisions for unconfirmed items
    const unconfirmed = (project.decisions || []).filter((d) => d.status === 'unconfirmed' || d.status === 'suggested');
    if (unconfirmed.length > 0) {
      issues.push({
        id: `iss_dec_${Date.now()}`,
        type: 'conflicting_decision',
        description: `There are ${unconfirmed.length} pending decision(s) that need user approval to solidify project context.`,
        affected_assets: unconfirmed.map((d) => d.title),
        suggested_fix: 'Review and approve or reject suggested decisions in Project Twin.',
      });
    }

    // 2. Check scene consistency with registered characters
    const characterNames = project.character_refs.map((c) => c.name.toLowerCase());
    const scenesWithoutChars = project.scenes.filter((s) => {
      const text = `${s.description} ${s.image_prompt} ${s.dialogue || ''}`.toLowerCase();
      return !characterNames.some((name) => text.includes(name));
    });

    if (characterNames.length > 0 && scenesWithoutChars.length > 0) {
      issues.push({
        id: `iss_char_${Date.now()}`,
        type: 'outdated_reference',
        description: `${scenesWithoutChars.length} scene(s) do not explicitly mention approved character references from the library.`,
        affected_assets: scenesWithoutChars.map((s) => `Scene ${s.scene_number}: ${s.title}`),
        suggested_fix: 'Inject approved character references into scene visual prompts to maintain visual continuity.',
      });
    }

    // 3. Check deliverables dependencies
    const deliverables = project.deliverables || [];
    deliverables.forEach((deliv) => {
      if (deliv.dependencies && deliv.dependencies.length > 0) {
        const missingDeps = deliv.dependencies.filter((depId) => {
          const parent = deliverables.find((d) => d.id === depId);
          return !parent || parent.status !== 'completed' && parent.status !== 'approved';
        });
        if (missingDeps.length > 0) {
          issues.push({
            id: `iss_dep_${deliv.id}`,
            type: 'missing_dependency',
            description: `Deliverable "${deliv.title}" depends on upstream items that are not yet approved.`,
            affected_assets: [deliv.title],
            suggested_fix: 'Complete or approve upstream prerequisite deliverables before finalizing this asset.',
          });
        }
      }
    });

    const overall_health = Math.max(0, 100 - issues.length * 20);
    return { issues, overall_health };
  }

  // ==========================================
  // --- Creator DNA Profiles ---
  // ==========================================

  getDefaultCreatorDNA(userId: string): CreatorDNA | null {
    const list = this.getCreatorDNAs(userId);
    return list.find((d) => d.is_default) || list[0] || null;
  }

  getCreatorDNAs(userId: string): CreatorDNA[] {
    return this.data.creator_dnas
      .filter((d) => d.user_id === userId)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  getCreatorDNA(userId: string, id: string): CreatorDNA | null {
    return this.data.creator_dnas.find((d) => d.id === id && d.user_id === userId) || null;
  }

  createCreatorDNA(
    userId: string,
    data: {
      name: string;
      niche?: string;
      target_audience?: string;
      language?: string;
      writing_style?: string;
      visual_style?: string;
      brand_colors?: string[];
      typography?: string;
      aspect_ratio?: CreatorDNA['aspect_ratio'];
      caption_preferences?: string;
      character_refs?: CharacterRef[];
      is_default?: boolean;
    }
  ): CreatorDNA {
    const now = new Date().toISOString();
    const isFirst = this.data.creator_dnas.filter((d) => d.user_id === userId).length === 0;

    const newDNA: CreatorDNA = {
      id: `dna_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      user_id: userId,
      name: data.name.trim() || 'My Creator Persona',
      niche: data.niche?.trim() || 'General Creative',
      target_audience: data.target_audience?.trim() || 'Global Audience',
      language: data.language?.trim() || 'English',
      writing_style: data.writing_style?.trim() || 'Cinematic, compelling, clear',
      visual_style: data.visual_style?.trim() || 'High-end cinematic 8K, volumetric lighting',
      brand_colors: data.brand_colors || ['#6366f1', '#10b981', '#0ea5e9'],
      typography: data.typography?.trim() || 'Plus Jakarta Sans & JetBrains Mono',
      aspect_ratio: data.aspect_ratio || '16:9',
      caption_preferences: data.caption_preferences?.trim() || 'Clean synchronized subtitles with speaker labels',
      character_refs: data.character_refs || [],
      is_default: data.is_default !== undefined ? data.is_default : isFirst,
      created_at: now,
      updated_at: now,
    };

    if (newDNA.is_default) {
      this.data.creator_dnas.forEach((d) => {
        if (d.user_id === userId) d.is_default = false;
      });
    }

    this.data.creator_dnas.unshift(newDNA);
    this.persist();
    return newDNA;
  }

  updateCreatorDNA(
    userId: string,
    id: string,
    updates: Partial<Omit<CreatorDNA, 'id' | 'user_id' | 'created_at'>>
  ): CreatorDNA | null {
    const dna = this.getCreatorDNA(userId, id);
    if (!dna) return null;

    if (updates.name !== undefined) dna.name = updates.name.trim();
    if (updates.niche !== undefined) dna.niche = updates.niche.trim();
    if (updates.target_audience !== undefined) dna.target_audience = updates.target_audience.trim();
    if (updates.language !== undefined) dna.language = updates.language.trim();
    if (updates.writing_style !== undefined) dna.writing_style = updates.writing_style.trim();
    if (updates.visual_style !== undefined) dna.visual_style = updates.visual_style.trim();
    if (updates.brand_colors !== undefined) dna.brand_colors = updates.brand_colors;
    if (updates.typography !== undefined) dna.typography = updates.typography.trim();
    if (updates.aspect_ratio !== undefined) dna.aspect_ratio = updates.aspect_ratio;
    if (updates.caption_preferences !== undefined) dna.caption_preferences = updates.caption_preferences.trim();
    if (updates.character_refs !== undefined) dna.character_refs = updates.character_refs;

    if (updates.is_default) {
      this.data.creator_dnas.forEach((d) => {
        if (d.user_id === userId) d.is_default = false;
      });
      dna.is_default = true;
    }

    dna.updated_at = new Date().toISOString();
    this.persist();
    return dna;
  }

  deleteCreatorDNA(userId: string, id: string): boolean {
    const index = this.data.creator_dnas.findIndex((d) => d.id === id && d.user_id === userId);
    if (index === -1) return false;
    this.data.creator_dnas.splice(index, 1);
    this.persist();
    return true;
  }

  // ==========================================
  // --- Workflow Recorder & Execution ---
  // ==========================================

  getWorkflows(userId: string, projectId?: string | null): WorkflowDef[] {
    return this.data.workflows
      .filter((w) => {
        if (w.user_id !== userId) return false;
        if (projectId !== undefined) return w.project_id === projectId;
        return true;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  getWorkflow(userId: string, id: string): WorkflowDef | null {
    return this.data.workflows.find((w) => w.id === id && w.user_id === userId) || null;
  }

  createWorkflow(
    userId: string,
    data: {
      name: string;
      description?: string;
      project_id?: string | null;
      inputs?: WorkflowDef['inputs'];
      steps?: WorkflowDef['steps'];
    }
  ): WorkflowDef {
    const now = new Date().toISOString();
    const wf: WorkflowDef = {
      id: `wf_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      user_id: userId,
      project_id: data.project_id || null,
      name: data.name.trim() || 'Untitled Workflow',
      description: data.description?.trim() || '',
      inputs: data.inputs || [],
      steps: data.steps || [],
      created_at: now,
      updated_at: now,
    };
    this.data.workflows.unshift(wf);
    this.persist();
    return wf;
  }

  updateWorkflow(
    userId: string,
    id: string,
    updates: Partial<Omit<WorkflowDef, 'id' | 'user_id' | 'created_at'>>
  ): WorkflowDef | null {
    const wf = this.getWorkflow(userId, id);
    if (!wf) return null;

    if (updates.name !== undefined) wf.name = updates.name.trim();
    if (updates.description !== undefined) wf.description = updates.description.trim();
    if (updates.inputs !== undefined) wf.inputs = updates.inputs;
    if (updates.steps !== undefined) wf.steps = updates.steps;
    if (updates.project_id !== undefined) wf.project_id = updates.project_id;

    wf.updated_at = new Date().toISOString();
    this.persist();
    return wf;
  }

  deleteWorkflow(userId: string, id: string): boolean {
    const index = this.data.workflows.findIndex((w) => w.id === id && w.user_id === userId);
    if (index === -1) return false;
    this.data.workflows.splice(index, 1);
    this.persist();
    return true;
  }

  createWorkflowExecution(
    userId: string,
    data: { workflow_id: string; project_id?: string | null; inputs?: Record<string, any> }
  ): WorkflowExecution {
    const now = new Date().toISOString();
    const exec: WorkflowExecution = {
      id: `exec_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      workflow_id: data.workflow_id,
      user_id: userId,
      project_id: data.project_id || null,
      status: 'pending',
      inputs: data.inputs || {},
      current_step_index: 0,
      step_results: {},
      created_at: now,
      updated_at: now,
    };
    this.data.workflow_executions.unshift(exec);
    this.persist();
    return exec;
  }

  getWorkflowExecution(userId: string, id: string): WorkflowExecution | null {
    return this.data.workflow_executions.find((e) => e.id === id && e.user_id === userId) || null;
  }

  updateWorkflowExecution(
    userId: string,
    id: string,
    updates: Partial<Omit<WorkflowExecution, 'id' | 'user_id' | 'workflow_id' | 'created_at'>>
  ): WorkflowExecution | null {
    const exec = this.getWorkflowExecution(userId, id);
    if (!exec) return null;

    if (updates.status !== undefined) exec.status = updates.status;
    if (updates.current_step_index !== undefined) exec.current_step_index = updates.current_step_index;
    if (updates.step_results !== undefined) exec.step_results = updates.step_results;

    exec.updated_at = new Date().toISOString();
    this.persist();
    return exec;
  }

  getWorkflowExecutions(userId: string, workflowId?: string): WorkflowExecution[] {
    return this.data.workflow_executions
      .filter((e) => {
        if (e.user_id !== userId) return false;
        if (workflowId) return e.workflow_id === workflowId;
        return true;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // ==========================================
  // --- Collab & Team Workspace ---
  // ==========================================

  getCollabMembers(projectId: string): CollabMember[] {
    return this.data.collab_members.filter((m) => m.project_id === projectId);
  }

  inviteCollabMember(
    invitedByUserId: string,
    projectId: string,
    email: string,
    role: CollabMember['role'] = 'editor'
  ): CollabMember {
    const existing = this.data.collab_members.find(
      (m) => m.project_id === projectId && m.email.toLowerCase() === email.trim().toLowerCase()
    );
    if (existing) {
      existing.role = role;
      this.persist();
      return existing;
    }

    const member: CollabMember = {
      id: `collab_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      project_id: projectId,
      email: email.trim().toLowerCase(),
      role,
      status: 'pending',
      invited_by: invitedByUserId,
      created_at: new Date().toISOString(),
    };
    this.data.collab_members.unshift(member);
    this.logProjectActivity(projectId, invitedByUserId, 'invited_member', `Invited ${member.email} as ${role}`);
    this.persist();
    return member;
  }

  removeCollabMember(userId: string, memberId: string): boolean {
    const index = this.data.collab_members.findIndex((m) => m.id === memberId);
    if (index === -1) return false;
    const member = this.data.collab_members[index];
    this.data.collab_members.splice(index, 1);
    this.logProjectActivity(member.project_id, userId, 'removed_member', `Removed ${member.email}`);
    this.persist();
    return true;
  }

  checkProjectAccess(
    userId: string,
    userEmail: string,
    projectId: string
  ): { hasAccess: boolean; role: 'owner' | 'editor' | 'reviewer' | 'viewer' | null } {
    const project = this.data.projects.find((p) => p.id === projectId);
    if (!project) return { hasAccess: false, role: null };

    if (project.user_id === userId) {
      return { hasAccess: true, role: 'owner' };
    }

    const collab = this.data.collab_members.find(
      (m) => m.project_id === projectId && m.email.toLowerCase() === userEmail.toLowerCase()
    );
    if (collab && collab.status !== 'declined') {
      return { hasAccess: true, role: collab.role };
    }

    return { hasAccess: false, role: null };
  }

  getProjectComments(projectId: string): ProjectComment[] {
    return this.data.project_comments
      .filter((c) => c.project_id === projectId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  addProjectComment(
    projectId: string,
    userId: string,
    userName: string,
    text: string,
    assetId?: string
  ): ProjectComment {
    const comment: ProjectComment = {
      id: `comment_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      project_id: projectId,
      asset_id: assetId,
      user_id: userId,
      user_name: userName,
      text: text.trim(),
      resolved: false,
      created_at: new Date().toISOString(),
    };
    this.data.project_comments.unshift(comment);
    this.logProjectActivity(projectId, userId, 'added_comment', `Commented: "${text.slice(0, 40)}..."`, userName);
    this.persist();
    return comment;
  }

  resolveProjectComment(projectId: string, commentId: string, resolved = true): boolean {
    const comment = this.data.project_comments.find((c) => c.id === commentId && c.project_id === projectId);
    if (!comment) return false;
    comment.resolved = resolved;
    this.persist();
    return true;
  }

  // ==========================================
  // --- Mini Apps Builder ---
  // ==========================================

  getMiniApps(userId: string, publishedOnly = false): MiniApp[] {
    return this.data.mini_apps
      .filter((app) => {
        if (publishedOnly) return app.is_published;
        return app.user_id === userId || app.is_published;
      })
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  getMiniApp(id: string): MiniApp | null {
    return this.data.mini_apps.find((a) => a.id === id) || null;
  }

  createMiniApp(
    userId: string,
    data: {
      name: string;
      description?: string;
      inputs?: MiniApp['inputs'];
      output_format?: MiniApp['output_format'];
      instructions?: string;
      capabilities?: string[];
      is_published?: boolean;
    }
  ): MiniApp {
    const now = new Date().toISOString();
    const mini: MiniApp = {
      id: `mini_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      user_id: userId,
      name: data.name.trim() || 'Untitled Mini App',
      description: data.description?.trim() || '',
      inputs: data.inputs || [],
      output_format: data.output_format || 'markdown',
      instructions: data.instructions?.trim() || '',
      capabilities: data.capabilities || ['text_generation'],
      is_published: Boolean(data.is_published),
      run_count: 0,
      created_at: now,
      updated_at: now,
    };
    this.data.mini_apps.unshift(mini);
    this.persist();
    return mini;
  }

  updateMiniApp(
    userId: string,
    id: string,
    updates: Partial<Omit<MiniApp, 'id' | 'user_id' | 'created_at'>>
  ): MiniApp | null {
    const mini = this.data.mini_apps.find((a) => a.id === id && a.user_id === userId);
    if (!mini) return null;

    if (updates.name !== undefined) mini.name = updates.name.trim();
    if (updates.description !== undefined) mini.description = updates.description.trim();
    if (updates.inputs !== undefined) mini.inputs = updates.inputs;
    if (updates.output_format !== undefined) mini.output_format = updates.output_format;
    if (updates.instructions !== undefined) mini.instructions = updates.instructions.trim();
    if (updates.capabilities !== undefined) mini.capabilities = updates.capabilities;
    if (updates.is_published !== undefined) mini.is_published = updates.is_published;

    mini.updated_at = new Date().toISOString();
    this.persist();
    return mini;
  }

  deleteMiniApp(userId: string, id: string): boolean {
    const index = this.data.mini_apps.findIndex((a) => a.id === id && a.user_id === userId);
    if (index === -1) return false;
    this.data.mini_apps.splice(index, 1);
    this.persist();
    return true;
  }

  incrementMiniAppRun(id: string): void {
    const mini = this.data.mini_apps.find((a) => a.id === id);
    if (mini) {
      mini.run_count = (mini.run_count || 0) + 1;
      this.persist();
    }
  }

  // ==========================================
  // --- Share-to-Create ---
  // ==========================================

  createSharedPage(
    userId: string,
    data: {
      target_type: SharedPage['target_type'];
      target_id: string;
      title: string;
      description?: string;
      public_data: any;
      visibility?: SharedPage['visibility'];
      allow_remix?: boolean;
    }
  ): SharedPage {
    const page: SharedPage = {
      id: `share_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      user_id: userId,
      target_type: data.target_type,
      target_id: data.target_id,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      public_data: data.public_data,
      visibility: data.visibility || 'link',
      allow_remix: data.allow_remix !== undefined ? data.allow_remix : true,
      view_count: 0,
      created_at: new Date().toISOString(),
    };
    this.data.shared_pages.unshift(page);
    this.persist();
    return page;
  }

  getSharedPage(id: string): SharedPage | null {
    const page = this.data.shared_pages.find((p) => p.id === id);
    if (!page) return null;
    page.view_count = (page.view_count || 0) + 1;
    this.persist();
    return page;
  }

  deleteSharedPage(userId: string, id: string): boolean {
    const index = this.data.shared_pages.findIndex((p) => p.id === id && p.user_id === userId);
    if (index === -1) return false;
    this.data.shared_pages.splice(index, 1);
    this.persist();
    return true;
  }

  getUserSharedPages(userId: string): SharedPage[] {
    return this.data.shared_pages.filter((p) => p.user_id === userId);
  }

  // ==========================================
  // --- Community Templates ---
  // ==========================================

  getCommunityTemplates(category?: string, search?: string): CommunityTemplate[] {
    let list = [...this.data.community_templates];
    if (category && category !== 'All') {
      list = list.filter((t) => t.category.toLowerCase() === category.toLowerCase());
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.clone_count - a.clone_count);
  }

  getCommunityTemplate(id: string): CommunityTemplate | null {
    return this.data.community_templates.find((t) => t.id === id) || null;
  }

  incrementTemplateClone(id: string): void {
    const tpl = this.data.community_templates.find((t) => t.id === id);
    if (tpl) {
      tpl.clone_count = (tpl.clone_count || 0) + 1;
      this.persist();
    }
  }

  // ==========================================
  // --- TruthCheck Reports ---
  // ==========================================

  saveTruthCheckReport(
    userId: string,
    data: {
      message_id?: string;
      target_text: string;
      claim_verifications: TruthCheckReport['claim_verifications'];
      overall_score?: number;
    }
  ): TruthCheckReport {
    const report: TruthCheckReport = {
      id: `tc_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      user_id: userId,
      message_id: data.message_id,
      target_text: data.target_text,
      claim_verifications: data.claim_verifications,
      overall_score: data.overall_score || 85,
      created_at: new Date().toISOString(),
    };
    this.data.truthcheck_reports.unshift(report);
    if (this.data.truthcheck_reports.length > 200) {
      this.data.truthcheck_reports = this.data.truthcheck_reports.slice(0, 200);
    }
    this.persist();
    return report;
  }

  getTruthCheckReports(userId: string): TruthCheckReport[] {
    return this.data.truthcheck_reports.filter((r) => r.user_id === userId);
  }

  listResearchReports(userId: string): ResearchReport[] {
    return (this.data.research_reports || []).filter((r) => r.user_id === userId);
  }

  saveResearchReport(report: any): ResearchReport {
    if (!this.data.research_reports) this.data.research_reports = [];
    const saved: ResearchReport = {
      id: report.id || `res_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      user_id: report.user_id || report.userId || 'guest_user',
      query: report.query || report.title || '',
      report_markdown: report.report_markdown || report.content || '',
      sources: report.sources || [],
      findings: report.findings || [],
      created_at: report.created_at || new Date().toISOString(),
    };
    this.data.research_reports.unshift(saved);
    this.persist();
    return saved;
  }

  deleteResearchReport(userId: string, id: string): boolean {
    if (!this.data.research_reports) return false;
    const idx = this.data.research_reports.findIndex((r) => r.id === id && r.user_id === userId);
    if (idx === -1) return false;
    this.data.research_reports.splice(idx, 1);
    this.persist();
    return true;
  }

  getTruthCheckReport(userId: string, id: string): TruthCheckReport | null {
    return this.data.truthcheck_reports.find((r) => r.id === id && r.user_id === userId) || null;
  }
}

export const db = new DatabaseService();
