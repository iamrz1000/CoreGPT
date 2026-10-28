import React, { useState, useEffect } from 'react';
import {
  LayoutTemplate,
  X,
  Search,
  Check,
  Loader2,
  FolderPlus,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { CommunityTemplate } from '../types/index.ts';

interface CommunityTemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCloned?: (template: CommunityTemplate) => void;
}

export const CommunityTemplatesModal: React.FC<CommunityTemplatesModalProps> = ({
  isOpen,
  onClose,
  onCloned,
}) => {
  const [templates, setTemplates] = useState<CommunityTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [clonedSuccess, setClonedSuccess] = useState<string | null>(null);
  const [cloneError, setCloneError] = useState<string | null>(null);

  const categories = [
    'All',
    'Marketing',
    'Video Production',
    'Brand Launch',
    'Software Development',
    'Content Creation',
    'Education',
  ];

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, category, search]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await api.templates.list(category, search);
      setTemplates(res.templates);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (tpl: CommunityTemplate) => {
    setCloningId(tpl.id);
    setClonedSuccess(null);
    setCloneError(null);
    try {
      await api.templates.clone(tpl.id);
      setClonedSuccess(tpl.id);
      tpl.clone_count += 1;
      if (onCloned) onCloned(tpl);
      setTimeout(() => setClonedSuccess(null), 3000);
    } catch (err: any) {
      setCloneError(err.message || 'Failed to clone template');
    } finally {
      setCloningId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0e121a] border border-cyan-500/30 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Community Templates</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Curated Workspaces
                </span>
              </div>
              <p className="text-xs text-slate-400">Instantiate battle-tested project pipelines and workflows in one click</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="px-6 py-3 border-b border-slate-800 bg-slate-950/40 flex flex-col sm:flex-row gap-3 items-center justify-between shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto custom-scrollbar pb-1 sm:pb-0">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
                  category === c
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900/10">
          {cloneError && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
              <span className="font-bold">Error:</span> {cloneError}
            </div>
          )}

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              <p className="text-xs text-slate-400">Loading templates...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="p-5 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4 shadow-sm"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-950/60 text-emerald-300 border border-emerald-800/60">
                        {tpl.category}
                      </span>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {tpl.clone_count} clones
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-white">{tpl.title}</h3>
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {tpl.description}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-slate-800/80">
                    <div className="flex flex-wrap gap-1">
                      {tpl.tags?.slice(0, 3).map((tg, i) => (
                        <span key={i} className="text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded">
                          #{tg}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => handleClone(tpl)}
                      disabled={cloningId === tpl.id}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow"
                    >
                      {cloningId === tpl.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Cloning...
                        </>
                      ) : clonedSuccess === tpl.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-white" />
                          Cloned to Workspace!
                        </>
                      ) : (
                        <>
                          <FolderPlus className="w-3.5 h-3.5" />
                          Clone to Workspace
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {templates.length === 0 && !loading && (
                <div className="col-span-full py-16 text-center text-slate-500 text-xs">
                  No templates match your filters.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
