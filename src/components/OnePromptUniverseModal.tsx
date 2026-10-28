import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Layers,
  Copy,
  Check,
  ArrowRight,
  FolderPlus,
  Loader2,
  AlertCircle,
  FileText,
  Palette,
  Film,
  Share2,
  TrendingUp,
} from 'lucide-react';
import { api } from '../services/api.ts';

interface Deliverable {
  id: string;
  title: string;
  type: string;
  content: string;
  status: 'pending' | 'generating' | 'completed' | 'waiting_approval';
  dependencies?: string[];
}

interface UniversePlan {
  project_title: string;
  project_summary: string;
  estimated_cost: string;
  deliverables: Deliverable[];
}

interface OnePromptUniverseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INSPIRATION_PROMPTS = [
  'Launch an Indie AI Cyberpunk Short Film with viral marketing and teaser trailers',
  'Direct-to-Consumer Organic Energy Drink brand with neon minimalist packaging and launch campaign',
  'Turnkey B2B SaaS Developer Tool for automated database migration and AI code optimization',
  'Next-Gen Web3 Gaming Guild with character lore, community manifesto, and visual identity',
];

export const OnePromptUniverseModal: React.FC<OnePromptUniverseModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<UniversePlan | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState<string | null>(null);
  const [isSavingProject, setIsSavingProject] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (customPrompt?: string) => {
    const targetPrompt = (customPrompt || prompt).trim();
    if (!targetPrompt) {
      setErrorMessage('Please describe your objective or pick an inspiration prompt below.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    setSavedSuccess(null);

    try {
      const res = await api.onePrompt.plan(targetPrompt);
      if (res.plan) {
        setPlan(res.plan);
      } else {
        throw new Error('No plan was generated.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate universe plan.';
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyDeliverable = (del: Deliverable) => {
    navigator.clipboard.writeText(`${del.title}\n\n${del.content}`);
    setCopiedId(del.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveToProjects = async () => {
    if (!plan) return;
    setIsSavingProject(true);
    setErrorMessage(null);
    try {
      await api.projects.create({
        title: plan.project_title,
        description: plan.project_summary,
        category: 'general',
        status: 'in_progress',
        script: plan.deliverables
          .map((d) => `### [${d.type.toUpperCase()}] ${d.title}\n\n${d.content}`)
          .join('\n\n---\n\n'),
      });
      setSavedSuccess(`Project "${plan.project_title}" created in your Project Hub!`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save project.';
      setErrorMessage(msg);
    } finally {
      setIsSavingProject(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'brand_identity':
        return <Layers className="w-4 h-4 text-cyan-400" />;
      case 'logo':
        return <Palette className="w-4 h-4 text-fuchsia-400" />;
      case 'video_script':
        return <Film className="w-4 h-4 text-amber-400" />;
      case 'social_post':
        return <Share2 className="w-4 h-4 text-emerald-400" />;
      case 'marketing_plan':
        return <TrendingUp className="w-4 h-4 text-indigo-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative flex flex-col w-full max-w-4xl max-h-[90vh] bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                One-Prompt Universe Engine
              </h2>
              <p className="text-xs text-zinc-400">
                Transform a single high-level objective into an end-to-end multi-deliverable ecosystem
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {errorMessage && (
            <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-xs text-rose-400 hover:text-rose-200"
              >
                Dismiss
              </button>
            </div>
          )}

          {savedSuccess && (
            <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm">
              <Check className="w-4 h-4 shrink-0" />
              <span>{savedSuccess}</span>
            </div>
          )}

          {/* Prompt Input Form */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
              Enter High-Level Goal or Strategic Objective
            </label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Build an autonomous luxury watch brand targeting Gen Z, complete with branding, visual identity, launch strategy, and 30-second teaser script..."
                rows={3}
                className="w-full p-3.5 bg-zinc-950/60 border border-zinc-800 rounded-xl text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none transition"
              />
            </div>

            {/* Inspiration Chips */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-medium text-zinc-500">Quick Inspiration Starters:</div>
              <div className="flex flex-wrap gap-2">
                {INSPIRATION_PROMPTS.map((insp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(insp);
                      handleGenerate(insp);
                    }}
                    className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800/70 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-700/50 transition text-left"
                  >
                    {insp}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => handleGenerate()}
                disabled={loading || !prompt.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-medium text-sm rounded-xl transition shadow-lg shadow-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Deliverable Matrix...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Universe Plan</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Generated Plan Overview */}
          {plan && (
            <div className="space-y-5 pt-4 border-t border-zinc-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-zinc-950/70 border border-zinc-800 rounded-xl">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    {plan.project_title}
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 max-w-2xl">
                    {plan.project_summary}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-zinc-500 block">
                      Execution Est.
                    </span>
                    <span className="text-xs font-mono font-medium text-cyan-400">
                      {plan.estimated_cost}
                    </span>
                  </div>
                  <button
                    onClick={handleSaveToProjects}
                    disabled={isSavingProject}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-white rounded-lg transition"
                  >
                    {isSavingProject ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                    <span>Save as Project</span>
                  </button>
                </div>
              </div>

              {/* Deliverables Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  <span>Synthesized Deliverables ({plan.deliverables.length})</span>
                  <span className="text-zinc-500 lowercase text-[11px] font-normal">
                    ready to inspect, copy, or export
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {plan.deliverables.map((del) => (
                    <div
                      key={del.id}
                      className="flex flex-col p-4 bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700 rounded-xl transition space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-zinc-900 border border-zinc-800 rounded-lg">
                            {getTypeIcon(del.type)}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-zinc-100">
                              {del.title}
                            </div>
                            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                              {del.type.replace('_', ' ')}
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleCopyDeliverable(del)}
                          className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition"
                          title="Copy content"
                        >
                          {copiedId === del.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      <div className="text-xs text-zinc-300 line-clamp-4 font-mono bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/80 whitespace-pre-wrap">
                        {del.content}
                      </div>

                      {del.dependencies && del.dependencies.length > 0 && (
                        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-zinc-500">
                          <span>Depends on:</span>
                          {del.dependencies.map((dep) => (
                            <span
                              key={dep}
                              className="px-1.5 py-0.2 bg-zinc-900 border border-zinc-800 rounded text-[10px] text-zinc-400 font-mono"
                            >
                              {dep}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
