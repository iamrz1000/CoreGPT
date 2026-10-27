import React, { useState, useEffect } from 'react';
import {
  FolderKanban,
  Plus,
  Play,
  Trash2,
  Clock,
  Film,
  Brain,
  Cpu,
  Sparkles,
  ArrowRight,
  Layers,
  FileText,
  AlertCircle,
  X,
  Users,
  Compass,
} from 'lucide-react';
import { ProjectTwinModal } from './ProjectTwinModal.tsx';
import { Project } from '../types/index.ts';
import { api } from '../services/api.ts';

interface ProjectHubProps {
  onSelectProject: (project: Project) => void;
  onOpenCreator: (project: Project) => void;
  onOpenAgent: (project: Project) => void;
  onOpenMemories: (project: Project) => void;
  activeProject: Project | null;
}

export const ProjectHub: React.FC<ProjectHubProps> = ({
  onSelectProject,
  onOpenCreator,
  onOpenAgent,
  onOpenMemories,
  activeProject,
}) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New project modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newCategory, setNewCategory] = useState<Project['category']>('film');
  const [twinProject, setTwinProject] = useState<Project | null>(null);
  const [showTwin, setShowTwin] = useState(false);

  // Templates
  const templates = [
    {
      title: 'Neon Odyssey: Sci-Fi Short',
      category: 'film' as const,
      description: 'A cyberpunk bounty hunter tracking rogue synthetic intelligence through Neo-Shinjuku.',
    },
    {
      title: 'Nature Wonders: Aerial Earth',
      category: 'general' as const,
      description: 'A majestic 4K documentary capturing untamed volcanic landscapes and deep oceanic trenches.',
    },
    {
      title: 'Commercial: Cybernetic Hypercar',
      category: 'commercial' as const,
      description: 'High-octane automotive teaser highlighting carbon aerodynamic lines and quantum speed.',
    },
  ];

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.projects.list();
      setProjects(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const created = await api.projects.create({
        title: newTitle.trim(),
        description: newDescription.trim(),
        category: newCategory,
        status: 'draft',
      });
      setProjects([created, ...projects]);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDescription('');
      onSelectProject(created);
    } catch (err: any) {
      setError(err.message || 'Failed to create project.');
    }
  };

  const handleResume = async (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await api.projects.resume(project.id);
      onSelectProject(res.project);
      onOpenCreator(res.project);
    } catch (err: any) {
      setError(err.message || 'Failed to resume project.');
    }
  };

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Delete this project and all scoped scene assets?')) return;
    try {
      await api.projects.delete(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete project.');
    }
  };

  const applyTemplate = (t: typeof templates[0]) => {
    setNewTitle(t.title);
    setNewDescription(t.description);
    setNewCategory(t.category);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-zinc-50 dark:bg-[#141414] p-4 md:p-8">
      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
              <FolderKanban className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Hynex Project Hub
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Isolated Workspaces
                </span>
              </h1>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage your screenplays, scenes, character libraries, and task executions per project.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md transition-all active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Project</span>
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Project Cards Grid */}
        {loading ? (
          <div className="text-center py-12 text-xs text-zinc-400">Loading workspaces...</div>
        ) : projects.length === 0 ? (
          <div className="p-8 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-white/10 text-center space-y-3 bg-white dark:bg-[#1a1a1a]">
            <FolderKanban className="w-12 h-12 text-zinc-300 dark:text-zinc-600 mx-auto" />
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">No Creative Projects Yet</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Start by creating a workspace. Each project gives you dedicated scene timelines, character consistency libraries, and task execution persistence.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Launch First Project</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const isActive = activeProject?.id === proj.id;
              const sceneCount = proj.scenes?.length || 0;
              const charCount = proj.character_refs?.length || 0;

              return (
                <div
                  key={proj.id}
                  onClick={() => onSelectProject(proj)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                    isActive
                      ? 'border-purple-500 bg-purple-500/5 shadow-md dark:bg-purple-950/10'
                      : 'border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1e1e1e] hover:border-zinc-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 font-semibold">
                        {proj.category}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            proj.status === 'completed'
                              ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                              : proj.status === 'in_progress'
                              ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20'
                          }`}
                        >
                          {proj.status.replace('_', ' ')}
                        </span>
                        <button
                          onClick={(e) => handleDelete(proj.id, e)}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded"
                          title="Delete Project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-white group-hover:text-purple-400 transition-colors line-clamp-1">
                        {proj.title}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1">
                        {proj.description || 'No premise or synopsis specified.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-100 dark:border-white/5 pt-3">
                      <span className="flex items-center gap-1">
                        <Film className="w-3 h-3 text-purple-400" />
                        {sceneCount} Scene{sceneCount === 1 ? '' : 's'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-blue-400" />
                        {charCount} Character{charCount === 1 ? '' : 's'}
                      </span>
                      <span className="flex items-center gap-1 ml-auto text-[10px]">
                        <Clock className="w-3 h-3" />
                        {new Date(proj.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-2">
                    <button
                      onClick={(e) => handleResume(proj, e)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-2xs transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      <span>Resume Project</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(proj);
                        onOpenAgent(proj);
                      }}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-white/10 hover:border-purple-500/40 text-zinc-600 dark:text-zinc-300"
                      title="Autonomous Agent for this project"
                    >
                      <Cpu className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProject(proj);
                        onOpenMemories(proj);
                      }}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-white/10 hover:border-purple-500/40 text-zinc-600 dark:text-zinc-300"
                      title="Project Memories"
                    >
                      <Brain className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTwinProject(proj);
                        setShowTwin(true);
                      }}
                      className="p-2 rounded-lg border border-zinc-200 dark:border-white/10 hover:border-cyan-500/40 text-cyan-600 dark:text-cyan-400"
                      title="Project Twin (Digital Context, Decisions, Versions, Consistency)"
                    >
                      <Compass className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Project Twin Modal */}
      {showTwin && twinProject && (
        <ProjectTwinModal
          isOpen={showTwin}
          onClose={() => setShowTwin(false)}
          project={twinProject}
          onUpdateProject={(updated) => {
            setTwinProject(updated);
            setProjects(projects.map((p) => (p.id === updated.id ? updated : p)));
          }}
          onContinueAction={(action) => {
            if (action === 'generate_script' || action === 'breakdown_scenes' || action === 'render_scene') {
              onOpenCreator(twinProject);
            } else {
              onOpenAgent(twinProject);
            }
          }}
        />
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#1e1e1e] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <FolderKanban className="w-5 h-5" />
                </div>
                <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                  Create Creative Project
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Templates */}
            <div>
              <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                Or Start With a Template:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-1.5">
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className="p-2 text-left rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-white/5 hover:border-purple-500/40 text-[11px] transition-colors"
                  >
                    <span className="font-bold text-zinc-900 dark:text-white block line-clamp-1">
                      {tpl.title}
                    </span>
                    <span className="text-zinc-400 text-[10px] block line-clamp-2 mt-0.5">
                      {tpl.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Project Title:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Echoes of Andromeda"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Category:
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full py-2 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] text-zinc-900 dark:text-white focus:outline-none"
                >
                  <option value="film">Cinematic Short Film</option>
                  <option value="short_video">Short-form Video (Reels/TikTok)</option>
                  <option value="animation">Anime & 3D Animation</option>
                  <option value="commercial">Commercial / Teaser</option>
                  <option value="general">Creative Storyboard</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Premise / Synopsis:
                </label>
                <textarea
                  placeholder="Describe the storyline, aesthetic, and characters..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                  className="w-full py-2 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
