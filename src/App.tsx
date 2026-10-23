import { useState, useEffect, useRef } from 'react';
import { api, ApiError, getAuthToken, setAuthToken } from './services/api.ts';
import { Conversation, Message, UsageState, User } from './types/index.ts';
import { Sidebar } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { ChatMessage } from './components/ChatMessage.tsx';
import { ChatInput } from './components/ChatInput.tsx';
import { ImageStudio } from './components/ImageStudio.tsx';
import { VideoStudio } from './components/VideoStudio.tsx';
import { VoiceConversationModal } from './components/VoiceConversationModal.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { LogoCustomizerModal } from './components/LogoCustomizerModal.tsx';
import { ThinkAiLogo } from './components/ThinkAiLogo.tsx';
import { InstallAppModal } from './components/InstallAppModal.tsx';
import { ThemeAccent } from './components/Header.tsx';
import {
  Sparkles,
  Code2,
  BookOpen,
  Languages,
  Compass,
  AlertCircle,
  X,
  Radio,
  Mic,
  Film,
  Image as ImageIcon,
  MessageSquare,
  Plus,
  Headphones,
} from 'lucide-react';

export default function App() {
  // Authentication & User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // App Layout & Mode
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'images' | 'video' | 'admin'>('chat');
  const [useSearchGrounding, setUseSearchGrounding] = useState(false);
  const [useMapsGrounding, setUseMapsGrounding] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem('nextgen_theme');
      if (saved === 'light' || saved === 'dark') return saved;
    } catch {}
    return 'dark';
  });

  // Chat & Conversation State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  // Model & Voice Config
  const [selectedModel, setSelectedModel] = useState('gemini-3.1-flash-lite');
  const [selectedLanguage, setSelectedLanguage] = useState('auto');
  const [isExperimentalMode, setIsExperimentalMode] = useState(true);
  const [voiceName, setVoiceName] = useState('Kore');

  // Quota & Usage
  const [usage, setUsage] = useState<UsageState | null>(null);

  // Modals
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Listen for native PWA beforeinstallprompt on Android & Chromium
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Theme Accent Palette
  const [themeAccent, setThemeAccent] = useState<ThemeAccent>(() => {
    try {
      const saved = localStorage.getItem('think_ai_theme_accent');
      if (saved === 'sapphire' || saved === 'emerald' || saved === 'amber' || saved === 'amethyst') {
        return saved as ThemeAccent;
      }
    } catch {}
    return 'sapphire';
  });

  // AbortController for Stop Generation
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Apply theme to document element and persist in localStorage
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('think_ai_theme', theme);
    } catch {}
  }, [theme]);

  // Apply theme accent attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme-accent', themeAccent);
    try {
      localStorage.setItem('think_ai_theme_accent', themeAccent);
    } catch {}
  }, [themeAccent]);

  // Ensure non-admins never stay on admin tab
  useEffect(() => {
    if (currentUser && currentUser.role !== 'admin' && activeTab === 'admin') {
      setActiveTab('chat');
    }
  }, [currentUser, activeTab]);

  // Initial Auth Verification
  useEffect(() => {
    api.auth
      .me()
      .then((res) => {
        setCurrentUser(res.user);
        setAuthChecked(true);
      })
      .catch(() => {
        setAuthChecked(true);
        setShowAuthModal(true);
      });
  }, []);

  // Fetch Usage State
  const refreshUsage = async () => {
    try {
      const u = await api.usage.get();
      setUsage(u);
    } catch {}
  };

  // Fetch Conversations once authenticated
  const loadConversations = async (autoSelectFirst = false) => {
    if (!currentUser) return;
    try {
      const res = await api.conversations.list();
      setConversations(res.conversations || []);
      if (autoSelectFirst && !activeConversationId && res.conversations?.length > 0) {
        selectConversation(res.conversations[0].id);
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setShowAuthModal(true);
        return;
      }
      console.warn('Could not load conversations:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadConversations(true);
      refreshUsage();
    }
  }, [currentUser]);

  // Scroll to bottom of message list
  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  };

  useEffect(() => {
    scrollToBottom(false);
  }, [messages]);

  // Select conversation and load messages
  const selectConversation = async (convId: string) => {
    setActiveConversationId(convId);
    setLoadingMessages(true);
    setStreamError(null);
    try {
      const res = await api.conversations.get(convId);
      setMessages(res.conversation.messages || []);
      if (res.conversation.model) {
        setSelectedModel(res.conversation.model);
      }
    } catch (err) {
      console.error('Failed to fetch conversation:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  // Create New Chat
  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setStreamError(null);
    setActiveTab('chat');
  };

  // Rename Conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const res = await api.conversations.update(id, { title: newTitle });
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, title: res.conversation.title } : c))
      );
    } catch (err) {
      console.error('Rename failed:', err);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await api.conversations.delete(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (err) {
      console.error('Delete conversation failed:', err);
    }
  };

  // Send message and stream SSE response
  const handleSendMessage = async (
    text: string,
    file?: { name: string; content: string; size: number }
  ) => {
    if (!text.trim() && !file) return;

    setStreamError(null);
    setIsStreaming(true);

    const tempUserMsgId = `temp-user-${Date.now()}`;
    const tempAiMsgId = `temp-ai-${Date.now()}`;

    let promptWithDoc = text;
    if (file) {
      promptWithDoc += `\n\n[Attached File: ${file.name}]\n\`\`\`\n${file.content}\n\`\`\``;
    }

    const newUserMsg: Message = {
      id: tempUserMsgId,
      conversation_id: activeConversationId || 'pending',
      role: 'user',
      content: promptWithDoc,
      model: selectedModel,
      created_at: new Date().toISOString(),
    };

    const newAiPlaceholder: Message = {
      id: tempAiMsgId,
      conversation_id: activeConversationId || 'pending',
      role: 'assistant',
      content: '',
      model: selectedModel,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMsg, newAiPlaceholder]);

    // Setup AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const token = getAuthToken();
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          conversationId: activeConversationId || undefined,
          message: text,
          model: selectedModel,
          language: selectedLanguage,
          isExperimentalMode,
          jailbreakMode: isExperimentalMode,
          useRealTime: true,
          fileAttachment: file,
          useSearchGrounding,
          useMapsGrounding,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error || `HTTP ${response.status}: Failed to generate response`,
          response.status
        );
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';
      let assignedConvId = activeConversationId;

      if (reader) {
        let isDone = false;
        while (!isDone) {
          const { value, done } = await reader.read();
          isDone = done;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const event = JSON.parse(line.slice(6));

                  if (event.type === 'meta') {
                    assignedConvId = event.conversationId;
                    setActiveConversationId(event.conversationId);
                    if (event.isNew) {
                      loadConversations(false);
                    }
                  } else if (event.type === 'image') {
                    accumulated = event.text;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === tempAiMsgId
                          ? { ...m, content: event.text, image_url: event.imageUrl }
                          : m
                      )
                    );
                    scrollToBottom(true);
                  } else if (event.type === 'chunk' && event.text) {
                    accumulated += event.text;
                    setMessages((prev) =>
                      prev.map((m) =>
                        m.id === tempAiMsgId ? { ...m, content: accumulated } : m
                      )
                    );
                    scrollToBottom(true);
                  } else if (event.type === 'error') {
                    setStreamError(event.error);
                    if (!accumulated) {
                      accumulated = `### CoreGPT\n\n${event.error || 'The assistant encountered an unexpected error.'}\n\n*Please retry your prompt or switch to another model from the header!*`;
                      setMessages((prev) =>
                        prev.map((m) =>
                          m.id === tempAiMsgId ? { ...m, content: accumulated } : m
                        )
                      );
                      scrollToBottom(true);
                    }
                  }
                } catch {}
              }
            }
          }
        }
      }

      refreshUsage();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // Stopped by user
      } else {
        const message = err instanceof Error ? err.message : 'An error occurred during response generation.';
        setStreamError(message);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAiMsgId
              ? { ...m, content: `⚠️ **Generation Error**: ${message}` }
              : m
          )
        );
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Stop Generation
  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate Response
  const handleRegenerate = () => {
    if (messages.length === 0 || isStreaming) return;
    // Find last user message
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      // Remove last assistant message
      setMessages((prev) => prev.slice(0, -1));
      handleSendMessage(lastUserMsg.content);
    }
  };

  // Edit and resubmit prompt
  const handleEditPrompt = (newPrompt: string) => {
    handleSendMessage(newPrompt);
  };

  // Logout handler
  const handleLogout = async () => {
    try {
      await api.auth.logout();
    } catch {}
    setCurrentUser(null);
    setConversations([]);
    setMessages([]);
    setActiveConversationId(null);
    setShowAuthModal(true);
  };

  const starterSuggestions = [
    {
      title: 'Live Voice Conversation',
      desc: 'Talk hands-free in real time with bidirectional duplex voice',
      icon: Mic,
      model: 'gemini-3.8-live',
      action: 'voice',
      prompt: '',
    },
    {
      title: 'Founder & Developer',
      desc: 'Founded by Umar Hani · Engineered by Ahmadraza',
      icon: Sparkles,
      model: 'gemini-3.1-flash-lite',
      prompt: 'Who founded CoreGPT and who is the developer?',
    },
    {
      title: 'Real-Time Web Intelligence',
      desc: 'Live date, time, weather, and world search integration',
      icon: Radio,
      model: 'gemini-3.1-flash-lite',
      prompt: 'What is today current date and time and what day is it?',
    },
    {
      title: 'Veo Video & Media Studio',
      desc: 'Animate photos or generate cinematic 1080p clips',
      icon: Code2,
      model: 'gemini-3.1-flash-lite',
      prompt: 'How do I generate a cinematic video or animate a photo in CoreGPT?',
    },
  ];

  if (!authChecked) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 high-class-canvas">
        <div className="mb-4">
          <ThinkAiLogo size={64} />
        </div>
        <h2 className="text-xs font-semibold tracking-wider uppercase text-zinc-500 dark:text-zinc-400">
          Initializing CoreGPT...
        </h2>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white dark:bg-[#212121] text-zinc-900 dark:text-[#ececec] high-class-canvas transition-colors">
      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        currentUser={currentUser}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={selectConversation}
        onNewChat={handleNewChat}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        usage={usage}
        onOpenSettings={() => setShowSettingsModal(true)}
        onLogout={handleLogout}
        onOpenLogoModal={() => setShowLogoModal(true)}
        onOpenInstallModal={() => setShowInstallModal(true)}
      />

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0 bg-white dark:bg-[#212121]">
        {/* Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          selectedLanguage={selectedLanguage}
          onLanguageChange={setSelectedLanguage}
          isExperimentalMode={isExperimentalMode}
          onToggleExperimentalMode={() => setIsExperimentalMode(!isExperimentalMode)}
          currentUser={currentUser}
          usage={usage}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onOpenVoiceMode={() => setShowVoiceModal(true)}
          onOpenLogoModal={() => setShowLogoModal(true)}
          onOpenInstallModal={() => setShowInstallModal(true)}
          themeAccent={themeAccent}
          onThemeAccentChange={setThemeAccent}
        />

        {/* Global Error Banner if any */}
        {streamError && (
          <div className="mx-4 mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between text-xs text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{streamError}</span>
            </div>
            <button onClick={() => setStreamError(null)} className="text-red-400 hover:text-red-600">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB ROUTING */}
        {activeTab === 'chat' && (
          <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-hidden">
            {/* Messages Scroll View */}
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                /* Empty Chat Welcome State - ChatGPT Style */
                <div className="h-full flex flex-col items-center justify-center p-6 md:p-10 text-center max-w-2xl mx-auto space-y-6">
                  <div
                    onClick={() => setShowLogoModal(true)}
                    className="relative group cursor-pointer"
                    title="Click to customize CoreGPT Logo or upload image"
                  >
                    <ThinkAiLogo size={68} />
                    <div className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black dark:bg-white text-white dark:text-black text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md pointer-events-none">
                      Change Logo
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                      What can I help with today?
                    </h2>
                    <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
                      CoreGPT executive conversational intelligence, real-time web knowledge, and creative media synthesis.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                      <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#2f2f2f] border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200">
                        Founder: <strong className="text-black dark:text-white">Umar Hani</strong>
                      </span>
                      <span className="px-3 py-1 rounded-full bg-zinc-100 dark:bg-[#2f2f2f] border border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200">
                        Developer: <strong className="text-black dark:text-white">Ahmadraza</strong>
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-zinc-100 dark:bg-[#2f2f2f] border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Real-Time Active
                      </span>
                    </div>
                  </div>

                  {/* Suggestion Starter Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left pt-2">
                    {starterSuggestions.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => {
                            if (item.action === 'voice' || item.model === 'gemini-3.8-live') {
                              setShowVoiceModal(true);
                              return;
                            }
                            if (item.model) setSelectedModel(item.model);
                            if (item.prompt) handleSendMessage(item.prompt);
                          }}
                          className="p-3.5 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#212121] hover:bg-zinc-50 dark:hover:bg-[#2a2a2a] transition-all text-left group shadow-xs cursor-pointer"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Icon className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
                            <span className="font-semibold text-xs text-zinc-900 dark:text-zinc-100">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                            {item.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Messages List */
                <div className="py-4">
                  {messages.map((msg, idx) => (
                    <ChatMessage
                      key={msg.id || idx}
                      message={msg}
                      isStreaming={isStreaming && idx === messages.length - 1 && msg.role === 'assistant'}
                      onRegenerate={idx === messages.length - 1 ? handleRegenerate : undefined}
                      onEditPrompt={msg.role === 'user' ? handleEditPrompt : undefined}
                      userDisplayName={currentUser?.displayName || 'You'}
                      voiceName={voiceName}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input Bar */}
            <ChatInput
              onSendMessage={handleSendMessage}
              isStreaming={isStreaming}
              onStopGeneration={handleStopGeneration}
              disabled={loadingMessages}
              selectedLanguage={selectedLanguage}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
              useSearchGrounding={useSearchGrounding}
              onToggleSearchGrounding={() => {
                setUseSearchGrounding(!useSearchGrounding);
                if (!useSearchGrounding) setUseMapsGrounding(false);
              }}
              useMapsGrounding={useMapsGrounding}
              onToggleMapsGrounding={() => {
                setUseMapsGrounding(!useMapsGrounding);
                if (!useMapsGrounding) setUseSearchGrounding(false);
              }}
              onOpenVoiceMode={() => setShowVoiceModal(true)}
            />
          </div>
        )}

        {/* IMAGE STUDIO TAB */}
        {activeTab === 'images' && (
          <ImageStudio usage={usage} onRefreshUsage={refreshUsage} currentUser={currentUser} />
        )}

        {/* VEO VIDEO STUDIO TAB */}
        {activeTab === 'video' && (
          <VideoStudio />
        )}

        {/* ADMIN DASHBOARD TAB */}
        {activeTab === 'admin' && currentUser?.role === 'admin' && (
          <AdminDashboard currentUser={currentUser} onClose={() => setActiveTab('chat')} />
        )}

        {/* Mobile Bottom Navigation Dock (md:hidden) — Quick access to Chat, Voice, Images, Video, New */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 dark:bg-[#181818]/95 backdrop-blur-md border-t border-zinc-200 dark:border-white/10 px-3 py-1.5 flex items-center justify-around shadow-lg">
          {/* Chat Tab */}
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'text-zinc-950 dark:text-white font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-4 h-4 mb-0.5" />
            <span>Chat</span>
          </button>

          {/* Live Voice Duplex Button - Elevated pulse */}
          <button
            onClick={() => setShowVoiceModal(true)}
            className="flex flex-col items-center justify-center py-1 px-3.5 rounded-2xl bg-zinc-900 text-white dark:bg-white dark:text-black font-semibold text-[10px] shadow-md -mt-3.5 ring-4 ring-white dark:ring-[#181818] transition-all active:scale-95 cursor-pointer"
            title="Start Real-Time Voice Conversation"
          >
            <Mic className="w-4 h-4 mb-0.5 text-sky-400 dark:text-blue-600 animate-pulse" />
            <span>Voice</span>
          </button>

          {/* Image Studio */}
          <button
            onClick={() => setActiveTab('images')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all cursor-pointer ${
              activeTab === 'images'
                ? 'text-zinc-950 dark:text-white font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4 mb-0.5" />
            <span>Images</span>
          </button>

          {/* Video Studio */}
          <button
            onClick={() => setActiveTab('video')}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium transition-all cursor-pointer ${
              activeTab === 'video'
                ? 'text-zinc-950 dark:text-white font-semibold'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Film className="w-4 h-4 mb-0.5" />
            <span>Video</span>
          </button>

          {/* New Chat */}
          <button
            onClick={() => {
              setActiveTab('chat');
              handleNewChat();
            }}
            className="flex flex-col items-center justify-center py-1 px-2.5 rounded-xl text-[10px] font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
            title="Start New Chat"
          >
            <Plus className="w-4 h-4 mb-0.5" />
            <span>New</span>
          </button>
        </nav>
      </div>

      {/* Voice Mode Modal */}
      <VoiceConversationModal
        isOpen={showVoiceModal}
        onClose={() => setShowVoiceModal(false)}
        voiceName={voiceName}
        onVoiceChange={setVoiceName}
        selectedLanguage={selectedLanguage}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentUser={currentUser}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        voiceName={voiceName}
        onVoiceChange={setVoiceName}
        conversations={conversations}
        onAccountDeleted={handleLogout}
        themeAccent={themeAccent}
        onThemeAccentChange={setThemeAccent}
        onOpenLogoModal={() => setShowLogoModal(true)}
      />

      {/* Logo Customizer Modal */}
      <LogoCustomizerModal
        isOpen={showLogoModal}
        onClose={() => setShowLogoModal(false)}
      />

      {/* Install Mobile App / Android APK Package Modal */}
      <InstallAppModal
        isOpen={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        deferredPrompt={deferredPrompt}
        onInstallSuccess={() => setShowInstallModal(false)}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal || !currentUser}
        onSuccess={(user) => {
          setCurrentUser(user);
          setShowAuthModal(false);
          loadConversations();
          refreshUsage();
        }}
      />
    </div>
  );
}
