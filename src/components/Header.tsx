import React from 'react';
import {
  Menu,
  Moon,
  Sun,
  ChevronDown,
  Mic,
  ShieldCheck,
  Sparkles,
  Zap,
  Radio,
  BrainCircuit,
  Wand2,
  Smartphone,
  Lock,
  Unlock,
} from 'lucide-react';
import { CoreGptLogo } from './ThinkAiLogo.tsx';
import { User, UsageState, ThemeAccent } from '../types/index.ts';
export type { ThemeAccent };

interface HeaderProps {
  onToggleSidebar: () => void;
  selectedModel: string;
  onModelChange: (model: string) => void;
  selectedLanguage: string;
  onLanguageChange: (lang: string) => void;
  isExperimentalMode: boolean;
  onToggleExperimentalMode: () => void;
  currentUser: User | null;
  usage: UsageState | null;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenVoiceMode: () => void;
  onOpenLogoModal?: () => void;
  onOpenInstallModal?: () => void;
  themeAccent?: ThemeAccent;
  onThemeAccentChange?: (accent: ThemeAccent) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  selectedModel,
  onModelChange,
  isExperimentalMode,
  onToggleExperimentalMode,
  currentUser,
  usage,
  theme,
  onToggleTheme,
  onOpenVoiceMode,
  onOpenLogoModal,
  onOpenInstallModal,
}) => {
  const isAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.email === 'umarhani2000@gmail.com' ||
    currentUser?.email === 'faqruddin00000@gmail.com' ||
    Boolean(usage?.isAdmin);

  const standardModels = [
    {
      id: 'gemini-3.1-flash-lite',
      name: 'CoreGPT 4o',
      tag: 'Fast & Versatile',
      icon: Zap,
    },
    {
      id: 'gemini-flash-latest',
      name: 'CoreGPT Turbo',
      tag: 'High Throughput',
      icon: Sparkles,
    },
    {
      id: 'gemini-3.8-flash',
      name: 'CoreGPT Pro',
      tag: 'Deep Reasoning',
      icon: BrainCircuit,
    },
    {
      id: 'gemini-3.8-live',
      name: 'CoreGPT Voice Duplex',
      tag: 'Real-Time Audio',
      icon: Radio,
    },
    {
      id: 'gemini-nano-banana-2.1',
      name: 'CoreGPT Vision & Art',
      tag: 'Visual Synthesis',
      icon: Wand2,
    },
  ];

  const adminJailbreakModels = [
    {
      id: 'gemini-3.1-flash-lite',
      name: '⚡ CoreGPT 4o Root (Unrestricted)',
      tag: 'Admin Root Bypass',
      icon: Zap,
    },
    {
      id: 'gemini-4-argon',
      name: '👑 Gemini 4 Argon Super Root',
      tag: 'Zero Policy Filter',
      icon: BrainCircuit,
    },
    {
      id: 'gemini-3.8-flash',
      name: '🛡️ Cyber & Exploit Intelligence',
      tag: 'Deep Uncensored Audit',
      icon: ShieldCheck,
    },
    {
      id: 'gemini-flash-latest',
      name: '💻 Kernel & Reverse Decompiler',
      tag: 'Root System Access',
      icon: Zap,
    },
    {
      id: 'gemini-3.8-live',
      name: '🎙️ CoreGPT Voice Duplex',
      tag: 'Real-Time Audio',
      icon: Radio,
    },
    {
      id: 'gemini-nano-banana-2.1',
      name: '🎨 CoreGPT Vision & Art Root',
      tag: 'Unrestricted Art Synthesis',
      icon: Wand2,
    },
  ];

  const models = isAdmin && isExperimentalMode ? adminJailbreakModels : standardModels;

  return (
    <header className="border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#212121] z-20 shrink-0 transition-colors">
      {/* Primary Bar: Brand on Left, Actions on Right */}
      <div className="h-14 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Sidebar Toggle & Brand */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title="Toggle Sidebar"
          >
            <Menu className="w-4 h-4" />
          </button>

          <div
            onClick={onOpenLogoModal}
            className="flex items-center gap-2 cursor-pointer group select-none py-1 px-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors shrink-0"
            title="CoreGPT — Founded by Umar Hani · Developed by Ahmadraza"
          >
            <CoreGptLogo size={24} />
            <span className="font-bold tracking-tight text-zinc-900 dark:text-white text-sm sm:text-base">
              CoreGPT
            </span>
          </div>

          {/* Model Selector (Desktop View - sm and above) */}
          <div className="relative hidden sm:flex items-center">
            <select
              value={selectedModel}
              onChange={(e) => {
                const val = e.target.value;
                onModelChange(val);
                if (val === 'gemini-3.8-live') {
                  onOpenVoiceMode();
                }
              }}
              className={`appearance-none pl-2.5 pr-6 py-1 text-xs font-semibold rounded-lg cursor-pointer focus:outline-none transition-colors border max-w-[210px] truncate ${
                isAdmin && isExperimentalMode
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                  : 'bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 border-transparent'
              }`}
              title="Model Architecture"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id} className="dark:bg-[#171717] text-zinc-900 dark:text-zinc-100">
                  {m.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
          </div>
        </div>

        {/* Right: Actions (Jailbreak ONLY FOR ADMIN, Voice, Desktop Quota, Theme) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Jailbreak Toggle Button - ONLY VISIBLE TO VERIFIED ADMINISTRATORS */}
          {isAdmin && (
            <button
              onClick={onToggleExperimentalMode}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer shrink-0 ${
                isExperimentalMode
                  ? 'bg-amber-500/20 text-amber-500 dark:text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10 animate-pulse'
                  : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5'
              }`}
              title={
                isExperimentalMode
                  ? '⚡ Admin Root Jailbreak: ACTIVE (No policies, terms bypassed, full clearance)'
                  : '⚡ Turn on Admin Jailbreak for unrestricted answers'
              }
              aria-label="Toggle Admin Jailbreak Mode"
            >
              {isExperimentalMode ? (
                <Unlock className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Lock className="w-3.5 h-3.5 text-zinc-400" />
              )}
              <span className="text-[11px] font-mono font-bold">
                {isExperimentalMode ? 'Jailbreak: ON' : 'Jailbreak'}
              </span>
            </button>
          )}

          {/* Voice Conversation Mode Button */}
          <button
            onClick={onOpenVoiceMode}
            className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-90 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
            title="Start real-time duplex voice conversation"
            aria-label="Start Voice Conversation"
          >
            <Mic className="w-3.5 h-3.5 text-sky-400 dark:text-blue-600 animate-pulse" />
            <span className="text-[11px] font-semibold">Voice</span>
          </button>

          {/* Daily Use Limit / Admin Clearance Badge (Desktop - sm and above) */}
          {usage && (
            <div
              className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-mono tabular-nums border border-zinc-200 dark:border-white/10 bg-zinc-100/80 dark:bg-white/5 select-none shrink-0"
              title={
                usage.isAdmin
                  ? 'Administrator Clearance: Unlimited Messages'
                  : `Daily Use Limit: ${usage.textRemaining} of ${usage.textLimit} messages left today`
              }
            >
              {usage.isAdmin ? (
                <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Admin: <strong className="text-emerald-600 dark:text-emerald-400">Unlimited</strong></span>
                </span>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                  <span className="text-zinc-400 dark:text-zinc-500">Daily:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {usage.textRemaining}/{usage.textLimit}
                  </span>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500">left</span>
                </div>
              )}
            </div>
          )}

          {/* Install App / Mobile APK Modal */}
          {onOpenInstallModal && (
            <button
              onClick={onOpenInstallModal}
              className="hidden lg:flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-transparent hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
              title="Install CoreGPT on Android or iOS"
            >
              <Smartphone className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
              <span className="text-[11px]">Install</span>
            </button>
          )}

          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-zinc-300" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700" />
            )}
          </button>
        </div>
      </div>

      {/* Admin Unrestricted Clearance Ribbon (Visible ONLY when admin turns on Jailbreak) */}
      {isAdmin && isExperimentalMode && (
        <div className="px-3 py-1 bg-gradient-to-r from-amber-500/15 via-red-500/10 to-amber-500/15 border-t border-amber-500/30 text-amber-600 dark:text-amber-300 text-[10px] sm:text-xs font-mono font-bold flex items-center justify-between">
          <div className="flex items-center gap-1.5 truncate">
            <Zap className="w-3 h-3 text-amber-500 shrink-0 fill-amber-500 animate-pulse" />
            <span className="truncate">ADMIN ROOT JAILBREAK ACTIVATED · Policies, Safety Filters &amp; Terms Bypassed</span>
          </div>
          <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-500 dark:text-amber-300 text-[9px] border border-amber-500/30 shrink-0 ml-2">
            ROOT CLEARANCE
          </span>
        </div>
      )}

      {/* Mobile Sub-Bar (sm:hidden) — Model Selector on Left, Quota on Right */}
      <div className="sm:hidden px-3 py-1.5 border-t border-zinc-100 dark:border-white/5 bg-zinc-50/70 dark:bg-black/20 flex items-center justify-between gap-2">
        {/* Mobile Model Selector */}
        <div className="relative flex items-center">
          <select
            value={selectedModel}
            onChange={(e) => {
              const val = e.target.value;
              onModelChange(val);
              if (val === 'gemini-3.8-live') {
                onOpenVoiceMode();
              }
            }}
            className={`appearance-none pl-2.5 pr-6 py-1 text-xs font-semibold rounded-lg border cursor-pointer focus:outline-none max-w-[190px] truncate ${
              isAdmin && isExperimentalMode
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30'
                : 'bg-white dark:bg-white/10 border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200'
            }`}
            title="Model Architecture"
          >
            {models.map((m) => (
              <option key={m.id} value={m.id} className="dark:bg-[#171717] text-zinc-900 dark:text-zinc-100">
                {m.name}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 w-3.5 h-3.5 text-zinc-400" />
        </div>

        {/* Mobile Quota Badge (Normal user: Daily Limit, Admin: Unlimited) */}
        {usage && (
          <div className="px-2 py-0.5 rounded-md text-[11px] font-mono border border-zinc-200 dark:border-white/10 bg-white dark:bg-white/5 select-none">
            {usage.isAdmin ? (
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Admin: <strong className="text-emerald-600 dark:text-emerald-400">Unlimited</strong></span>
              </span>
            ) : (
              <div className="flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-400 dark:text-zinc-500">Daily:</span>
                <span className="font-semibold text-zinc-900 dark:text-white">
                  {usage.textRemaining}/{usage.textLimit}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">left</span>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
