import React from 'react';
import {
  Menu,
  Moon,
  Sun,
  ChevronDown,
  Globe,
  Mic,
  ShieldCheck,
  Sparkles,
  Zap,
  Radio,
  BrainCircuit,
  Wand2,
  Smartphone,
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
  selectedLanguage,
  onLanguageChange,
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
  const models = [
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

  const languages = [
    { code: 'auto', label: 'Auto Detect' },
    { code: 'English', label: 'English' },
    { code: 'Hindi', label: 'Hindi (हिन्दी)' },
    { code: 'Urdu', label: 'Urdu (اردو)' },
    { code: 'Marathi', label: 'Marathi (मराठी)' },
    { code: 'Arabic', label: 'Arabic (العربية)' },
    { code: 'Spanish', label: 'Spanish (Español)' },
    { code: 'French', label: 'French (Français)' },
    { code: 'German', label: 'German (Deutsch)' },
    { code: 'Chinese', label: 'Chinese (中文)' },
    { code: 'Japanese', label: 'Japanese (日本語)' },
  ];

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  return (
    <header className="min-h-14 py-1.5 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#212121] px-2.5 sm:px-4 flex items-center justify-between gap-1.5 sm:gap-3 z-20 shrink-0 transition-colors">
      {/* Zone 1: Sidebar Toggle & Brand */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors shrink-0"
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div
          onClick={onOpenLogoModal}
          className="flex items-center gap-1.5 cursor-pointer group select-none py-1 px-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors shrink-0"
          title="CoreGPT — Founded by Umar Hani · Developed by Ahmadraza"
        >
          <CoreGptLogo size={24} />
          <span className="font-bold tracking-tight text-zinc-900 dark:text-white text-sm sm:text-base hidden xs:inline">
            CoreGPT
          </span>
        </div>

        {/* Model Selector styled like ChatGPT dropdown */}
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
            className="appearance-none pl-2 sm:pl-2.5 pr-6 py-1 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 cursor-pointer focus:outline-none transition-colors border border-transparent max-w-[95px] xs:max-w-[125px] sm:max-w-[170px] truncate"
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

      {/* Zone 2: Controls & Actions (Jailbreak, Voice, Quota, Theme) */}
      <div className="flex items-center gap-1 sm:gap-2 shrink-0">
        {/* Jailbreak Toggle Button - Always visible, compact on mobile */}
        <button
          onClick={onToggleExperimentalMode}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold transition-all border cursor-pointer ${
            isExperimentalMode
              ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-xs'
              : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5'
          }`}
          title={
            isExperimentalMode
              ? '⚡ Jailbreak Active: Direct answers without refusals (Click to turn off)'
              : '⚡ Turn on Jailbreak mode for unrestricted answers'
          }
          aria-label="Toggle Jailbreak Mode"
        >
          <Zap className={`w-3.5 h-3.5 ${isExperimentalMode ? 'text-amber-500 fill-amber-500' : 'text-zinc-400'}`} />
          <span className="text-[11px] font-mono hidden sm:inline">
            {isExperimentalMode ? 'Jailbreak [ON]' : 'Jailbreak'}
          </span>
          <span className="text-[11px] font-mono sm:hidden">
            {isExperimentalMode ? 'Jailbreak' : 'Normal'}
          </span>
        </button>

        {/* Voice Conversation Mode Button - Prominent & accessible on all screens */}
        <button
          onClick={onOpenVoiceMode}
          className="flex items-center gap-1 py-1 px-2 sm:px-2.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-black hover:opacity-90 text-xs font-semibold shadow-xs transition-all cursor-pointer shrink-0"
          title="Start real-time duplex voice conversation"
          aria-label="Start Voice Conversation"
        >
          <Mic className="w-3.5 h-3.5 text-sky-400 dark:text-blue-600 animate-pulse" />
          <span className="text-[11px] font-semibold">Voice</span>
        </button>

        {/* Daily Use Limit / Admin Clearance Badge - Visible on Mobile and Desktop */}
        {usage && (
          <div
            className="flex items-center gap-1 px-1.5 xs:px-2 py-1 rounded-lg text-xs font-mono tabular-nums border border-zinc-200 dark:border-white/10 bg-zinc-100/80 dark:bg-white/5 select-none shrink-0"
            title={
              usage.isAdmin
                ? 'Administrator Clearance: Unlimited Messages'
                : `Daily Use Limit: ${usage.textRemaining} of ${usage.textLimit} messages left today (Resets daily at 00:00 UTC)`
            }
          >
            {usage.isAdmin ? (
              <span className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="hidden sm:inline">Admin:</span>
                <strong className="text-emerald-600 dark:text-emerald-400">Unlimited</strong>
              </span>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-zinc-700 dark:text-zinc-300">
                <span className="text-zinc-400 dark:text-zinc-500 hidden sm:inline">Daily:</span>
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
            className="hidden lg:flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-transparent hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
            title="Install CoreGPT on Android or iOS"
          >
            <Smartphone className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
            <span className="text-[11px]">Install</span>
          </button>
        )}

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors shrink-0"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} theme`}
        >
          {theme === 'dark' ? (
            <Sun className="w-4 h-4 text-zinc-300" />
          ) : (
            <Moon className="w-4 h-4 text-zinc-700" />
          )}
        </button>
      </div>
    </header>
  );
};
