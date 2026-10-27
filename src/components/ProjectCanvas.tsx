// @ts-nocheck
import React, { useState } from 'react';
import {
  Project,
  SceneItem,
  CharacterProfile,
  ProjectTask,
  ProjectAsset,
} from '../types/index.ts';
import {
  ArrowLeft,
  Save,
  Wand2,
  Clapperboard,
  Users,
  CheckSquare,
  FolderOpen,
  Download,
  Plus,
  Trash2,
  Copy,
  ExternalLink,
  Loader2,
  Sparkles,
  FileText,
  Clock,
  Layers,
} from 'lucide-react';
import { api } from '../services/api.ts';

interface ProjectCanvasProps {
  project: Project;
  onBack: () => void;
  onUpdate: (updatedProject: Project) => void;
  onNavigateToImages?: (prompt: string) => void;
  onNavigateToVideo?: (prompt: string) => void;
}

export const ProjectCanvas: React.FC<ProjectCanvasProps> = ({
  project,
  onBack,
  onUpdate,
  onNavigateToImages,
  onNavigateToVideo,
}) => {
  const [activeTab, setActiveTab] = useState<'canvas' | 'scenes' | 'characters' | 'tasks' | 'assets' | 'export'>('scenes');
  const [content, setContent] = useState(project.content || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // AI Pipeline modal state
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [pipelineBrief, setPipelineBrief] = useState(project.description || '');
  const [pipelineDuration, setPipelineDuration] = useState(60);
  const [pipelineAudience, setPipelineAudience] = useState('General Audience');
  const [pipelineStyle, setPipelineStyle] = useState('Cinematic 4K, Realistic Lighting');
  const [isGeneratingPipeline, setIsGeneratingPipeline] = useState(false);

  // New character state
  const [showCharModal, setShowCharModal] = useState(false);
  const [charName, setCharName] = useState('');
  const [charDesc, setCharDesc] = useState('');
  const [charClothing, setCharClothing] = useState('');
  const [charFeatures, setCharFeatures] = useState('');
  const [charRefImg, setCharRefImg] = useState('');

  // New task state
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // New asset state
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [assetName, setAssetName] = useState('');
  const [assetType, setAssetType] = useState<'image' | 'video' | 'audio' | 'document'>('image');
  const [assetUrl, setAssetUrl] = useState('');

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveContent = async () => {
    setIsSaving(true);
    try {
      const res = await api.projects.update(project.id, { content });
      onUpdate(res.project);
      triggerToast('Document saved successfully');
    } catch {
      triggerToast('Failed to save document');
    } finally {
      setIsSaving(false);
    }
  };

  // Run AI Content Pipeline
  const handleRunPipeline = async () => {
    if (!pipelineBrief.trim()) return;
    setIsGeneratingPipeline(true);
    try {
      const res = await api.projects.generatePipeline(project.id, {
        brief: pipelineBrief.trim(),
        durationSeconds: pipelineDuration,
        targetAudience: pipelineAudience,
        style: pipelineStyle,
      });
      onUpdate(res.project);
      setContent(res.project.content || '');
      setShowPipelineModal(false);
      setActiveTab('scenes');
      triggerToast('Content pipeline generated successfully!');
    } catch {
      triggerToast('Failed to run AI pipeline. Check network/API key.');
    } finally {
      setIsGeneratingPipeline(false);
    }
  };

  // Scene operations
  const handleAddScene = async () => {
    const nextNum = (project.scenes?.length || 0) + 1;
    const newScene: SceneItem = {
      id: crypto.randomUUID(),
      sceneNumber: nextNum,
      title: `Scene ${nextNum}`,
      duration: 10,
      scriptText: '',
      imagePrompt: '',
      videoPrompt: '',
      subtitleText: '',
    };
    const updatedScenes = [...(project.scenes || []), newScene];
    try {
      const res = await api.projects.update(project.id, { scenes: updatedScenes });
      onUpdate(res.project);
    } catch {
      triggerToast('Failed to add scene');
    }
  };

  const handleUpdateScene = async (sceneId: string, updates: Partial<SceneItem>) => {
    const updatedScenes = (project.scenes || []).map((s) =>
      s.id === sceneId ? { ...s, ...updates } : s
    );
    try {
      const res = await api.projects.update(project.id, { scenes: updatedScenes });
      onUpdate(res.project);
    } catch {
      triggerToast('Failed to update scene');
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    const updatedScenes = (project.scenes || []).filter((s) => s.id !== sceneId);
    try {
      const res = await api.projects.update(project.id, { scenes: updatedScenes });
      onUpdate(res.project);
    } catch {
      triggerToast('Failed to delete scene');
    }
  };

  // Character operations
  const handleSaveCharacter = async () => {
    if (!charName.trim()) return;
    const newChar: CharacterProfile = {
      id: crypto.randomUUID(),
      name: charName.trim(),
      description: charDesc.trim(),
      clothing: charClothing.trim(),
      distinguishingFeatures: charFeatures.trim(),
      referenceImageUrl: charRefImg.trim() || undefined,
    };
    const updatedChars = [...(project.characters || []), newChar];
    try {
      const res = await api.projects.update(project.id, { characters: updatedChars });
      onUpdate(res.project);
      setShowCharModal(false);
      setCharName('');
      setCharDesc('');
      setCharClothing('');
      setCharFeatures('');
      setCharRefImg('');
      triggerToast('Character profile added');
    } catch {
      triggerToast('Failed to add character');
    }
  };

  const handleDeleteCharacter = async (charId: string) => {
    const updatedChars = (project.characters || []).filter((c) => c.id !== charId);
    try {
      const res = await api.projects.update(project.id, { characters: updatedChars });
      onUpdate(res.project);
    } catch {
      triggerToast('Failed to remove character');
    }
  };

  // Task operations
  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;
    const newTask: ProjectTask = {
      id: crypto.randomUUID(),
      title: newTaskTitle.trim(),
      completed: false,
    };
    const updatedTasks = [...(project.tasks || []), newTask];
    try {
      const res = await api.projects.update(project.id, { tasks: updatedTasks });
      onUpdate(res.project);
      setNewTaskTitle('');
    } catch {
      triggerToast('Failed to add task');
    }
  };

  const handleToggleTask = async (taskId: string) => {
    const updatedTasks = (project.tasks || []).map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    try {
      const res = await api.projects.update(project.id, { tasks: updatedTasks });
      onUpdate(res.project);
    } catch {
      triggerToast('Failed to toggle task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const updatedTasks = (project.tasks || []).filter((t) => t.id !== taskId);
    try {
      const res = await api.projects.update(project.id, { tasks: updatedTasks });
      onUpdate(res.project);
    } catch {
      triggerToast('Failed to delete task');
    }
  };

  // Link asset
  const handleLinkAsset = async () => {
    if (!assetUrl.trim()) return;
    try {
      const res = await api.projects.linkAsset(project.id, {
        name: assetName.trim() || `Asset ${(project.assets || []).length + 1}`,
        type: assetType,
        url: assetUrl.trim(),
      });
      onUpdate(res.project);
      setShowAssetModal(false);
      setAssetName('');
      setAssetUrl('');
      triggerToast('Asset linked to project');
    } catch {
      triggerToast('Failed to link asset');
    }
  };

  // Export handlers
  const handleExportScript = () => {
    let scriptMd = `# ${project.name} - Script\n\n`;
    scriptMd += `**Overview**: ${project.description || 'N/A'}\n\n`;
    (project.scenes || []).forEach((s) => {
      scriptMd += `### Scene ${s.sceneNumber}: ${s.title} (${s.duration}s)\n`;
      scriptMd += `**Voiceover/Script**: ${s.scriptText || 'None'}\n\n`;
      scriptMd += `*Visual Description / Prompt*: ${s.imagePrompt || s.videoPrompt || 'None'}\n\n`;
      if (s.subtitleText) scriptMd += `*Subtitles*: "${s.subtitleText}"\n\n`;
      scriptMd += `---\n\n`;
    });
    const blob = new Blob([scriptMd], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_script.md`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Script exported');
  };

  const handleExportSRT = () => {
    let srt = '';
    let currentSeconds = 0;
    (project.scenes || []).forEach((s, i) => {
      const startSec = currentSeconds;
      const endSec = currentSeconds + (s.duration || 5);
      currentSeconds = endSec;

      const formatTime = (totalSec: number) => {
        const hrs = String(Math.floor(totalSec / 3600)).padStart(2, '0');
        const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
        const secs = String(Math.floor(totalSec % 60)).padStart(2, '0');
        return `${hrs}:${mins}:${secs},000`;
      };

      srt += `${i + 1}\n${formatTime(startSec)} --> ${formatTime(endSec)}\n${s.subtitleText || s.scriptText || '...'}\n\n`;
    });

    const blob = new Blob([srt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}.srt`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Subtitles exported (.srt)');
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(project, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute('href', dataStr);
    dlAnchorElem.setAttribute('download', `${project.name.toLowerCase().replace(/\s+/g, '_')}_project.json`);
    dlAnchorElem.click();
    triggerToast('Project bundle exported (JSON)');
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0d0d0f] text-zinc-100 overflow-hidden">
      {/* Toast */}
      {saveToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600/90 text-white text-xs px-4 py-2 rounded-lg shadow-xl backdrop-blur-md animate-fade-in flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Top Header */}
      <div className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-300 hover:text-white transition-colors"
            title="Back to Projects Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-semibold tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                {project.type}
              </span>
              <h1 className="text-lg font-bold text-white tracking-tight">{project.name}</h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">
              {project.description || 'Hynex Creative Workspace Project'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPipelineModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md transition-all"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>AI Content Pipeline</span>
          </button>
          <button
            onClick={handleSaveContent}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-200 text-xs font-medium transition-colors"
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>Save</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-1 px-6 border-b border-zinc-800/60 bg-zinc-900/30 overflow-x-auto py-2">
        <button
          onClick={() => setActiveTab('scenes')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'scenes'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Clapperboard className="w-3.5 h-3.5 text-blue-400" />
          <span>Scene Editor ({project.scenes?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('canvas')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'canvas'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
          <span>Canvas & Notes</span>
        </button>
        <button
          onClick={() => setActiveTab('characters')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'characters'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-amber-400" />
          <span>Characters ({project.characters?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'tasks'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
          <span>Tasks ({project.tasks?.filter((t) => t.completed).length || 0}/{project.tasks?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'assets'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5 text-cyan-400" />
          <span>Assets ({project.assets?.length || 0})</span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === 'export'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-rose-400" />
          <span>Export Bundle</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* TAB: SCENES */}
        {activeTab === 'scenes' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-white">Visual Timeline & Scene Editor</h2>
                <p className="text-xs text-zinc-400">
                  Total project duration: {(project.scenes || []).reduce((acc, s) => acc + (s.duration || 0), 0)}s across {project.scenes?.length || 0} scenes
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleAddScene}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Scene</span>
                </button>
              </div>
            </div>

            {(!project.scenes || project.scenes.length === 0) ? (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-12 text-center">
                <Clapperboard className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-zinc-300">No scenes generated yet</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-1 mb-4">
                  Use the AI Content Pipeline to automatically plan, script, and prompt scenes for your video or creative project.
                </p>
                <button
                  onClick={() => setShowPipelineModal(true)}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow transition-all inline-flex items-center gap-2"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Launch AI Pipeline</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {project.scenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 transition-all hover:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 font-bold text-xs">
                          #{scene.sceneNumber}
                        </span>
                        <div>
                          <input
                            type="text"
                            value={scene.title}
                            onChange={(e) => handleUpdateScene(scene.id, { title: e.target.value })}
                            className="bg-transparent font-semibold text-sm text-white focus:outline-none focus:border-b border-blue-500 pb-0.5"
                            placeholder="Scene Title"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-zinc-800/80 px-2 py-1 rounded text-xs text-zinc-300">
                          <Clock className="w-3 h-3 text-zinc-400" />
                          <input
                            type="number"
                            min={1}
                            max={300}
                            value={scene.duration}
                            onChange={(e) => handleUpdateScene(scene.id, { duration: parseInt(e.target.value, 10) || 5 })}
                            className="w-10 bg-transparent text-center focus:outline-none"
                          />
                          <span className="text-zinc-500">sec</span>
                        </div>
                        <button
                          onClick={() => handleDeleteScene(scene.id)}
                          className="p-1.5 rounded hover:bg-rose-500/20 text-zinc-500 hover:text-rose-400 transition-colors"
                          title="Delete Scene"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                      {/* Script & Voiceover */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                          <span>Narration / Script</span>
                        </label>
                        <textarea
                          rows={3}
                          value={scene.scriptText}
                          onChange={(e) => handleUpdateScene(scene.id, { scriptText: e.target.value })}
                          className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 resize-none"
                          placeholder="Narration voiceover spoken in this scene..."
                        />
                      </div>

                      {/* Subtitle */}
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-zinc-400 flex items-center gap-1">
                          <span>On-Screen Subtitles</span>
                        </label>
                        <textarea
                          rows={3}
                          value={scene.subtitleText}
                          onChange={(e) => handleUpdateScene(scene.id, { subtitleText: e.target.value })}
                          className="w-full bg-zinc-950/60 border border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 resize-none"
                          placeholder="On-screen caption or subtitle text..."
                        />
                      </div>
                    </div>

                    {/* Prompts for Image and Video Studio */}
                    <div className="mt-3 pt-3 border-t border-zinc-800/60 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/60">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-medium text-blue-400">Image Generation Prompt</span>
                          {onNavigateToImages && scene.imagePrompt && (
                            <button
                              onClick={() => onNavigateToImages(scene.imagePrompt)}
                              className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                              <span>Send to Image Studio</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          value={scene.imagePrompt}
                          onChange={(e) => handleUpdateScene(scene.id, { imagePrompt: e.target.value })}
                          className="w-full bg-transparent text-xs text-zinc-300 focus:outline-none resize-none"
                          placeholder="Photorealistic image prompt for this scene..."
                        />
                      </div>

                      <div className="bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/60">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-medium text-indigo-400">Video Motion Prompt</span>
                          {onNavigateToVideo && scene.videoPrompt && (
                            <button
                              onClick={() => onNavigateToVideo(scene.videoPrompt)}
                              className="text-[10px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                            >
                              <span>Send to Video Studio</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          value={scene.videoPrompt}
                          onChange={(e) => handleUpdateScene(scene.id, { videoPrompt: e.target.value })}
                          className="w-full bg-transparent text-xs text-zinc-300 focus:outline-none resize-none"
                          placeholder="Cinematic motion prompt with camera direction..."
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: CANVAS & NOTES */}
        {activeTab === 'canvas' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white">Project Canvas & Outline</h2>
              <span className="text-xs text-zinc-500">
                {content.length} characters • {content.trim().split(/\s+/).filter(Boolean).length} words
              </span>
            </div>
            <textarea
              rows={24}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-zinc-900/60 border border-zinc-800 rounded-xl p-6 text-sm text-zinc-200 font-mono leading-relaxed focus:outline-none focus:border-zinc-700 resize-none shadow-inner"
              placeholder="# Project Overview\n\nWrite your document, outline, notes, or structured plan here..."
            />
          </div>
        )}

        {/* TAB: CHARACTERS */}
        {activeTab === 'characters' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Character Consistency Profiles</h2>
                <p className="text-xs text-zinc-400">
                  Define characters with distinct traits to maintain visual continuity across multiple scenes.
                </p>
              </div>
              <button
                onClick={() => setShowCharModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Character</span>
              </button>
            </div>

            {(!project.characters || project.characters.length === 0) ? (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-10 text-center">
                <Users className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <h3 className="text-xs font-medium text-zinc-300">No characters registered yet</h3>
                <p className="text-xs text-zinc-500 mt-1 mb-4">Add character profiles to reuse descriptions in prompts.</p>
                <button
                  onClick={() => setShowCharModal(true)}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-white"
                >
                  Create Character
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.characters.map((c) => (
                  <div key={c.id} className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm text-white">{c.name}</h4>
                        <p className="text-xs text-zinc-400 mt-0.5">{c.description}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteCharacter(c.id)}
                        className="p-1 hover:text-rose-400 text-zinc-500 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {c.clothing && (
                      <div className="text-xs bg-zinc-950/60 p-2 rounded border border-zinc-850">
                        <span className="text-zinc-500 font-medium">Clothing:</span> {c.clothing}
                      </div>
                    )}

                    {c.distinguishingFeatures && (
                      <div className="text-xs bg-zinc-950/60 p-2 rounded border border-zinc-850">
                        <span className="text-zinc-500 font-medium">Features:</span> {c.distinguishingFeatures}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: TASKS */}
        {activeTab === 'tasks' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Project Checklist & Tasks</h2>
                <p className="text-xs text-zinc-400">Track production milestones and deliverables.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                placeholder="Add a new task (e.g., 'Generate Scene 2 thumbnail')..."
                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleAddTask}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold"
              >
                Add
              </button>
            </div>

            <div className="space-y-2">
              {(project.tasks || []).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 hover:border-zinc-700 transition-colors"
                >
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={t.completed}
                      onChange={() => handleToggleTask(t.id)}
                      className="w-4 h-4 rounded bg-zinc-800 border-zinc-700 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                    />
                    <span className={`text-xs ${t.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                      {t.title}
                    </span>
                  </label>
                  <button
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-1 hover:text-rose-400 text-zinc-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: ASSETS */}
        {activeTab === 'assets' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-white">Project Assets & Gallery</h2>
                <p className="text-xs text-zinc-400">Connected media files, generated clips, and references.</p>
              </div>
              <button
                onClick={() => setShowAssetModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Link Asset</span>
              </button>
            </div>

            {(!project.assets || project.assets.length === 0) ? (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl p-10 text-center">
                <FolderOpen className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                <h3 className="text-xs font-medium text-zinc-300">No assets linked yet</h3>
                <p className="text-xs text-zinc-500 mt-1 mb-4">Link generated images, videos, or external media URLs.</p>
                <button
                  onClick={() => setShowAssetModal(true)}
                  className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs text-white"
                >
                  Link Media Asset
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {project.assets.map((asset) => (
                  <div key={asset.id} className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-3 space-y-2">
                    {asset.type === 'image' ? (
                      <div className="aspect-video bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800 flex items-center justify-center">
                        <img src={asset.url} alt={asset.name} className="w-full h-full object-cover" />
                      </div>
                    ) : asset.type === 'video' ? (
                      <div className="aspect-video bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
                        <video src={asset.url} controls className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="aspect-video bg-zinc-950 rounded-lg flex items-center justify-center border border-zinc-800">
                        <FileText className="w-8 h-8 text-zinc-500" />
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-white truncate">{asset.name}</span>
                      <a
                        href={asset.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: EXPORT BUNDLE */}
        {activeTab === 'export' && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h2 className="text-base font-semibold text-white">Export Project Deliverables</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Download scripts, subtitles, prompt lists, and metadata bundles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <FileText className="w-6 h-6 text-blue-400 mb-2" />
                  <h3 className="text-sm font-semibold text-white">Full Script (.md)</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Structured Markdown script with scene voiceovers, stage notes, and prompts.
                  </p>
                </div>
                <button
                  onClick={handleExportScript}
                  className="mt-4 w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Script</span>
                </button>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <Clapperboard className="w-6 h-6 text-emerald-400 mb-2" />
                  <h3 className="text-sm font-semibold text-white">Subtitles (.srt)</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Standard SRT subtitle file synchronized with scene durations for video players.
                  </p>
                </div>
                <button
                  onClick={handleExportSRT}
                  className="mt-4 w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download SRT</span>
                </button>
              </div>

              <div className="bg-zinc-900/70 border border-zinc-800/80 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <Layers className="w-6 h-6 text-purple-400 mb-2" />
                  <h3 className="text-sm font-semibold text-white">Project Bundle (.json)</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Complete project state with scenes, character profiles, assets, and task lists.
                  </p>
                </div>
                <button
                  onClick={handleExportJSON}
                  className="mt-4 w-full py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-medium text-white flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download JSON</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Pipeline Modal */}
      {showPipelineModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 animate-scale-up">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold text-white">Launch AI Content Pipeline</h3>
              </div>
              <button
                onClick={() => setShowPipelineModal(false)}
                className="text-zinc-500 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Creative Brief / Objective
                </label>
                <textarea
                  rows={3}
                  value={pipelineBrief}
                  onChange={(e) => setPipelineBrief(e.target.value)}
                  placeholder="e.g. A 60-second educational YouTube Short explaining how compound interest works with visual metaphors..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-200 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Duration</label>
                  <select
                    value={pipelineDuration}
                    onChange={(e) => setPipelineDuration(parseInt(e.target.value, 10))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
                  >
                    <option value={30}>30 Seconds (Reels / Shorts)</option>
                    <option value={60}>60 Seconds (Standard Short)</option>
                    <option value={90}>90 Seconds (Deep Overview)</option>
                    <option value={120}>2 Minutes (Commercial / Explainer)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-zinc-300 block mb-1">Target Audience</label>
                  <input
                    type="text"
                    value={pipelineAudience}
                    onChange={(e) => setPipelineAudience(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
                    placeholder="General / Students / Investors"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">Visual & Narrative Style</label>
                <input
                  type="text"
                  value={pipelineStyle}
                  onChange={(e) => setPipelineStyle(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
                  placeholder="Cinematic 4K, Realistic Lighting, Fast-paced"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => setShowPipelineModal(false)}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleRunPipeline}
                disabled={isGeneratingPipeline || !pipelineBrief.trim()}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-2"
              >
                {isGeneratingPipeline ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Synthesizing Production Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Pipeline</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Character Profile Modal */}
      {showCharModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Add Consistent Character</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Character Name</label>
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="e.g. Alex, Cybernetic Investigator"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Appearance Description</label>
                <textarea
                  rows={2}
                  value={charDesc}
                  onChange={(e) => setCharDesc(e.target.value)}
                  placeholder="Mid-30s, sharp jawline, short silver hair, amber eyes..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none resize-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Standard Wardrobe / Clothing</label>
                <input
                  type="text"
                  value={charClothing}
                  onChange={(e) => setCharClothing(e.target.value)}
                  placeholder="Dark tailored trench coat, matte black boots"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Distinguishing Features</label>
                <input
                  type="text"
                  value={charFeatures}
                  onChange={(e) => setCharFeatures(e.target.value)}
                  placeholder="Small scar over left eyebrow, luminous wrist watch"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCharModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCharacter}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                Save Character
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Link Asset Modal */}
      {showAssetModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">Link Asset to Project</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Asset Name</label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="e.g. Intro Scene Clip"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Asset Type</label>
                <select
                  value={assetType}
                  onChange={(e) => setAssetType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                  <option value="audio">Audio</option>
                  <option value="document">Document / PDF</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-zinc-400 block mb-1">Asset URL</label>
                <input
                  type="url"
                  value={assetUrl}
                  onChange={(e) => setAssetUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAssetModal(false)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-zinc-300"
              >
                Cancel
              </button>
              <button
                onClick={handleLinkAsset}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white"
              >
                Link Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
