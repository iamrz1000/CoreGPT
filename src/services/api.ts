import {
  AdminAuditLog,
  AdminStats,
  AppSetting,
  Conversation,
  GeneratedImage,
  UsageState,
  User,
  UserChatHistory,
} from '../types/index.ts';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

let inMemoryToken: string | null =
  typeof window !== 'undefined' ? localStorage.getItem('nextgen_auth_token') : null;

export function setAuthToken(token: string | null) {
  inMemoryToken = token;
  if (typeof window !== 'undefined') {
    if (token) {
      localStorage.setItem('nextgen_auth_token', token);
    } else {
      localStorage.removeItem('nextgen_auth_token');
    }
  }
}

export function getAuthToken(): string | null {
  if (!inMemoryToken && typeof window !== 'undefined') {
    inMemoryToken = localStorage.getItem('nextgen_auth_token');
  }
  return inMemoryToken;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as any || {}),
  };

  const res = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error || `HTTP ${res.status}: Request failed`, res.status);
  }

  return data as T;
}

export const api = {
  auth: {
    signup: (body: {
      displayName: string;
      email: string;
      password: string;
      confirmPassword: string;
      acceptTerms: boolean;
    }) => request<{ message: string; user: User; token: string }>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

    login: (body: { email: string; password: string; rememberMe?: boolean }) =>
      request<{ message: string; user: User; token: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    adminLogin: (body: { email: string; password: string }) =>
      request<{ message: string; user: User; token: string }>('/api/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    googleSignIn: (body: { email: string; displayName?: string; googleId?: string }) =>
      request<{ message: string; user: User; token: string }>('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    logout: () => {
      setAuthToken(null);
      return request<{ message: string }>('/api/auth/logout', { method: 'POST' });
    },

    me: () => request<{ user: User }>('/api/auth/me'),

    forgotPassword: (email: string) =>
      request<{ message: string; resetToken?: string }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (body: { token: string; newPassword: string; confirmPassword: string }) =>
      request<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    deleteAccount: () => request<{ message: string }>('/api/auth/account', { method: 'DELETE' }),
  },

  conversations: {
    list: (search?: string) => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      return request<{ conversations: Conversation[]; total: number }>(`/api/conversations${q}`);
    },

    get: (id: string) => request<{ conversation: Conversation }>(`/api/conversations/${id}`),

    create: (body: { title?: string; model?: string; systemPrompt?: string }) =>
      request<{ conversation: Conversation }>('/api/conversations', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    update: (id: string, body: { title?: string; model?: string; systemPrompt?: string }) =>
      request<{ conversation: Conversation }>(`/api/conversations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      }),

    delete: (id: string) =>
      request<{ message: string }>(`/api/conversations/${id}`, { method: 'DELETE' }),
  },

  images: {
    enhancePrompt: (body: { prompt: string; style?: string }) =>
      request<{ enhancedPrompt: string }>('/api/images/enhance-prompt', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    generate: (body: {
      prompt: string;
      aspectRatio?: string;
      conversationId?: string;
      autoEnhance?: boolean;
      style?: string;
      model?: string;
    }) =>
      request<{
        image: GeneratedImage;
        remainingQuota: number;
        finalPrompt?: string;
        originalPrompt?: string;
        wasEnhanced?: boolean;
      }>('/api/images/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    list: () => request<{ images: GeneratedImage[] }>('/api/images'),

    edit: (body: {
      prompt: string;
      base64Image: string;
      mimeType?: string;
      aspectRatio?: string;
      conversationId?: string;
    }) =>
      request<{
        image: GeneratedImage;
        finalPrompt: string;
        originalPrompt: string;
      }>('/api/images/edit', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  video: {
    generate: (body: {
      prompt?: string;
      aspectRatio?: '16:9' | '9:16';
      base64Image?: string;
      imageMimeType?: string;
    }) =>
      request<{
        video: {
          id: string;
          prompt: string;
          aspectRatio: string;
          operationName: string;
          videoUrl?: string;
          status: string;
          createdAt: string;
        };
        operationName: string;
      }>('/api/video/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    status: (body: { operationName: string; videoId?: string }) =>
      request<{ done: boolean; videoUrl?: string }>('/api/video/status', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    list: () =>
      request<{
        videos: Array<{
          id: string;
          prompt: string;
          aspectRatio: string;
          operationName: string;
          videoUrl?: string;
          status: string;
          createdAt: string;
        }>;
      }>('/api/video/list'),

    getUsage: () =>
      request<{
        isAdmin: boolean;
        textToVideoCount: number;
        textToVideoLimit: number;
        textToVideoRemaining: number;
        imageToVideoCount: number;
        imageToVideoLimit: number;
        imageToVideoRemaining: number;
        resetsAt: string;
      }>('/api/video/usage'),
  },

  voice: {
    tts: (body: { text: string; voice?: string; style?: string }) =>
      request<{ audioBase64: string; mimeType: string }>('/api/voice/tts', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    transcribe: (body: { audioBase64: string; mimeType?: string }) =>
      request<{ transcript: string }>('/api/voice/transcribe', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  usage: {
    get: () => request<UsageState>('/api/usage'),
  },

  admin: {
    overview: () => request<AdminStats>('/api/admin/overview'),

    users: (search?: string) => {
      const q = search ? `?search=${encodeURIComponent(search)}` : '';
      return request<{ users: User[]; total: number }>(`/api/admin/users${q}`);
    },

    updateUser: (
      id: string,
      updates: { status?: 'active' | 'suspended'; role?: 'user' | 'admin'; dailyQuotaOverride?: number | null }
    ) =>
      request<{ user: User }>(`/api/admin/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),

    deleteUser: (id: string) =>
      request<{ message: string }>(`/api/admin/users/${id}`, {
        method: 'DELETE',
      }),

    getUserHistory: (id: string) =>
      request<UserChatHistory>(`/api/admin/users/${id}/history`),

    settings: () => request<{ settings: Record<string, AppSetting> }>('/api/admin/settings'),

    updateSettings: (settings: Record<string, any>) =>
      request<{ message: string; settings: Record<string, AppSetting> }>('/api/admin/settings', {
        method: 'PATCH',
        body: JSON.stringify({ settings }),
      }),

    auditLogs: () => request<{ logs: AdminAuditLog[] }>('/api/admin/audit-logs'),

    setup: (setupSecret: string, email: string) =>
      request<{ message: string }>('/api/admin/setup', {
        method: 'POST',
        body: JSON.stringify({ setupSecret, email }),
      }),
  },
};
