import {
  AdminAuditLog,
  AdminStats,
  AppSetting,
  Conversation,
  GeneratedImage,
  UsageState,
  User,
  UserChatHistory,
  AdRewardResponse,
  Project,
  Scene,
  CharacterRef,
  MemoryItem,
  AgentTask,
  ProjectDecision,
  ProjectVersion,
  ProjectActivity,
  CreatorDNA,
  WorkflowDef,
  WorkflowExecution,
  CollabMember,
  ProjectComment,
  MiniApp,
  SharedPage,
  CommunityTemplate,
  TruthCheckReport,
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
      upscale?: boolean;
      imageSize?: '1K' | '2K' | '4K';
    }) =>
      request<{
        image: GeneratedImage;
        remainingQuota: number;
        finalPrompt?: string;
        originalPrompt?: string;
        wasEnhanced?: boolean;
        imageSize?: string;
        upscale?: boolean;
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

  music: {
    generate: (body: {
      prompt: string;
      duration?: 'clip' | 'pro';
      genre?: string;
      imageAttachment?: string;
    }) =>
      request<{
        track: {
          id: string;
          title: string;
          prompt: string;
          model: 'lyria-3-clip-preview' | 'lyria-3-pro-preview';
          durationSeconds: number;
          genre: string;
          bpm: number;
          audioUrl: string;
          createdAt: string;
          lyrics?: string;
        };
        remainingQuota: number;
      }>('/api/music/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    list: () =>
      request<{
        tracks: Array<{
          id: string;
          title: string;
          prompt: string;
          model: 'lyria-3-clip-preview' | 'lyria-3-pro-preview';
          durationSeconds: number;
          genre: string;
          bpm: number;
          audioUrl: string;
          createdAt: string;
          lyrics?: string;
        }>;
      }>('/api/music/list'),
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

    visionQuery: (body: {
      prompt: string;
      imageBase64: string;
      voice?: string;
      language?: string;
    }) =>
      request<{ text: string; audioBase64: string; mimeType: string }>('/api/voice/vision-query', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  usage: {
    get: () => request<UsageState>('/api/usage'),
  },

  ads: {
    getConfig: () =>
      request<{
        enabled: boolean;
        gameId: string;
        placementId: string;
        rewardAmount: number;
        provider: string;
      }>('/api/ads/config'),
    claimReward: (rewardType: 'text' | 'image' | 'video' | 'text_to_video' | 'image_to_video') =>
      request<AdRewardResponse>('/api/ads/reward', {
        method: 'POST',
        body: JSON.stringify({ rewardType }),
      }),
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

  creator: {
    generateScript: (body: {
      premise: string;
      genre?: string;
      tone?: string;
      sceneCount?: number;
      characterRefs?: CharacterRef[];
    }) =>
      request<{
        title: string;
        logline: string;
        synopsis: string;
        fullScript: string;
        scenes: Scene[];
      }>('/api/creator/script/generate', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    generateSceneImage: (body: {
      prompt: string;
      aspectRatio?: string;
      model?: string;
      upscale?: boolean;
      imageSize?: '1K' | '2K' | '4K';
      characterRefs?: CharacterRef[];
    }) =>
      request<{
        imageUrl: string;
        finalPrompt: string;
        model: string;
      }>('/api/creator/scene/generate-image', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    generateSceneVideo: (body: {
      sceneId: string;
      projectId?: string;
      prompt?: string;
      imageSource?: string;
      aspectRatio?: string;
    }) =>
      request<{
        jobId: string;
        status: string;
        message: string;
      }>('/api/creator/scene/generate-video', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    getVideoStatus: (jobId: string) =>
      request<{
        jobId: string;
        status: 'generating' | 'completed' | 'failed';
        progress: number;
        videoUrl?: string;
        error?: string;
      }>(`/api/creator/scene/video-status/${jobId}`),

    exportSubtitles: (body: { scenes: Scene[]; title?: string }) =>
      request<{
        srt: string;
        vtt: string;
        txt: string;
        json: string;
      }>('/api/creator/subtitles/export', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    renderTimeline: (body: { projectId?: string; scenes: Scene[] }) =>
      request<{
        timelineUrl: string;
        timelineId: string;
        clipCount: number;
        message: string;
      }>('/api/creator/render-timeline', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
  },

  projects: {
    list: () => request<Project[]>('/api/projects'),
    get: (id: string) => request<Project>(`/api/projects/${id}`),
    create: (data: {
      title: string;
      description?: string;
      category?: Project['category'];
      status?: Project['status'];
      character_refs?: CharacterRef[];
      scenes?: Scene[];
      script?: string;
    }) =>
      request<Project>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, updates: Partial<Project>) =>
      request<Project>(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/projects/${id}`, {
        method: 'DELETE',
      }),
    resume: (id: string) =>
      request<{ project: Project; message: string }>(`/api/projects/${id}/resume`, {
        method: 'POST',
      }),
    addCharacter: (projectId: string, char: Partial<CharacterRef>) =>
      request<{ character: CharacterRef; project: Project }>(`/api/projects/${projectId}/character`, {
        method: 'POST',
        body: JSON.stringify(char),
      }),
    deleteCharacter: (projectId: string, charId: string) =>
      request<{ success: boolean; project: Project }>(`/api/projects/${projectId}/character/${charId}`, {
        method: 'DELETE',
      }),
  },

  memories: {
    list: (projectId?: string | null, globalOnly?: boolean) => {
      const params = new URLSearchParams();
      if (globalOnly) params.append('globalOnly', 'true');
      if (projectId) params.append('projectId', projectId);
      const q = params.toString() ? `?${params.toString()}` : '';
      return request<MemoryItem[]>(`/api/memories${q}`);
    },
    create: (data: {
      key: string;
      value: string;
      category?: MemoryItem['category'];
      project_id?: string | null;
      source?: MemoryItem['source'];
    }) =>
      request<MemoryItem>('/api/memories', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, updates: Partial<MemoryItem>) =>
      request<MemoryItem>(`/api/memories/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/memories/${id}`, {
        method: 'DELETE',
      }),
    clear: (projectId?: string | null, confirmed = true) =>
      request<{ success: boolean; deletedCount: number; message: string }>('/api/memories/clear', {
        method: 'POST',
        body: JSON.stringify({ projectId, confirmed }),
      }),
  },

  agent: {
    getTasks: (projectId?: string) => {
      const q = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
      return request<AgentTask[]>(`/api/agent/tasks${q}`);
    },
    createTask: (data: { goal: string; projectId?: string; isConsequentialAction?: boolean }) =>
      request<AgentTask>('/api/agent/task/create', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    executeTask: (id: string) =>
      request<{ task: AgentTask; success: boolean }>(`/api/agent/task/${id}/execute`, {
        method: 'POST',
      }),
    confirmTask: (id: string) =>
      request<{ success: boolean; message: string; task: AgentTask }>(`/api/agent/task/${id}/confirm`, {
        method: 'POST',
      }),
    cancelTask: (id: string) =>
      request<{ success: boolean; message: string; task: AgentTask }>(`/api/agent/task/${id}/cancel`, {
        method: 'POST',
      }),
    retryTask: (id: string) =>
      request<{ success: boolean; message: string; task: AgentTask }>(`/api/agent/task/${id}/retry`, {
        method: 'POST',
      }),
    deleteTask: (id: string) =>
      request<{ success: boolean; message: string }>(`/api/agent/task/${id}`, {
        method: 'DELETE',
      }),
  },

  truthCheck: {
    verify: (data: { text: string; messageId?: string }) =>
      request<{ success: boolean; report: TruthCheckReport; summary: string }>('/api/truthcheck/verify', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getReports: () =>
      request<{ reports: TruthCheckReport[] }>('/api/truthcheck/reports'),
    getReport: (id: string) =>
      request<{ report: TruthCheckReport }>(`/api/truthcheck/report/${id}`),
  },

  creatorDna: {
    list: () =>
      request<{ profiles: CreatorDNA[] }>('/api/creator-dna'),
    getDefault: () =>
      request<{ profile: CreatorDNA | null }>('/api/creator-dna/default'),
    create: (data: Partial<CreatorDNA>) =>
      request<{ profile: CreatorDNA }>('/api/creator-dna', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<CreatorDNA>) =>
      request<{ profile: CreatorDNA }>(`/api/creator-dna/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/creator-dna/${id}`, {
        method: 'DELETE',
      }),
    checkStyle: (data: { profile_id?: string; content: string }) =>
      request<{ success: boolean; result: any; profile: CreatorDNA }>('/api/creator-dna/check-style', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  workflows: {
    list: (projectId?: string) =>
      request<{ workflows: WorkflowDef[] }>(`/api/workflows${projectId ? `?project_id=${encodeURIComponent(projectId)}` : ''}`),
    get: (id: string) =>
      request<{ workflow: WorkflowDef }>(`/api/workflows/${id}`),
    create: (data: Partial<WorkflowDef>) =>
      request<{ workflow: WorkflowDef }>('/api/workflows', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<WorkflowDef>) =>
      request<{ workflow: WorkflowDef }>(`/api/workflows/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/workflows/${id}`, {
        method: 'DELETE',
      }),
    execute: (id: string, data: { inputs?: Record<string, any>; approved_steps?: string[] }) =>
      request<{ success: boolean; execution: WorkflowExecution; paused_at_step?: any; results?: Record<string, any> }>(
        `/api/workflows/${id}/execute`,
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),
    getExecution: (id: string) =>
      request<{ execution: WorkflowExecution }>(`/api/workflows/executions/${id}`),
  },

  collab: {
    getMembers: (projectId: string) =>
      request<{ members: CollabMember[]; currentUserRole: string }>(`/api/collab/projects/${projectId}/members`),
    invite: (projectId: string, email: string, role?: string) =>
      request<{ member: CollabMember }>(`/api/collab/projects/${projectId}/invite`, {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }),
    removeMember: (memberId: string) =>
      request<{ success: boolean }>(`/api/collab/members/${memberId}`, {
        method: 'DELETE',
      }),
    getComments: (projectId: string) =>
      request<{ comments: ProjectComment[] }>(`/api/collab/projects/${projectId}/comments`),
    addComment: (projectId: string, text: string, asset_id?: string) =>
      request<{ comment: ProjectComment }>(`/api/collab/projects/${projectId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ text, asset_id }),
      }),
    resolveComment: (projectId: string, commentId: string, resolved = true) =>
      request<{ success: boolean }>(`/api/collab/projects/${projectId}/comments/${commentId}/resolve`, {
        method: 'PUT',
        body: JSON.stringify({ resolved }),
      }),
  },

  miniApps: {
    list: (publishedOnly = false) =>
      request<{ miniApps: MiniApp[] }>(`/api/miniapps${publishedOnly ? '?published=true' : ''}`),
    get: (id: string) =>
      request<{ miniApp: MiniApp }>(`/api/miniapps/${id}`),
    create: (data: Partial<MiniApp>) =>
      request<{ miniApp: MiniApp }>('/api/miniapps', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<MiniApp>) =>
      request<{ miniApp: MiniApp }>(`/api/miniapps/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/miniapps/${id}`, {
        method: 'DELETE',
      }),
    run: (id: string, inputs: Record<string, any>) =>
      request<{ success: boolean; result: string; output_format: string }>(`/api/miniapps/${id}/run`, {
        method: 'POST',
        body: JSON.stringify({ inputs }),
      }),
    generate: (prompt: string) =>
      request<{ success: boolean; miniApp: MiniApp }>('/api/miniapps/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }),
  },

  share: {
    publish: (data: {
      target_type: 'image' | 'video' | 'project' | 'workflow' | 'mini_app';
      target_id: string;
      title: string;
      description?: string;
      public_data: any;
      visibility?: 'public' | 'link';
      allow_remix?: boolean;
    }) =>
      request<{ page: SharedPage; shareUrl: string }>('/api/share', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    getMy: () =>
      request<{ pages: SharedPage[] }>('/api/share/my'),
    get: (id: string) =>
      request<{ page: SharedPage }>(`/api/share/${id}`),
    remix: (id: string) =>
      request<{ success: boolean; message: string; target_type: string; resource: any }>(`/api/share/${id}/remix`, {
        method: 'POST',
      }),
    delete: (id: string) =>
      request<{ success: boolean }>(`/api/share/${id}`, {
        method: 'DELETE',
      }),
  },

  templates: {
    list: (category?: string, search?: string) => {
      const q = new URLSearchParams();
      if (category && category !== 'All') q.set('category', category);
      if (search) q.set('search', search);
      return request<{ templates: CommunityTemplate[] }>(`/api/templates?${q.toString()}`);
    },
    get: (id: string) =>
      request<{ template: CommunityTemplate }>(`/api/templates/${id}`),
    clone: (id: string) =>
      request<{ success: boolean; message: string; type: string; entity: any }>(`/api/templates/${id}/clone`, {
        method: 'POST',
      }),
  },

  onePrompt: {
    plan: (prompt: string, projectId?: string) =>
      request<{ success: boolean; plan: any; project_id: string | null }>('/api/one-prompt/plan', {
        method: 'POST',
        body: JSON.stringify({ prompt, projectId }),
      }),
  },

  projectTwin: {
    addDecision: (projectId: string, data: Partial<ProjectDecision>) =>
      request<{ decision: ProjectDecision }>(`/api/projects/${projectId}/decisions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateDecision: (projectId: string, decisionId: string, data: Partial<ProjectDecision>) =>
      request<{ decision: ProjectDecision }>(`/api/projects/${projectId}/decisions/${decisionId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    createVersion: (projectId: string, changelog?: string) =>
      request<{ version: ProjectVersion }>(`/api/projects/${projectId}/versions`, {
        method: 'POST',
        body: JSON.stringify({ changelog }),
      }),
    getVersions: (projectId: string) =>
      request<{ versions: ProjectVersion[] }>(`/api/projects/${projectId}/versions`),
    getActivity: (projectId: string) =>
      request<{ activity: ProjectActivity[] }>(`/api/projects/${projectId}/activity`),
    checkConsistency: (projectId: string) =>
      request<{ report: any }>(`/api/projects/${projectId}/consistency`),
    continueStep: (projectId: string) =>
      request<{ success: boolean; project: Project; nextStep: any }>(`/api/projects/${projectId}/continue-step`, {
        method: 'POST',
      }),
  },
};
