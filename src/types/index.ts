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
