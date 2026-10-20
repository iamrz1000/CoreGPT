import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Link as LinkIcon,
  RotateCcw,
  Check,
  Sparkles,
  Image as ImageIcon,
  AlertCircle,
  Eye,
} from 'lucide-react';
import { ThinkAiLogo } from './ThinkAiLogo.tsx';

interface LogoCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoUpdated?: (url: string | null) => void;
}

export const LogoCustomizerModal: React.FC<LogoCustomizerModalProps> = ({
  isOpen,
  onClose,
  onLogoUpdated,
}) => {
  const currentLogo = localStorage.getItem('think_ai_custom_logo') || '';
  const [logoUrl, setLogoUrl] = useState(currentLogo);
  const [previewUrl, setPreviewUrl] = useState(currentLogo);
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Preset classic professional styles (SVGs in Data URI format)
  const presets = [
    {
      id: 'default',
      name: 'CoreGPT Official Emblem (Black & White)',
      desc: 'Minimalist OpenAI-style monochrome knot with star and wordmark',
      url: '/coregpt-logo.png',
    },
    {
      id: 'gold-crown',
      name: 'Imperial Gold & Onyx',
      desc: 'Prestigious geometric gold prism in black obsidian squircle',
      url: `data:image/svg+xml;utf8,<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="28" fill="%230c0a09"/><rect width="120" height="120" rx="28" stroke="%23f59e0b" stroke-opacity="0.3" stroke-width="2"/><path d="M60 20L95 50L80 96H40L25 50L60 20Z" stroke="%23fbbf24" stroke-width="7" stroke-linejoin="round" fill="none"/><polygon points="60,36 82,54 74,86 46,86 38,54" fill="%23d97706" opacity="0.8"/><circle cx="60" cy="60" r="10" fill="%23fef3c7"/><circle cx="60" cy="60" r="4" fill="%23b45309"/></svg>`,
    },
    {
      id: 'emerald-nexus',
      name: 'Emerald Executive',
      desc: 'British racing emerald & titanium hexagon nexus',
      url: `data:image/svg+xml;utf8,<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="28" fill="%23051711"/><rect width="120" height="120" rx="28" stroke="%2310b981" stroke-opacity="0.3" stroke-width="2"/><path d="M60 22L92 41V79L60 98L28 79V41L60 22Z" stroke="%2334d399" stroke-width="8" stroke-linejoin="round"/><path d="M60 38L80 50V74L60 86L40 74V50L60 38Z" fill="%23059669"/><circle cx="60" cy="62" r="7" fill="%23a7f3d0"/></svg>`,
    },
    {
      id: 'amethyst-orbit',
      name: 'Royal Amethyst Orbit',
      desc: 'Deep violet quantum intelligence core with electric cyan pulse',
      url: `data:image/svg+xml;utf8,<svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="120" rx="28" fill="%230d091a"/><rect width="120" height="120" rx="28" stroke="%238b5cf6" stroke-opacity="0.3" stroke-width="2"/><circle cx="60" cy="60" r="32" stroke="%23a855f7" stroke-width="6"/><ellipse cx="60" cy="60" rx="42" ry="16" stroke="%2338bdf8" stroke-width="5" transform="rotate(-30 60 60)"/><circle cx="60" cy="60" r="12" fill="%23c084fc"/></svg>`,
    },
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, SVG, WebP, GIF)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setPreviewUrl(result);
      setLogoUrl(result);
    };
    reader.onerror = () => {
      setError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleApplyLogo = () => {
    try {
      if (previewUrl) {
        localStorage.setItem('think_ai_custom_logo', previewUrl);
      } else {
        localStorage.removeItem('think_ai_custom_logo');
      }

      window.dispatchEvent(new Event('think_ai_logo_change'));
      if (onLogoUpdated) onLogoUpdated(previewUrl || null);

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } catch (err) {
      setError('Failed to save logo to storage. Image may be too large.');
    }
  };

  const handleResetDefault = () => {
    setPreviewUrl('');
    setLogoUrl('');
    localStorage.removeItem('think_ai_custom_logo');
    window.dispatchEvent(new Event('think_ai_logo_change'));
    if (onLogoUpdated) onLogoUpdated(null);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white dark:bg-[#0c0d14] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600/10 dark:bg-blue-500/10 border border-blue-600/20 flex items-center justify-center text-blue-600 dark:text-sky-400">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-zinc-900 dark:text-white">
                CoreGPT Emblem & Branding
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Official Black & White Emblem (Founded by Umar Hani · Developed by Ahmadraza)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
              <Check className="w-4 h-4 shrink-0" />
              <span>Logo successfully updated across the assistant!</span>
            </div>
          )}

          {/* Live Preview Display Card */}
          <div className="p-5 rounded-xl border border-slate-200/80 dark:border-white/[0.08] bg-slate-50/70 dark:bg-white/[0.02]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-500" /> Live Logo Preview
              </span>
              <span className="text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                {previewUrl ? 'Custom Image Active' : 'Default 3D Emblem'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-around gap-6 py-4 bg-white dark:bg-[#07080d] rounded-lg border border-slate-200/60 dark:border-white/[0.04]">
              {/* Size Large */}
              <div className="flex flex-col items-center gap-2">
                <ThinkAiLogo size={64} customLogoUrl={previewUrl} />
                <span className="text-[10px] font-mono text-slate-400">Large (64px)</span>
              </div>
              {/* Size Medium with text */}
              <div className="flex flex-col items-center gap-2">
                <ThinkAiLogo size={36} showText customLogoUrl={previewUrl} />
                <span className="text-[10px] font-mono text-slate-400">Brand Header (36px)</span>
              </div>
              {/* Size Small */}
              <div className="flex flex-col items-center gap-2">
                <ThinkAiLogo size={28} customLogoUrl={previewUrl} />
                <span className="text-[10px] font-mono text-slate-400">Chat Avatar (28px)</span>
              </div>
            </div>
          </div>

          {/* Tab Selector for Logo Source */}
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 dark:bg-white/[0.04] rounded-xl border border-slate-200/60 dark:border-white/[0.06]">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-sky-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload Image</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'url'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-sky-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Image URL</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('presets')}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'presets'
                  ? 'bg-white dark:bg-zinc-800 text-blue-600 dark:text-sky-300 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Classic Styles</span>
            </button>
          </div>

          {/* Tab Content: Upload */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-white/[0.12] hover:border-blue-500 dark:hover:border-blue-400 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors group bg-white/50 dark:bg-white/[0.01]"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-white/[0.05] text-blue-600 dark:text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-zinc-200">
                  Click to select an image from your device
                </p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-1">
                  Supports PNG, JPG, WebP, SVG, GIF (up to 5MB)
                </p>
              </div>
            </div>
          )}

          {/* Tab Content: Image URL */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                Direct Image Link / CDN URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://example.com/logo.png"
                  value={logoUrl}
                  onChange={(e) => {
                    setLogoUrl(e.target.value);
                    setPreviewUrl(e.target.value.trim());
                  }}
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-black/30 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setPreviewUrl(logoUrl.trim())}
                  className="px-4 py-2 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Preview
                </button>
              </div>
              <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                Paste any publicly accessible image link or base64 data URI.
              </p>
            </div>
          )}

          {/* Tab Content: Presets */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setPreviewUrl(preset.url);
                    setLogoUrl(preset.url);
                  }}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    previewUrl === preset.url
                      ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/30'
                      : 'border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/[0.15]'
                  }`}
                >
                  <div className="shrink-0">
                    <ThinkAiLogo size={36} customLogoUrl={preset.url} />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-900 dark:text-zinc-100 truncate">
                      {preset.name}
                    </span>
                    <span className="block text-[10px] text-slate-500 dark:text-zinc-400 line-clamp-2 mt-0.5">
                      {preset.desc}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleResetDefault}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-slate-700 dark:text-zinc-300 text-xs font-medium hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApplyLogo}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-sm shadow-blue-600/30 active:scale-[0.99]"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Logo</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
