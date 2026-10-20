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
}) => {
  const models = [
    {
      id: 'gemini-3.1-flash-lite',
      name: 'CoreGPT 4o',
      tag: 'Fast & Versatile',
      icon: Zap,
    },
    {
      id: 'gemini-3.5-flash-lite',
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
    <header className="h-14 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#212121] px-3 md:px-5 flex items-center justify-between gap-3 z-20 shrink-0 transition-colors">
      {/* Zone 1: Sidebar Toggle & Brand */}
      <div className="flex items-center gap-2 md:gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
          title="Toggle Sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div
          onClick={onOpenLogoModal}
          className="flex items-center gap-2 cursor-pointer group select-none py-1 px-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors"
          title="CoreGPT — Founded by Umar Hani · Developed by Ahmadraza"
        >
          <CoreGptLogo size={26} />
          <div className="flex items-center font-bold tracking-tight text-zinc-900 dark:text-white">
            <span className="text-sm md:text-base">CoreGPT</span>
          </div>
        </div>

        {/* Model Selector styled like ChatGPT dropdown */}
        <div className="relative flex items-center ml-1">
          <select
            value={selectedModel}
            onChange={(e) => {
              const val = e.target.value;
              onModelChange(val);
              if (val === 'gemini-3.8-live') {
                onOpenVoiceMode();
              }
            }}
            className="appearance-none pl-3 pr-7 py-1 text-xs font-semibold rounded-lg bg-transparent hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 cursor-pointer focus:outline-none transition-colors border-none"
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

      {/* Zone 2: Controls & Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Language selector */}
        <div className="relative hidden lg:flex items-center">
          <Globe className="pointer-events-none absolute left-2 w-3 h-3 text-zinc-400 dark:text-zinc-500" />
          <select
            value={selectedLanguage}
            onChange={(e) => onLanguageChange(e.target.value)}
            className="appearance-none pl-6 pr-6 py-1 text-xs font-normal rounded-lg bg-transparent hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 cursor-pointer focus:outline-none"
            title="Language"
          >
            {languages.map((l) => (
              <option key={l.code} value={l.code} className="dark:bg-[#171717]">
                {l.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 w-3 h-3 text-zinc-400 dark:text-zinc-500" />
        </div>

        {/* Real-time Indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg text-zinc-600 dark:text-zinc-400 text-xs font-medium"
          title="Real-Time Temporal & Web Grounding: Active"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-mono">Live</span>
        </div>

        {/* Admin-only Root Jailbreak toggle */}
        {currentUser?.role === 'admin' && (
          <button
            onClick={onToggleExperimentalMode}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
              isExperimentalMode
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-black border-zinc-900 dark:border-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-white/15 hover:bg-zinc-100 dark:hover:bg-white/10'
            }`}
            title="Admin Root Jailbreak Mode: Unlocks all types of questions without refusals"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">
              {isExperimentalMode ? '⚡ Jailbreak [ON]' : '⚡ Jailbreak'}
            </span>
          </button>
        )}

        {/* Voice Mode Button */}
        <button
          onClick={onOpenVoiceMode}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg border border-zinc-300 dark:border-white/15 bg-transparent hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
          title="Start real-time voice conversation"
        >
          <Mic className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
          <span className="hidden sm:inline text-[11px]">Voice</span>
        </button>

        {/* Credits / Quota indicator */}
        {usage && (
          <div className="hidden xl:flex items-center gap-1.5 px-2 py-1 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
            <span>{usage.isAdmin ? 'Unlimited' : `${usage.textRemaining} credits`}</span>
          </div>
        )}

        {/* Light / Dark Mode Toggle */}
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg text-zinc-600 hover:text-black dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
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
