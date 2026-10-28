import React, { useState, useEffect } from 'react';
import {
  Compass,
  X,
  History,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Play,
  Sparkles,
  Users,
  ShieldCheck,
  ChevronRight,
  Plus,
  Loader2,
  Check,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Project, ProjectDecision, ProjectVersion, ProjectActivity } from '../types/index.ts';
import { CollabModal } from './CollabModal.tsx';

interface ProjectTwinModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onUpdateProject: (updated: Project) => void;
  onContinueAction?: (action: string) => void;
}

export const ProjectTwinModal: React.FC<ProjectTwinModalProps> = ({
  isOpen,
  onClose,
  project,
  onUpdateProject,
  onContinueAction,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'decisions' | 'versions' | 'consistency' | 'activity'>('overview');
  const [decisions, setDecisions] = useState<ProjectDecision[]>(project.decisions || []);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [nextStep, setNextStep] = useState<any>(null);
  const [consistencyReport, setConsistencyReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showCollab, setShowCollab] = useState(false);

  const [newDecisionTitle, setNewDecisionTitle] = useState('');
  const [newDecisionDesc, setNewDecisionDesc] = useState('');
  const [newDecisionCategory, setNewDecisionCategory] = useState('creative');
  const [newChangelog, setNewChangelog] = useState('');
  const [instructions, setInstructions] = useState(project.instructions || '');
  const [targetAudience, setTargetAudience] = useState(project.target_audience || '');
  const [savingInstructions, setSavingInstructions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && project.id) {
      loadTwinData();
    }
  }, [isOpen, project.id]);

  const loadTwinData = async () => {
    setLoading(true);
    try {
      const [vRes, aRes, sRes] = await Promise.all([
        api.projectTwin.getVersions(project.id),
        api.projectTwin.getActivity(project.id),
        api.projectTwin.continueStep(project.id),
      ]);
      setVersions(vRes.versions || []);
      setActivity(aRes.activity || []);
      setNextStep(sRes.nextStep);
      setDecisions(project.decisions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInstructions = async () => {
    setSavingInstructions(true);
    setErrorMessage(null);
    try {
      const updated = await api.projects.update(project.id, {
        instructions,
        target_audience: targetAudience,
      });
      onUpdateProject(updated);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update instructions');
    } finally {
      setSavingInstructions(false);
    }
  };

  const handleAddDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDecisionTitle.trim()) return;
    setErrorMessage(null);
    try {
      const res = await api.projectTwin.addDecision(project.id, {
        title: newDecisionTitle.trim(),
        description: newDecisionDesc.trim(),
        category: newDecisionCategory,
        status: 'approved',
      });
      setDecisions([...decisions, res.decision]);
      setNewDecisionTitle('');
      setNewDecisionDesc('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to add decision');
    }
  };

  const handleToggleDecision = async (decision: ProjectDecision) => {
    const nextStatus = decision.status === 'approved' ? 'suggested' : 'approved';
    setErrorMessage(null);
    try {
      const res = await api.projectTwin.updateDecision(project.id, decision.id, {
        status: nextStatus,
      });
      setDecisions(decisions.map((d) => (d.id === decision.id ? res.decision : d)));
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update decision');
    }
  };

  const handleCreateVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    try {
      const res = await api.projectTwin.createVersion(project.id, newChangelog || 'Snapshot checkpoint');
      setVersions([res.version, ...versions]);
      setNewChangelog('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save version');
    }
  };

  const handleRunConsistency = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.projectTwin.checkConsistency(project.id);
      setConsistencyReport(res.report);
    } catch (err: any) {
      setErrorMessage(err.message || 'Consistency check failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#0f131c] border border-cyan-500/30 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white tracking-wide">Hynex Project Twin</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    Live Digital Context
                  </span>
                </div>
                <p className="text-xs text-slate-400">{project.title}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCollab(true)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Team Access</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {nextStep && (
            <div className="px-6 py-3 bg-gradient-to-r from-cyan-950/40 via-slate-900/50 to-blue-950/40 border-b border-cyan-500/20 flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-300">
                  <Play className="w-4 h-4 fill-cyan-400" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-2">
                    Next Recommended Step: {nextStep.title}
                    <span className="text-[10px] uppercase font-semibold text-cyan-400 font-mono">
                      Stage: {nextStep.recommendedStage}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{nextStep.description}</p>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  if (onContinueAction) onContinueAction(nextStep.action);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow shrink-0"
              >
                <span>Continue Project</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 shrink-0 gap-2">
            {[
              { id: 'overview', label: 'Overview & Objectives' },
              { id: 'decisions', label: `Decisions (${decisions.length})` },
              { id: 'consistency', label: 'Consistency Assistant' },
              { id: 'versions', label: `Version History (${versions.length})` },
              { id: 'activity', label: 'Activity Audit' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`py-3 px-3 text-xs font-bold border-b-2 transition-all ${
                  activeTab === t.id
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-slate-900/10">
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-3xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Project Category</span>
                    <div className="text-sm font-semibold text-white capitalize">{project.category}</div>
                  </div>
                  <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Current Workflow Stage</span>
                    <div className="text-sm font-semibold text-cyan-400 capitalize">
                      {project.current_stage || 'Planning & Scripting'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Project Instructions & Guidelines
                  </label>
                  <textarea
                    rows={4}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Describe core directives, rules, approved tone, narrative arc..."
                    className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500 resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    Target Audience & Niche
                  </label>
                  <input
                    type="text"
                    value={targetAudience}
                    onChange={(e) => setTargetAudience(e.target.value)}
                    placeholder="e.g. Young professionals, indie sci-fi enthusiasts"
                    className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleSaveInstructions}
                    disabled={savingInstructions}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 transition-all shadow"
                  >
                    {savingInstructions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save Context Updates
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'decisions' && (
              <div className="space-y-6 max-w-3xl">
                <form onSubmit={handleAddDecision} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-cyan-400" /> Record Project Decision
                  </span>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newDecisionTitle}
                      onChange={(e) => setNewDecisionTitle(e.target.value)}
                      placeholder="e.g. Set Protagonist name to Lyra Vance"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <input
                      type="text"
                      value={newDecisionDesc}
                      onChange={(e) => setNewDecisionDesc(e.target.value)}
                      placeholder="Rationale or details (optional)"
                      className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newDecisionTitle.trim()}
                      className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow transition-all"
                    >
                      Record Decision
                    </button>
                  </div>
                </form>

                <div className="space-y-2.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Approved Decisions vs. AI Suggestions
                  </span>
                  {decisions.map((d) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-white">{d.title}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              d.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {d.status}
                          </span>
                        </div>
                        {d.description && <p className="text-[11px] text-slate-400">{d.description}</p>}
                      </div>

                      <button
                        onClick={() => handleToggleDecision(d)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors shrink-0"
                      >
                        {d.status === 'approved' ? 'Mark Suggestion' : 'Approve Decision'}
                      </button>
                    </div>
                  ))}

                  {decisions.length === 0 && (
                    <div className="text-xs text-slate-500 py-6 text-center">
                      No decisions recorded yet. Approved decisions are respected across all generations.
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'consistency' && (
              <div className="space-y-6 max-w-3xl">
                <div className="p-5 rounded-xl bg-slate-950/60 border border-cyan-500/20 flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" /> Consistency Assistant
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Scans scenes, dialogue, character visual references, and instructions for conflicts or outdated names.
                    </p>
                  </div>
                  <button
                    onClick={handleRunConsistency}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow shrink-0"
                  >
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Run Audit
                  </button>
                </div>

                {consistencyReport && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300">Consistency Score</span>
                      <span className="text-lg font-black text-cyan-400">{consistencyReport.score}%</span>
                    </div>

                    {consistencyReport.conflicts?.length > 0 ? (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          Identified Conflicts ({consistencyReport.conflicts.length})
                        </span>
                        {consistencyReport.conflicts.map((c: any, i: number) => (
                          <div key={i} className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-xs space-y-1">
                            <div className="font-bold text-amber-200">{c.issue}</div>
                            <div className="text-slate-300">{c.recommendation}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        No inconsistencies or conflicting decisions detected across your project assets!
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'versions' && (
              <div className="space-y-6 max-w-3xl">
                <form onSubmit={handleCreateVersion} className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-cyan-400" /> Create Version Snapshot
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newChangelog}
                      onChange={(e) => setNewChangelog(e.target.value)}
                      placeholder="e.g. Completed Act 1 storyboard and updated character visual traits"
                      className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow transition-all"
                    >
                      Snapshot
                    </button>
                  </div>
                </form>

                <div className="space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Snapshots Archive
                  </span>
                  {versions.map((v) => (
                    <div
                      key={v.id}
                      className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-xs text-white">Version #{v.version_number}</div>
                        <div className="text-[11px] text-slate-400">{v.changelog}</div>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        {new Date(v.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}

                  {versions.length === 0 && (
                    <div className="text-xs text-slate-500 py-6 text-center">No version snapshots yet.</div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="space-y-2 max-w-3xl">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Project Audit Trail
                </span>
                <div className="space-y-2">
                  {activity.map((a) => (
                    <div
                      key={a.id}
                      className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-slate-200 capitalize">
                          {a.action.replace('_', ' ')}
                        </div>
                        {a.details && <div className="text-[11px] text-slate-400">{a.details}</div>}
                      </div>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(a.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}

                  {activity.length === 0 && (
                    <div className="text-xs text-slate-500 py-6 text-center">No recorded activity yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCollab && (
        <CollabModal
          isOpen={showCollab}
          onClose={() => setShowCollab(false)}
          projectId={project.id}
          projectTitle={project.title}
        />
      )}
    </>
  );
};
