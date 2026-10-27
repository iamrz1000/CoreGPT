import React, { useState } from 'react';
import {
  MessageSquare,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Settings,
  LogOut,
  ChevronLeft,
  Shield,
  Film,
  Image as ImageIcon,
  Smartphone,
  Download,
  Music,
  Gamepad2,
  Brain,
  FolderKanban,
  Cpu,
  Globe2,
  ShieldCheck,
  Sparkles,
  GitFork,
  Boxes,
  LayoutTemplate,
} from 'lucide-react';
import { Conversation, User, UsageState } from '../types/index.ts';
import { CoreGptLogo } from './ThinkAiLogo.tsx';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  currentUser: User | null;
  activeTab: 'chat' | 'images' | 'video' | 'music' | 'game' | 'creator' | 'projects' | 'agent' | 'admin';
  onTabChange: (tab: 'chat' | 'images' | 'video' | 'music' | 'game' | 'creator' | 'projects' | 'agent' | 'admin') => void;
  usage: UsageState | null;
  onOpenSettings: () => void;
  onLogout: () => void;
  onOpenLogoModal?: () => void;
  onOpenInstallModal?: () => void;
  onOpenMemories?: () => void;
  onOpenCreatorDNA?: () => void;
  onOpenWorkflows?: () => void;
  onOpenMiniApps?: () => void;
  onOpenTemplates?: () => void;
  onOpenOnePrompt?: () => void;
  onOpenTruthCheck?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onToggle,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  currentUser,
  activeTab,
  onTabChange,
  usage,
  onOpenSettings,
  onLogout,
  onOpenLogoModal,
  onOpenInstallModal,
  onOpenMemories,
  onOpenCreatorDNA,
  onOpenWorkflows,
  onOpenMiniApps,
  onOpenTemplates,
  onOpenOnePrompt,
  onOpenTruthCheck,
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const startEditing = (conv: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditTitle(conv.title);
  };

  const saveEditing = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteConversation(id);
    setDeletingId(null);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-40 flex flex-col w-64 bg-[#f9f9f9] dark:bg-[#171717] border-r border-zinc-200 dark:border-white/10 transition-all duration-200 ease-in-out shrink-0 select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:-translate-x-full'
        }`}
      >
        {/* Top Header / Branding */}
        <div className="p-3.5 flex items-center justify-between border-b border-zinc-200 dark:border-white/5">
          <div
            onClick={onOpenLogoModal}
            className="flex items-center gap-2.5 cursor-pointer group py-1 px-1 rounded-lg hover:bg-zinc-200/60 dark:hover:bg-white/5 transition-colors"
            title="HYNEX AI — Founded by Umar Hani · Developed by Ahmadraza"
          >
            <CoreGptLogo size={28} />
            <div className="flex items-center gap-1 font-black text-sm tracking-wider">
              <span className="text-zinc-900 dark:text-white">HYNEX</span>
              <span className="text-emerald-500 dark:text-emerald-400 font-extrabold text-xs px-1 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/20">
                AI
              </span>
            </div>
          </div>
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-200/60 dark:hover:bg-white/10 md:hidden"
            title="Close sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Primary Action: ChatGPT-Style "+ New chat" Button */}
        <div className="p-3 space-y-2 border-b border-zinc-200 dark:border-white/5">
          <button
            onClick={() => {
              onNewChat();
              onTabChange('chat');
            }}
            className="w-full flex items-center justify-between py-2 px-3 rounded-lg border border-zinc-300/80 dark:border-white/15 bg-white dark:bg-[#212121] hover:bg-zinc-50 dark:hover:bg-[#262626] text-zinc-900 dark:text-white font-medium text-xs transition-colors shadow-2xs active:scale-[0.99]"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-zinc-700 dark:text-zinc-200" />
              <span>New chat</span>
            </div>
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">⌘K</span>
          </button>

          {/* Segmented Workspace Control (Chat / Images / Veo 3 / Music / 3D Game) */}
          <div className="space-y-1">
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-zinc-200/60 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/5 text-xs">
              <button
                onClick={() => onTabChange('chat')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-white dark:bg-[#212121] text-black dark:text-white shadow-2xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
              <button
                onClick={() => onTabChange('images')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'images'
                    ? 'bg-white dark:bg-[#212121] text-black dark:text-white shadow-2xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Images</span>
              </button>
              <button
                onClick={() => onTabChange('video')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'video'
                    ? 'bg-white dark:bg-[#212121] text-black dark:text-white shadow-2xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                <span>Veo 3</span>
              </button>
            </div>

            {/* Creator Studio & Project Hub Section */}
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-purple-500/10 rounded-lg border border-purple-500/20 text-xs">
              <button
                onClick={() => onTabChange('creator')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'creator'
                    ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                    : 'text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-white'
                }`}
                title="Hynex Creator Studio"
              >
                <Film className="w-3 h-3 text-purple-400" />
                <span>Creator</span>
              </button>
              <button
                onClick={() => onTabChange('projects')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'projects'
                    ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                    : 'text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-white'
                }`}
                title="Project Hub"
              >
                <FolderKanban className="w-3 h-3 text-purple-400" />
                <span>Projects</span>
              </button>
              <button
                onClick={() => onTabChange('agent')}
                className={`flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'agent'
                    ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                    : 'text-purple-600 dark:text-purple-300 hover:text-purple-700 dark:hover:text-white'
                }`}
                title="Hynex Autonomous Agent"
              >
                <Cpu className="w-3 h-3 text-purple-400" />
                <span>Agent</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 p-0.5 bg-zinc-200/60 dark:bg-white/5 rounded-lg border border-zinc-200 dark:border-white/5 text-xs">
              <button
                onClick={() => onTabChange('music')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'music'
                    ? 'bg-purple-600 text-white shadow-2xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Music className="w-3.5 h-3.5 text-purple-400" />
                <span>Music Studio</span>
              </button>
              <button
                onClick={() => onTabChange('game')}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  activeTab === 'game'
                    ? 'bg-emerald-600 text-white shadow-2xs font-semibold'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>3D Game</span>
              </button>
            </div>

            {/* Hynex Innovation Ecosystem */}
            <div className="grid grid-cols-3 gap-1 p-0.5 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-xs">
              {onOpenOnePrompt && (
                <button
                  onClick={onOpenOnePrompt}
                  className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[10px] font-semibold text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-white transition-colors"
                  title="One-Prompt Universe: Autonomous goal to multi-deliverable plan"
                >
                  <Globe2 className="w-3 h-3 text-cyan-400" />
                  <span>One-Prompt</span>
                </button>
              )}
              {onOpenTruthCheck && (
                <button
                  onClick={onOpenTruthCheck}
                  className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[10px] font-semibold text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-white transition-colors"
                  title="TruthCheck: Grounded factual audit"
                >
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>TruthCheck</span>
                </button>
              )}
              {onOpenCreatorDNA && (
                <button
                  onClick={onOpenCreatorDNA}
                  className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[10px] font-semibold text-cyan-600 dark:text-cyan-300 hover:text-cyan-700 dark:hover:text-white transition-colors"
                  title="Creator DNA: Brand personas & style consistency"
                >
                  <Sparkles className="w-3 h-3 text-purple-400" />
                  <span>Creator DNA</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-500/10 rounded-lg border border-slate-500/20 text-xs">
              {onOpenWorkflows && (
                <button
                  onClick={onOpenWorkflows}
                  className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors"
                  title="Workflow Recorder & Runner"
                >
                  <GitFork className="w-3 h-3 text-blue-400" />
                  <span>Workflows</span>
                </button>
              )}
              {onOpenMiniApps && (
                <button
                  onClick={onOpenMiniApps}
                  className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors"
                  title="Hynex Mini Apps Builder"
                >
                  <Boxes className="w-3 h-3 text-amber-400" />
                  <span>Mini-Apps</span>
                </button>
              )}
              {onOpenTemplates && (
                <button
                  onClick={onOpenTemplates}
                  className="flex items-center justify-center gap-1 py-1.5 px-1 rounded-md text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white transition-colors"
                  title="Community Templates"
                >
                  <LayoutTemplate className="w-3 h-3 text-emerald-400" />
                  <span>Templates</span>
                </button>
              )}
            </div>

            {/* Memory Engine Quick Trigger */}
            {onOpenMemories && (
              <button
                onClick={onOpenMemories}
                className="w-full flex items-center justify-between py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:border-purple-500/30 bg-zinc-100/70 dark:bg-[#1f1f1f] hover:bg-purple-500/5 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium transition-colors"
              >
                <div className="flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5 text-purple-500" />
                  <span>Hynex Memory Engine</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-200 dark:bg-white/10 px-1.5 py-0.2 rounded">
                  Isolated
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Search Conversations Input */}
        <div className="px-3 pt-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search chats..."
              className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-zinc-200 dark:border-white/5 bg-white dark:bg-white/5 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-400 dark:focus:border-white/20 transition-colors"
            />
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          <div className="px-2 pb-1 text-[10px] font-semibold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
            Recent Chats
          </div>

          {filteredConversations.length === 0 ? (
            <div className="p-3 text-center text-xs text-zinc-400 dark:text-zinc-500">
              {search ? 'No matching chats' : 'No previous chats yet.'}
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeConversationId && activeTab === 'chat';
              const isEditing = editingId === conv.id;
              const isDeleting = deletingId === conv.id;

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onTabChange('chat');
                  }}
                  className={`group relative flex items-center justify-between px-2.5 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                    isActive
                      ? 'bg-zinc-200/70 dark:bg-[#212121] text-black dark:text-white font-medium'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/50 dark:hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-zinc-400 dark:text-zinc-500" />
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveEditing(conv.id, e as unknown as React.MouseEvent);
                          if (e.key === 'Escape') cancelEditing(e as unknown as React.MouseEvent);
                        }}
                        className="w-full bg-white dark:bg-black px-1.5 py-0.5 rounded text-xs border border-zinc-400 dark:border-white/20 text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      />
                    ) : (
                      <span className="truncate">{conv.title}</span>
                    )}
                  </div>

                  {/* Actions */}
                  {isEditing ? (
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      <button
                        onClick={(e) => saveEditing(conv.id, e)}
                        className="p-1 rounded text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10"
                        title="Save"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-white"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : isDeleting ? (
                    <div
                      className="flex items-center gap-1 shrink-0 ml-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={(e) => confirmDelete(conv.id, e)}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-red-600 text-white font-medium hover:bg-red-700"
                      >
                        Delete
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(null);
                        }}
                        className="px-1.5 py-0.5 rounded text-[10px] text-zinc-400 hover:text-zinc-600"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 ml-1 transition-opacity">
                      <button
                        onClick={(e) => startEditing(conv, e)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeletingId(conv.id);
                        }}
                        className="p-1 rounded text-zinc-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Daily Use Limit / Quota Progress */}
        {usage && (
          <div className="px-3 py-2.5 mx-3 mb-2 rounded-xl bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/5 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {usage.isAdmin ? 'Admin Clearance' : 'Daily Use Limit'}
              </span>
              <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-100">
                {usage.isAdmin ? 'Unlimited' : `${usage.textCount} / ${usage.textLimit} used`}
              </span>
            </div>
            {usage.isAdmin ? (
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                Unlimited message generations (Admin role)
              </p>
            ) : (
              <>
                <div className="w-full h-1.5 bg-zinc-200 dark:bg-white/10 rounded-full overflow-hidden mb-1.5">
                  <div
                    className="h-full bg-zinc-900 dark:bg-white transition-all duration-300"
                    style={{
                      width: `${Math.min(100, Math.round((usage.textCount / usage.textLimit) * 100))}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
                  <span>{usage.textRemaining} messages left today</span>
                  <span>Resets at 00:00 UTC</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Install Mobile App / APK Banner */}
        {onOpenInstallModal && (
          <div className="px-3 pb-2 pt-1">
            <button
              onClick={onOpenInstallModal}
              className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-200/70 hover:bg-zinc-200 dark:bg-white/5 dark:hover:bg-white/10 text-zinc-900 dark:text-white text-xs font-medium transition-all group cursor-pointer border border-zinc-300/50 dark:border-white/5"
              title="Install CoreGPT on Android or iOS"
            >
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                <span>Install Mobile App</span>
              </div>
              <Download className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
            </button>
          </div>
        )}

        {/* User Profile & Account Footer */}
        <div className="p-3 border-t border-zinc-200 dark:border-white/10 bg-white/70 dark:bg-[#171717]">
          {currentUser && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold">
                    {currentUser.displayName.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100 truncate">
                      {currentUser.displayName}
                    </p>
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                {currentUser.role === 'admin' && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-200 dark:bg-white/10 text-zinc-900 dark:text-white">
                    ADMIN
                  </span>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 pt-1">
                {currentUser.role === 'admin' && (
                  <button
                    onClick={() => onTabChange('admin')}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                      activeTab === 'admin'
                        ? 'bg-zinc-900 text-white dark:bg-white dark:text-black shadow-xs font-semibold'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/5'
                    }`}
                    title="Administrative Console"
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin</span>
                  </button>
                )}

                {onOpenLogoModal && (
                  <button
                    onClick={onOpenLogoModal}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                    title="Logo Settings"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={onOpenSettings}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                  title="Preferences"
                >
                  <Settings className="w-4 h-4" />
                </button>

                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-500 dark:text-zinc-400 dark:hover:text-red-400 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>

              {/* Creator & Founder Attribution */}
              <div className="mt-2 pt-2 px-1 text-center border-t border-zinc-200 dark:border-white/5">
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium">
                  Founder: <span className="text-zinc-900 dark:text-white font-semibold">Umar Hani</span>
                </p>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                  Developer: <span className="text-zinc-800 dark:text-zinc-300 font-medium">Ahmadraza</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
