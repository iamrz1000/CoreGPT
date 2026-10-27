import React, { useState, useEffect } from 'react';
import {
  Boxes,
  X,
  Play,
  Plus,
  Trash2,
  Share2,
  Check,
  Loader2,
  Code2,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { MiniApp } from '../types/index.ts';

interface MiniAppsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MiniAppsModal: React.FC<MiniAppsModalProps> = ({ isOpen, onClose }) => {
  const [miniApps, setMiniApps] = useState<MiniApp[]>([]);
  const [selectedApp, setSelectedApp] = useState<MiniApp | null>(null);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [runResult, setRunResult] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, any>>({});
  const [isEditing, setIsEditing] = useState(false);

  // Builder form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [outputFormat, setOutputFormat] = useState<'markdown' | 'json' | 'html'>('markdown');
  const [inputs, setInputs] = useState<MiniApp['inputs']>([]);
  const [isPublished, setIsPublished] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadApps();
    }
  }, [isOpen]);

  const loadApps = async () => {
    setLoading(true);
    try {
      const res = await api.miniApps.list();
      setMiniApps(res.miniApps);
      if (res.miniApps.length > 0 && !selectedApp) {
        selectApp(res.miniApps[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const selectApp = (app: MiniApp) => {
    setSelectedApp(app);
    setName(app.name);
    setDescription(app.description);
    setInstructions(app.instructions);
    setOutputFormat(app.output_format);
    setInputs(app.inputs);
    setIsPublished(app.is_published);
    setRunResult(null);
    setIsEditing(false);

    const defaults: Record<string, any> = {};
    app.inputs?.forEach((inp) => {
      defaults[inp.key] = inp.default_value || '';
    });
    setInputValues(defaults);
  };

  const handleCreateNew = () => {
    setSelectedApp(null);
    setName('Viral Reel Hook & Script Generator');
    setDescription('Generates 3 punchy hooks and a 30s TikTok/Reels video script from a single topic.');
    setInstructions('You are an expert short-form video copywriter. Write 3 scroll-stopping 3-second hooks, followed by a fast-paced 30-second script with visual cue notes.');
    setOutputFormat('markdown');
    setInputs([
      { key: 'topic', label: 'Video Topic', type: 'text', placeholder: 'e.g. AI tools for productivity', default_value: 'AI productivity hacks' },
      { key: 'niche', label: 'Target Audience Niche', type: 'text', placeholder: 'e.g. Solo entrepreneurs', default_value: 'Startup founders' },
    ]);
    setIsPublished(true);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      if (selectedApp) {
        const res = await api.miniApps.update(selectedApp.id, {
          name,
          description,
          instructions,
          output_format: outputFormat,
          inputs,
          is_published: isPublished,
        });
        setSelectedApp(res.miniApp);
      } else {
        const res = await api.miniApps.create({
          name,
          description,
          instructions,
          output_format: outputFormat,
          inputs,
          is_published: isPublished,
        });
        setSelectedApp(res.miniApp);
      }
      setIsEditing(false);
      await loadApps();
    } catch (err: any) {
      alert(err.message || 'Failed to save mini app');
    } finally {
      setLoading(false);
    }
  };

  const handleRun = async () => {
    if (!selectedApp) return;
    setRunning(true);
    setRunResult(null);
    try {
      const res = await api.miniApps.run(selectedApp.id, inputValues);
      setRunResult(res.result);
      selectedApp.run_count = (selectedApp.run_count || 0) + 1;
    } catch (err: any) {
      alert(err.message || 'Execution failed');
    } finally {
      setRunning(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#10141e] border border-cyan-500/30 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Hynex Mini-Apps</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  No-Code Builder
                </span>
              </div>
              <p className="text-xs text-slate-400">Create, run, and share specialized single-purpose AI micro-apps</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body 2-Column */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Apps List */}
          <div className="w-64 border-r border-slate-800/80 bg-slate-950/40 p-4 flex flex-col justify-between shrink-0">
            <div className="space-y-2 overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Micro-Apps</span>
                <button
                  onClick={handleCreateNew}
                  className="p-1 rounded bg-amber-600/30 text-amber-300 hover:bg-amber-600/50 transition-colors"
                  title="Create Mini App"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {miniApps.map((a) => (
                <div
                  key={a.id}
                  onClick={() => selectApp(a)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    selectedApp?.id === a.id
                      ? 'bg-amber-600/15 border-amber-500/40 text-white'
                      : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-900 text-slate-300'
                  }`}
                >
                  <div className="font-semibold text-xs truncate">{a.name}</div>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>{a.run_count || 0} runs</span>
                    <span className="uppercase text-[9px] text-amber-400 font-mono">{a.output_format}</span>
                  </div>
                </div>
              ))}

              {miniApps.length === 0 && !loading && (
                <div className="text-xs text-slate-500 py-6 text-center">
                  No mini-apps found. Click + to build your first AI tool.
                </div>
              )}
            </div>

            <button
              onClick={handleCreateNew}
              className="w-full mt-4 py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <Plus className="w-4 h-4" />
              Build Mini-App
            </button>
          </div>

          {/* Right: Main View / Execution Console */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-900/20">
            {selectedApp || isEditing ? (
              <div className="space-y-6 max-w-3xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{name}</h3>
                    <p className="text-xs text-slate-400">{description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing ? (
                      <button
                        onClick={() => setIsEditing(true)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
                      >
                        Edit Schema
                      </button>
                    ) : (
                      <button
                        onClick={handleSave}
                        disabled={loading || !name.trim()}
                        className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
                      >
                        Save App
                      </button>
                    )}
                  </div>
                </div>

                {/* Runner Form */}
                {!isEditing ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Input Parameters
                      </span>
                      <div className="space-y-3">
                        {inputs?.map((inp) => (
                          <div key={inp.key} className="space-y-1">
                            <label className="text-xs text-slate-300 font-medium">{inp.label}</label>
                            {inp.type === 'textarea' ? (
                              <textarea
                                rows={2}
                                value={inputValues[inp.key] ?? ''}
                                onChange={(e) =>
                                  setInputValues({ ...inputValues, [inp.key]: e.target.value })
                                }
                                placeholder={inp.placeholder}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                              />
                            ) : (
                              <input
                                type={inp.type === 'number' ? 'number' : 'text'}
                                value={inputValues[inp.key] ?? ''}
                                onChange={(e) =>
                                  setInputValues({ ...inputValues, [inp.key]: e.target.value })
                                }
                                placeholder={inp.placeholder}
                                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="pt-2">
                        <button
                          onClick={handleRun}
                          disabled={running}
                          className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md"
                        >
                          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                          Run Mini-App
                        </button>
                      </div>
                    </div>

                    {/* Output Viewer */}
                    {runResult && (
                      <div className="space-y-2 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                            Generated Output ({outputFormat})
                          </span>
                        </div>
                        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed max-h-80 overflow-y-auto custom-scrollbar font-mono">
                          {runResult}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Builder Form */
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">App Name</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Description</label>
                      <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">System Instructions</label>
                      <textarea
                        rows={3}
                        value={instructions}
                        onChange={(e) => setInstructions(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-300">Output Format</label>
                      <select
                        value={outputFormat}
                        onChange={(e) => setOutputFormat(e.target.value as any)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="markdown">Markdown</option>
                        <option value="json">JSON</option>
                        <option value="html">HTML</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 text-slate-500">
                <Boxes className="w-12 h-12 mb-3 text-slate-600" />
                <p className="text-sm font-medium">Select a mini-app from the sidebar or build a new one.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
