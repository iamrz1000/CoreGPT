export interface User {
  id: string;
  email: string;
  displayName: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  dailyQuotaOverride?: number | null;
  createdAt: string;
  authType?: 'password' | 'google';
  passwordHashPreview?: string;
  conversationCount?: number;
  messageCount?: number;
  lastActive?: string;
}

export interface UserChatHistory {
  user: {
    id: string;
    email: string;
    displayName: string;
    role: string;
    status: string;
  };
  conversations: (Conversation & { messages: Message[] })[];
  totalConversations: number;
  totalMessages: number;
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
  messages?: Message[];
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

export interface UsageState {
  role: 'user' | 'admin';
  isAdmin: boolean;
  date: string;
  textCount: number;
  textLimit: number;
  textRemaining: number;
  bonusTextCredits?: number;
  imageCount: number;
  imageLimit: number;
  imageRemaining: number;
  bonusImageCredits?: number;
  resetsAt: string;
}

export interface AdRewardResponse {
  success: boolean;
  isAdmin: boolean;
  gameId?: string;
  rewardType?: string;
  creditsGranted: number;
  message: string;
  videoUsage?: {
    isAdmin: boolean;
    textToVideoCount: number;
    textToVideoLimit: number;
    textToVideoRemaining: number;
    imageToVideoCount: number;
    imageToVideoLimit: number;
    imageToVideoRemaining: number;
    resetsAt: string;
  };
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

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  messagesToday: number;
  imagesToday: number;
  totalMessages: number;
  totalImages: number;
  health: string;
  uptime: number;
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

export interface AppSetting {
  key: string;
  value: string;
  description?: string;
  updated_at: string;
}

export type ThemeAccent = 'sapphire' | 'emerald' | 'amber' | 'amethyst' | 'monochrome';

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
  linkedMemories?: MemoryItem[];
  linkedTasks?: AgentTask[];
  linkedFiles?: UserFile[];
}

export interface MemoryItem {
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
  step_results: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CollabMember {
  id: string;
  project_id: string;
  email: string;
  role: 'owner' | 'editor' | 'reviewer' | 'viewer';
  status: 'pending' | 'active' | 'declined';
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
  inputs: Array<{ key: string; label: string; type: 'text' | 'textarea' | 'select' | 'number'; placeholder?: string; default_value?: string; options?: string[] }>;
  output_format: 'markdown' | 'json' | 'html';
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
  target_type: 'image' | 'video' | 'project' | 'workflow' | 'mini_app';
  target_id: string;
  title: string;
  description: string;
  public_data: any;
  visibility: 'public' | 'link';
  allow_remix: boolean;
  view_count: number;
  created_at: string;
}

export interface CommunityTemplate {
  id: string;
  title: string;
  description: string;
  category: 'Marketing' | 'Video Production' | 'Brand Launch' | 'Software Development' | 'Content Creation' | 'Education';
  tags: string[];
  type: 'project' | 'workflow' | 'mini_app';
  preview_image?: string;
  clone_count: number;
  featured?: boolean;
  template_data: any;
  created_at: string;
}

export interface ClaimVerification {
  id: string;
  claim: string;
  status: 'supported' | 'contradicted' | 'inconclusive' | 'unverified';
  evidence: string;
  sources: Array<{ title: string; url: string; snippet?: string }>;
  uncertainty?: string;
}

export interface TruthCheckReport {
  id: string;
  user_id: string;
  message_id?: string;
  target_text: string;
  claim_verifications: ClaimVerification[];
  overall_score: number;
  created_at: string;
}

export interface ResearchSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface ResearchReport {
  id: string;
  user_id: string;
  query: string;
  title?: string;
  summary?: string;
  report_markdown?: string;
  markdown_report?: string;
  sources: ResearchSource[];
  findings: string[];
  created_at: string;
}

