import React, { useState, useEffect } from 'react';
import {
  Download,
  Smartphone,
  Apple,
  CheckCircle2,
  ExternalLink,
  Share,
  PlusSquare,
  Sparkles,
  X,
  PackageCheck,
  ShieldCheck,
  Layers,
} from 'lucide-react';
import { CoreGptLogo } from './ThinkAiLogo.tsx';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  deferredPrompt?: any;
  onInstallSuccess?: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({
  isOpen,
  onClose,
  deferredPrompt,
  onInstallSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'install' | 'apk'>('install');
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'installed'>('idle');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isGoogle = /android/.test(ua);
      setIsIOS(isApple);
      setIsAndroid(isGoogle);

      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;
      setIsStandalone(standalone);
      if (standalone) {
        setInstallStatus('installed');
      }
    }
  }, []);

  if (!isOpen) return null;

  const handleNativeInstall = async () => {
    if (deferredPrompt) {
      setInstallStatus('installing');
      try {
        deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setInstallStatus('installed');
          onInstallSuccess?.();
        } else {
          setInstallStatus('idle');
        }
      } catch (err) {
        console.error('PWA install error:', err);
        setInstallStatus('idle');
      }
    } else if (isAndroid) {
      // In Android Chrome when prompt already fired or ambient
      setInstallStatus('idle');
    }
  };

  const githubRepoUrl = 'https://github.com/iamrz1000/HYNEX-AI';
  const githubReleasesUrl = 'https://github.com/iamrz1000/HYNEX-AI/releases';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-[#181818] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 border-b border-zinc-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CoreGptLogo size={36} />
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <span>Install HYNEX AI App</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                  Android & iOS
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Run natively on your phone without browser bars
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-zinc-200 dark:border-white/[0.08] px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('install')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 -mb-px cursor-pointer flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'install'
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>Direct Mobile Install (Recommended)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apk')}
            className={`flex-1 py-2.5 text-xs font-semibold border-b-2 -mb-px cursor-pointer flex items-center justify-center gap-2 transition-colors ${
              activeTab === 'apk'
                ? 'border-zinc-900 text-zinc-900 dark:border-white dark:text-white'
                : 'border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>Android APK Package</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'install' ? (
            <div className="space-y-4">
              {/* Standalone status */}
              {isStandalone && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5 text-xs text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>HYNEX AI is running in native standalone application mode!</span>
                </div>
              )}

              {/* iOS Instructions */}
              {isIOS ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10">
                    <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white mb-1.5">
                      <Apple className="w-4 h-4" />
                      <span>How to Install on iPhone / iPad:</span>
                    </div>
                    <ol className="text-xs text-zinc-600 dark:text-zinc-300 space-y-2 list-decimal list-inside leading-relaxed">
                      <li>
                        Open this page in <span className="font-semibold text-zinc-900 dark:text-white">Safari</span> browser.
                      </li>
                      <li className="flex items-center gap-1.5 inline-flex">
                        <span>Tap the</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-white/10 font-medium text-[11px] text-zinc-900 dark:text-white">
                          <Share className="w-3 h-3" /> Share
                        </span>
                        <span>button in Safari's bottom toolbar.</span>
                      </li>
                      <li className="flex items-center gap-1.5 inline-flex">
                        <span>Scroll down and select</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-200 dark:bg-white/10 font-medium text-[11px] text-zinc-900 dark:text-white">
                          <PlusSquare className="w-3 h-3" /> Add to Home Screen
                        </span>
                        <span>.</span>
                      </li>
                      <li>
                        Tap <span className="font-semibold text-zinc-900 dark:text-white">Add</span> in the top-right corner.
                      </li>
                    </ol>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    * Note: Apple iOS does not support .apk files. The official and only way to install apps outside the App Store on iPhone/iPad is via "Add to Home Screen".
                  </p>
                </div>
              ) : (
                /* Android & Desktop 1-Click Install */
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 flex items-start gap-3">
                    <Smartphone className="w-5 h-5 text-zinc-700 dark:text-zinc-200 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <p className="font-semibold text-zinc-900 dark:text-white mb-1">
                        1-Tap Progressive Web App (PWA)
                      </p>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Installs HYNEX AI directly onto your Android phone or computer as a standalone app with its own home screen icon, instant launch, and offline caching.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleNativeInstall}
                    disabled={installStatus === 'installed'}
                    className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {installStatus === 'installed' ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>HYNEX AI Already Installed</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>{deferredPrompt ? 'Install HYNEX AI Now' : 'Add HYNEX AI to Home Screen'}</span>
                      </>
                    )}
                  </button>

                  <div className="p-3 rounded-lg bg-zinc-100 dark:bg-white/[0.02] text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                    <span>Works on Android (Chrome, Samsung Internet, Edge), Windows, Mac, and Linux</span>
                    <ShieldCheck className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* APK Package Information */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-zinc-50 dark:bg-white/[0.03] border border-zinc-200 dark:border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                  <PackageCheck className="w-4 h-4 text-zinc-900 dark:text-white" />
                  <span>Android Package Kit (.apk) Build & Releases</span>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  Your GitHub repository <span className="font-mono text-zinc-900 dark:text-zinc-200">iamrz1000/HYNEX-AI</span> is configured with GitHub Actions to build <span className="font-mono text-zinc-900 dark:text-zinc-200">app-debug.apk</span> automatically and publish it under GitHub Releases.
                </p>

                <div className="space-y-2 pt-1 border-t border-zinc-200 dark:border-white/10 text-xs text-zinc-600 dark:text-zinc-300">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-white">1.</span>
                    <span>
                      <strong className="text-zinc-900 dark:text-white">Android:</strong> Download <span className="font-mono">app-debug.apk</span> directly to your phone and tap to install.
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-white">2.</span>
                    <span>
                      <strong className="text-zinc-900 dark:text-white">iOS (iPhone/iPad):</strong> iOS does <strong className="underline">not</strong> support .apk files. Use the <strong className="text-zinc-900 dark:text-white">Direct Mobile Install</strong> tab above to add HYNEX AI to your iOS Home Screen.
                    </span>
                  </div>
                </div>
              </div>

              {/* GitHub Releases Link */}
              <div className="space-y-2">
                <a
                  href={githubReleasesUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
                >
                  <Download className="w-4 h-4" />
                  <span>View & Download APK Releases on GitHub</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-1" />
                </a>

                <a
                  href={githubRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-4 rounded-xl border border-zinc-300 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-white/5 font-medium text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Open GitHub Repository (iamrz1000/HYNEX-AI)</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 dark:bg-white/[0.02] border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>HYNEX AI Mobile Edition</span>
          <span>Founded by Umar Hani · Ahmadraza</span>
        </div>
      </div>
    </div>
  );
};
