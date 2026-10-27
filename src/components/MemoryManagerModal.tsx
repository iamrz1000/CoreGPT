import React, { useState, useEffect } from 'react';
import {
  Brain,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Folder,
  Globe,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { MemoryItem, Project } from '../types/index.ts';
import { api } from '../services/api.ts';

interface MemoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProject?: Project | null;
  projects?: Project[];
}

export const MemoryManagerModal: React.FC<MemoryManagerModalProps> = ({
  isOpen,
  onClose,
  activeProject,
  projects = [],
}) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterProject, setFilterProject] = useState<string>('all'); // 'all' | 'global' | projectId

  // New Memory Form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryItem['category']>('fact');
  const [newProjectId, setNewProjectId] = useState<string>(activeProject?.id || '');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Clear confirmation
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMemories();
      if (activeProject) {
        setNewProjectId(activeProject.id);
      }
    }
  }, [isOpen, activeProject]);

  const loadMemories = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.memories.list();
      setMemories(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load memories.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    try {
      const created = await api.memories.create({
        key: newKey.trim(),
        value: newValue.trim(),
        category: newCategory,
        project_id: newProjectId ? newProjectId : null,
        source: 'user',
      });
      setMemories([created, ...memories]);
      setNewKey('');
      setNewValue('');
      setShowAddForm(false);
    } catch (err: any) {
      setError(err.message || 'Failed to save memory.');
    }
  };

  const handleSaveEdit = async (id: string) => {
    if (!editValue.trim()) return;
    try {
      const updated = await api.memories.update(id, { value: editValue.trim() });
      setMemories(memories.map((m) => (m.id === id ? updated : m)));
      setEditingId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to update memory.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.memories.delete(id);
      setMemories(memories.filter((m) => m.id !== id));
    } catch (err: any) {
      setError(err.message || 'Failed to delete memory.');
    }
  };

  const handleClear = async () => {
    try {
      const pId = filterProject === 'all' || filterProject === 'global' ? null : filterProject;
      await api.memories.clear(pId, true);
      await loadMemories();
      setConfirmClear(false);
    } catch (err: any) {
      setError(err.message || 'Failed to clear memories.');
    }
  };

  if (!isOpen) return null;

  const filtered = memories.filter((m) => {
    if (filterProject === 'global' && m.project_id) return false;
    if (filterProject !== 'all' && filterProject !== 'global' && m.project_id !== filterProject)
      return false;
    if (
      search &&
      !m.key.toLowerCase().includes(search.toLowerCase()) &&
      !m.value.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white dark:bg-[#1e1e1e] border border-zinc-200 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-zinc-200 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Brain className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Hynex Memory Engine
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 dark:text-purple-400 border border-purple-500/20">
                  Isolated & Persistent
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Manage global persona memories and project-specific knowledge.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-white/5"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar & Actions */}
        <div className="p-4 border-b border-zinc-200 dark:border-white/10 flex flex-wrap items-center justify-between gap-3 bg-zinc-50 dark:bg-[#181818]">
          <div className="flex items-center gap-2 flex-1 min-w-[220px]">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search memories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#242424] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="py-1.5 px-2.5 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#242424] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            >
              <option value="all">All Memories</option>
              <option value="global">Global Only</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Project: {p.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Memory</span>
            </button>
            <button
              onClick={() => setConfirmClear(true)}
              className="px-2.5 py-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-medium transition-colors"
              title="Clear filtered memories"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Clear Confirmation Warning */}
        {confirmClear && (
          <div className="p-3 bg-red-500/10 border-b border-red-500/20 flex items-center justify-between text-xs text-red-600 dark:text-red-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Are you sure you want to clear these saved memories? This cannot be undone.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleClear}
                className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setConfirmClear(false)}
                className="px-2 py-1 bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add Memory Form */}
        {showAddForm && (
          <form onSubmit={handleCreate} className="p-4 bg-purple-500/5 border-b border-purple-500/20 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Key / Subject (e.g. Director Style)"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                required
                className="py-1.5 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#242424] text-zinc-900 dark:text-white"
              />
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as any)}
                className="py-1.5 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#242424] text-zinc-900 dark:text-white"
              >
                <option value="preference">Preference</option>
                <option value="fact">Fact / Knowledge</option>
                <option value="directive">Directive</option>
                <option value="character">Character Trait</option>
                <option value="style">Aesthetic Style</option>
                <option value="project">Project Scope</option>
              </select>
              <select
                value={newProjectId}
                onChange={(e) => setNewProjectId(e.target.value)}
                className="py-1.5 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#242424] text-zinc-900 dark:text-white"
              >
                <option value="">Global (All Projects)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    Project: {p.title}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              placeholder="Memory content / detail to remember..."
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
              rows={2}
              required
              className="w-full py-1.5 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#242424] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium"
              >
                Save Memory
              </button>
            </div>
          </form>
        )}

        {/* Memory List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {error && (
            <div className="p-3 text-xs text-red-500 bg-red-500/10 rounded-lg">{error}</div>
          )}

          {loading ? (
            <div className="text-center py-8 text-zinc-400 text-xs">Loading memories...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10">
              <Brain className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">No memories stored yet.</p>
              <p className="text-[11px] text-zinc-400 mt-1">
                Save preferences, directives, or character traits for HYNEX AI to recall across conversations.
              </p>
            </div>
          ) : (
            filtered.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#212121] hover:border-purple-500/30 transition-all shadow-2xs group"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-zinc-900 dark:text-white">
                      {item.key}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                      {item.category}
                    </span>
                    {item.project_id ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        <Folder className="w-2.5 h-2.5" />
                        Project Scoped
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        <Globe className="w-2.5 h-2.5" />
                        Global
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    {editingId === item.id ? (
                      <>
                        <button
                          onClick={() => handleSaveEdit(item.id)}
                          className="p-1 text-emerald-500 hover:bg-emerald-500/10 rounded"
                          title="Save"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1 text-zinc-400 hover:bg-zinc-500/10 rounded"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(item.id);
                            setEditValue(item.value);
                          }}
                          className="p-1 text-zinc-400 hover:text-purple-400 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-zinc-400 hover:text-red-400 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === item.id ? (
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={2}
                    className="w-full mt-1 p-2 text-xs rounded-lg border border-purple-500/40 bg-zinc-50 dark:bg-[#1a1a1a] text-zinc-900 dark:text-white focus:outline-none"
                  />
                ) : (
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed">
                    {item.value}
                  </p>
                )}

                <div className="mt-2 text-[10px] text-zinc-400 flex items-center justify-between">
                  <span>Source: {item.source}</span>
                  <span>{new Date(item.updated_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
