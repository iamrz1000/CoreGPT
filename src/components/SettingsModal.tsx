import React, { useState } from 'react';
import { User, Conversation } from '../types/index.ts';
import { api, ApiError } from '../services/api.ts';
import {
  X,
  Moon,
  Sun,
  Volume2,
  Download,
  Trash2,
  AlertTriangle,
  Check,
  Palette,
  Image as ImageIcon,
  Sparkles,
} from 'lucide-react';
import { ThinkAiLogo } from './ThinkAiLogo.tsx';
import { ThemeAccent } from './Header.tsx';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  voiceName: string;
  onVoiceChange: (voice: string) => void;
  conversations: Conversation[];
  onAccountDeleted: () => void;
  themeAccent?: ThemeAccent;
  onThemeAccentChange?: (accent: ThemeAccent) => void;
  onOpenLogoModal?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  theme,
  onToggleTheme,
  voiceName,
  onVoiceChange,
  conversations,
  onAccountDeleted,
  themeAccent = 'sapphire',
  onThemeAccentChange,
  onOpenLogoModal,
}) => {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);

  if (!isOpen) return null;

  const voices = [
    { id: 'Kore', label: 'Kore · Balanced, Natural' },
    { id: 'Puck', label: 'Puck · Bright, Friendly' },
    { id: 'Charon', label: 'Charon · Deep, Authoritative' },
    { id: 'Fenrir', label: 'Fenrir · Dynamic, Energetic' },
    { id: 'Zephyr', label: 'Zephyr · Warm, Calm' },
  ];

  const accents: { id: ThemeAccent; label: string; desc: string; bg: string; border: string; preview: string }[] = [
    {
      id: 'sapphire',
      label: 'Royal Sapphire',
      desc: 'Electric azure & platinum on obsidian black',
      bg: 'bg-blue-600',
      border: 'border-blue-500',
      preview: 'from-blue-600 to-sky-400',
    },
    {
      id: 'emerald',
      label: 'British Emerald',
      desc: 'Classic racing green & gold on deep forest',
      bg: 'bg-emerald-600',
      border: 'border-emerald-500',
      preview: 'from-emerald-600 to-teal-300',
    },
    {
      id: 'amber',
      label: 'Imperial Amber',
      desc: 'Prestigious horology gold & espresso bronze',
      bg: 'bg-amber-600',
      border: 'border-amber-500',
      preview: 'from-amber-600 to-yellow-300',
    },
    {
      id: 'amethyst',
      label: 'Royal Amethyst',
      desc: 'Deep purple cognitive core & electric violet pulse',
      bg: 'bg-purple-600',
      border: 'border-purple-500',
      preview: 'from-purple-600 to-indigo-400',
    },
  ];

  const handleExportJSON = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(conversations, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `think-ai-conversations-${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  };

  const handleExportMarkdown = () => {
    let md = `# HYNEX AI - Chat History Export\nGenerated: ${new Date().toLocaleString()}\n\n---\n\n`;
    for (const c of conversations) {
      md += `## ${c.title}\n*Model: ${c.model} | Created: ${c.created_at}*\n\n`;
      if (c.messages && c.messages.length > 0) {
        for (const m of c.messages) {
          md += `### ${m.role === 'user' ? 'User' : 'HYNEX AI'}\n${m.content}\n\n`;
        }
      }
      md += `---\n\n`;
    }
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `hynex-ai-chats-${new Date().toISOString().slice(0, 10)}.md`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2500);
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setError(null);
    try {
      await api.auth.deleteAccount();
      onAccountDeleted();
      onClose();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to delete account.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg bg-white dark:bg-[#171717] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Palette className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
            <h3 className="text-sm font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              HYNEX AI Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs text-zinc-700 dark:text-zinc-300">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Logo Customization Card */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ThinkAiLogo size={42} />
              <div>
                <span className="font-semibold block text-zinc-900 dark:text-zinc-100 text-xs">
                  HYNEX AI Official Emblem
                </span>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Wolf Silhouette Logo · Founded by Umar Hani · Developed by Ahmadraza
                </span>
              </div>
            </div>
            {onOpenLogoModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenLogoModal();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black hover:opacity-85 text-xs font-semibold transition-opacity shrink-0 shadow-xs"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Change Logo</span>
              </button>
            )}
          </div>

          {/* Theme Palette Accents */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="font-semibold block text-slate-900 dark:text-zinc-100 text-xs">
                  Classic Theme Palette
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Pick your signature executive aesthetic accent
                </span>
              </div>
              <span className="font-mono text-[11px] text-blue-600 dark:text-sky-400 capitalize">
                {themeAccent}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {accents.map((acc) => (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => onThemeAccentChange && onThemeAccentChange(acc.id)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    themeAccent === acc.id
                      ? `${acc.border} bg-blue-500/10 ring-1 ring-blue-500/30`
                      : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15]'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3.5 h-3.5 rounded-full ${acc.bg} ring-1 ring-white/20`} />
                    <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100">
                      {acc.label}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-2">
                    {acc.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Light / Dark Mode */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="font-semibold block text-slate-900 dark:text-zinc-100 text-xs">
                  Interface Illumination
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  Select daylight clarity or nocturnal obsidian
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  if (theme !== 'dark') onToggleTheme();
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  theme === 'dark'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/25'
                    : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Moon className="w-4 h-4 text-sky-400" />
                  <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100">
                    Midnight Noir (Dark)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                  Deep obsidian canvas with luminous ambient glow
                </p>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (theme !== 'light') onToggleTheme();
                }}
                className={`p-3 rounded-xl border text-left transition-all ${
                  theme === 'light'
                    ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/25'
                    : 'border-slate-200 dark:border-white/[0.08] hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-xs text-slate-900 dark:text-zinc-100">
                    Alabaster Luxe (Light)
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-zinc-400">
                  Clean crisp ivory with subtle executive shadows
                </p>
              </button>
            </div>
          </div>

          {/* Voice configuration */}
          <div className="space-y-2 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
            <div>
              <span className="font-semibold block text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-blue-500" />
                Acoustic Speech Voice
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Persona for read-aloud responses and real-time voice conversations
              </span>
            </div>
            <select
              value={voiceName}
              onChange={(e) => onVoiceChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.03] text-slate-800 dark:text-zinc-200 font-medium"
            >
              {voices.map((v) => (
                <option key={v.id} value={v.id} className="dark:bg-[#0c0d14]">
                  {v.label}
                </option>
              ))}
            </select>
          </div>

          {/* Data Export */}
          <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-white/[0.06]">
            <div>
              <span className="font-semibold block text-slate-900 dark:text-zinc-100 flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5 text-blue-500" />
                Export Chat History
              </span>
              <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                Download your complete conversation sessions for archival or offline reference
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleExportJSON}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-800 dark:text-zinc-200 font-medium transition-colors"
              >
                Export JSON
              </button>
              <button
                type="button"
                onClick={handleExportMarkdown}
                className="flex-1 py-2 px-3 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-800 dark:text-zinc-200 font-medium transition-colors"
              >
                Export Markdown
              </button>
            </div>

            {exportSuccess && (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> Conversations exported successfully!
              </p>
            )}
          </div>

          {/* Account Deletion */}
          {currentUser && (
            <div className="pt-4 border-t border-slate-100 dark:border-white/[0.06] space-y-2">
              <span className="font-semibold block text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Danger Zone
              </span>

              {!confirmDelete ? (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="py-1.5 px-3 rounded-lg border border-red-200 dark:border-red-900/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-medium transition-colors"
                >
                  Delete Account & Data
                </button>
              ) : (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 space-y-2">
                  <p className="text-[11px] text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Are you sure? This action is permanent and will wipe all your conversations.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={deleteLoading}
                      onClick={handleDeleteAccount}
                      className="py-1 px-2.5 rounded bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 text-[11px]"
                    >
                      {deleteLoading ? 'Deleting...' : 'Yes, Permanently Delete'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(false)}
                      className="py-1 px-2.5 rounded border border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
