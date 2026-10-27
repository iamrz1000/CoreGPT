import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Sparkles,
  Play,
  RotateCcw,
  Download,
  FileText,
  Plus,
  Trash2,
  Users,
  Clock,
  Layers,
  Image as ImageIcon,
  Video,
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Maximize2,
  X,
  Volume2,
  Camera,
  Folder,
  Eye,
  Loader2,
  Share2,
} from 'lucide-react';
import { Project, Scene, CharacterRef } from '../types/index.ts';
import { api } from '../services/api.ts';

interface CreatorStudioProps {
  activeProject: Project | null;
  onUpdateProject?: (project: Project) => void;
  onOpenProjectHub?: () => void;
}

export const CreatorStudio: React.FC<CreatorStudioProps> = ({
  activeProject,
  onUpdateProject,
  onOpenProjectHub,
}) => {
  // Local project state
  const [project, setProject] = useState<Project>(() => {
    if (activeProject) return activeProject;
    return {
      id: 'proj_default',
      user_id: 'default',
      title: 'Neon Odyssey: Cyberpunk Chronicles',
      description: 'A rogue neural hacker navigates the neon rain of Neo-Kyoto.',
      category: 'film',
      status: 'in_progress',
      character_refs: [
        {
          id: 'char_1',
          name: 'Kaelen Voss',
          description: 'A cyber-enhanced detective with a glowing amber ocular implant and worn leather trenchcoat.',
          visual_traits: ['amber cybernetic eye', 'dark trenchcoat', 'cyberpunk aesthetic'],
        },
      ],
      scenes: [
        {
          id: 'sc_1',
          scene_number: 1,
          title: 'Arrival in Neo-Kyoto',
          description: 'Kaelen walks through rain-slicked alleyways illuminated by holographic advertisements.',
          dialogue: 'Rain never stops here. Neither do the ghosts in the network.',
          image_prompt: 'Cinematic wide shot of a futuristic neon cyberpunk alleyway in the heavy rain, reflective wet asphalt, glowing amber ocular implant on detective silhouette, photorealistic 8K, volumetric lighting, Hasselblad 100MP.',
          video_prompt: 'Slow tracking camera shot following detective walking through rain with neon city reflections.',
          duration_seconds: 4,
          camera_angle: 'Low angle tracking shot',
          audio_notes: 'Heavy rain, ambient synthetic synth drone',
          video_status: 'idle',
        },
        {
          id: 'sc_2',
          scene_number: 2,
          title: 'The Neural Terminal',
          description: 'Kaelen hacks into a high-security quantum databank terminal.',
          dialogue: 'Access granted. Now lets see what they buried.',
          image_prompt: 'Close up dramatic shot of cybernetic hands interacting with glowing blue quantum holographic data terminal, particle reflections, hyper-detailed cyberpunk hardware, 8K ultra sharp.',
          video_prompt: 'Camera zooms in slowly as holographic interfaces spin and flicker.',
          duration_seconds: 4,
          camera_angle: 'Close-up over-the-shoulder shot',
          audio_notes: 'High-frequency digital hum, terminal access chirp',
          video_status: 'idle',
        },
      ],
      script: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  // Sync with active project prop if updated
  useEffect(() => {
    if (activeProject) {
      setProject(activeProject);
    }
  }, [activeProject]);

  // Loading & Generation states
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [generatingSceneId, setGeneratingSceneId] = useState<string | null>(null);
  const [animatingSceneId, setAnimatingSceneId] = useState<string | null>(null);
  const [isAssemblingTimeline, setIsAssemblingTimeline] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Script Generator Modal
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptPremise, setScriptPremise] = useState('');
  const [scriptGenre, setScriptGenre] = useState('Cinematic Sci-Fi');
  const [scriptTone, setScriptTone] = useState('Epic, suspenseful, cinematic');
  const [scriptSceneCount, setScriptSceneCount] = useState(4);

  // Character Reference Modal
  const [showCharModal, setShowCharModal] = useState(false);
  const [charName, setCharName] = useState('');
  const [charDescription, setCharDescription] = useState('');
  const [charTraits, setCharTraits] = useState('');

  // Video Preview & Subtitles Modals
  const [previewVideoUrl, setPreviewVideoUrl] = useState<string | null>(null);
  const [previewVideoTitle, setPreviewVideoTitle] = useState('');
  const [showSubtitlesModal, setShowSubtitlesModal] = useState(false);
  const [subtitlesData, setSubtitlesData] = useState<{
    srt: string;
    vtt: string;
    txt: string;
    json: string;
  } | null>(null);

  // Final Assembled Reel URL
  const [assembledReelUrl, setAssembledReelUrl] = useState<string | null>(null);

  // Polling tracker for active video generation jobs
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRef.current.forEach((timer) => clearInterval(timer));
    };
  }, []);

  const persistProject = async (updated: Project) => {
    setProject(updated);
    if (onUpdateProject) onUpdateProject(updated);
    if (updated.id && !updated.id.startsWith('proj_default')) {
      try {
        await api.projects.update(updated.id, updated);
      } catch (err) {
        console.warn('Failed to persist project changes to backend:', err);
      }
    }
  };

  // 1. Script Generation
  const handleGenerateScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptPremise.trim()) return;

    setIsGeneratingScript(true);
    setError(null);
    try {
      const res = await api.creator.generateScript({
        premise: scriptPremise.trim(),
        genre: scriptGenre,
        tone: scriptTone,
        sceneCount: scriptSceneCount,
        characterRefs: project.character_refs,
      });

      const updated: Project = {
        ...project,
        title: res.title || project.title,
        description: res.synopsis || scriptPremise.trim(),
        script: res.fullScript,
        scenes: res.scenes,
        updated_at: new Date().toISOString(),
      };

      await persistProject(updated);
      setShowScriptModal(false);
      setScriptPremise('');
    } catch (err: any) {
      setError(err.message || 'Script generation failed.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // 2. Scene Image Generation / Regeneration
  const handleGenerateSceneImage = async (sceneId: string, customPrompt?: string) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    setGeneratingSceneId(sceneId);
    setError(null);
    try {
      const promptToUse = customPrompt || scene.image_prompt || scene.description;
      const res = await api.creator.generateSceneImage({
        prompt: promptToUse,
        aspectRatio: '16:9',
        model: 'nano-banana',
        upscale: true,
        imageSize: '2K',
        characterRefs: project.character_refs,
      });

      const updatedScenes = project.scenes.map((s) => {
        if (s.id === sceneId) {
          return {
            ...s,
            image_url: res.imageUrl,
          };
        }
        return s;
      });

      await persistProject({
        ...project,
        scenes: updatedScenes,
        updated_at: new Date().toISOString(),
      });
    } catch (err: any) {
      setError(err.message || 'Scene image generation failed.');
    } finally {
      setGeneratingSceneId(null);
    }
  };

  // 3. Scene Video Generation (Text-to-Video or Image-to-Video)
  const handleGenerateSceneVideo = async (sceneId: string, useKeyframe = true) => {
    const scene = project.scenes.find((s) => s.id === sceneId);
    if (!scene) return;

    setAnimatingSceneId(sceneId);
    setError(null);
    try {
      // Mark scene as generating
      const updatedScenes = project.scenes.map((s) => {
        if (s.id === sceneId) {
          return { ...s, video_status: 'generating' as const };
        }
        return s;
      });
      await persistProject({ ...project, scenes: updatedScenes });

      const imageSource = useKeyframe && scene.image_url ? scene.image_url : undefined;
      const res = await api.creator.generateSceneVideo({
        sceneId,
        projectId: project.id,
        prompt: scene.video_prompt || scene.description,
        imageSource,
        aspectRatio: '16:9',
      });

      // Poll for job completion
      const jobId = res.jobId;
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await api.creator.getVideoStatus(jobId);
          if (statusRes.status === 'completed' && statusRes.videoUrl) {
            clearInterval(pollInterval);
            pollingRef.current.delete(jobId);
            setAnimatingSceneId(null);

            setProject((prev) => {
              const finishedScenes = prev.scenes.map((s) => {
                if (s.id === sceneId) {
                  return {
                    ...s,
                    video_url: statusRes.videoUrl,
                    video_status: 'completed' as const,
                    video_job_id: jobId,
                  };
                }
                return s;
              });
              const newProj = { ...prev, scenes: finishedScenes };
              if (onUpdateProject) onUpdateProject(newProj);
              return newProj;
            });
          } else if (statusRes.status === 'failed') {
            clearInterval(pollInterval);
            pollingRef.current.delete(jobId);
            setAnimatingSceneId(null);
            setError(`Video generation failed: ${statusRes.error || 'Unknown error'}`);

            setProject((prev) => {
              const failedScenes = prev.scenes.map((s) => {
                if (s.id === sceneId) {
                  return { ...s, video_status: 'failed' as const };
                }
                return s;
              });
              return { ...prev, scenes: failedScenes };
            });
          }
        } catch (pollErr) {
          console.warn('Poll status error:', pollErr);
        }
      }, 2500);

      pollingRef.current.set(jobId, pollInterval);
    } catch (err: any) {
      setError(err.message || 'Failed to start video synthesis.');
      setAnimatingSceneId(null);
    }
  };

  // 4. Character Reference Creation
  const handleAddCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName.trim()) return;

    const newChar: CharacterRef = {
      id: `char_${Date.now()}`,
      name: charName.trim(),
      description: charDescription.trim(),
      visual_traits: charTraits
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };

    const updatedChars = [...project.character_refs, newChar];
    await persistProject({
      ...project,
      character_refs: updatedChars,
      updated_at: new Date().toISOString(),
    });

    setCharName('');
    setCharDescription('');
    setCharTraits('');
    setShowCharModal(false);
  };

  const handleDeleteCharacter = async (charId: string) => {
    const updatedChars = project.character_refs.filter((c) => c.id !== charId);
    await persistProject({
      ...project,
      character_refs: updatedChars,
      updated_at: new Date().toISOString(),
    });
  };

  // 5. Add / Delete Scene
  const handleAddScene = async () => {
    const nextNum = project.scenes.length + 1;
    const newScene: Scene = {
      id: `scene_${Date.now()}`,
      scene_number: nextNum,
      title: `Scene ${nextNum}`,
      description: 'Enter scene action description...',
      dialogue: '',
      image_prompt: 'Cinematic visual frame...',
      video_prompt: 'Fluid camera motion...',
      duration_seconds: 4,
      camera_angle: 'Medium tracking shot',
      audio_notes: 'Ambient soundtrack',
      video_status: 'idle',
    };

    await persistProject({
      ...project,
      scenes: [...project.scenes, newScene],
      updated_at: new Date().toISOString(),
    });
  };

  const handleDeleteScene = async (sceneId: string) => {
    const updatedScenes = project.scenes
      .filter((s) => s.id !== sceneId)
      .map((s, idx) => ({ ...s, scene_number: idx + 1 }));

    await persistProject({
      ...project,
      scenes: updatedScenes,
      updated_at: new Date().toISOString(),
    });
  };

  // 6. Subtitles & Script Export
  const handleExportSubtitles = async () => {
    try {
      const data = await api.creator.exportSubtitles({
        scenes: project.scenes,
        title: project.title,
      });
      setSubtitlesData(data);
      setShowSubtitlesModal(true);
    } catch (err: any) {
      setError(err.message || 'Failed to export subtitles.');
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // 7. Final Assembly & Timeline Rendering
  const handleAssembleTimeline = async () => {
    setIsAssemblingTimeline(true);
    setError(null);
    try {
      const res = await api.creator.renderTimeline({
        projectId: project.id,
        scenes: project.scenes,
      });

      setAssembledReelUrl(res.timelineUrl);
      setPreviewVideoUrl(res.timelineUrl);
      setPreviewVideoTitle(`${project.title} - Complete Reel`);
    } catch (err: any) {
      setError(err.message || 'Timeline assembly failed.');
    } finally {
      setIsAssemblingTimeline(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50 dark:bg-[#121212]">
      {/* Top Studio Control Bar */}
      <div className="p-4 border-b border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1b1b1b] flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
            <Film className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-zinc-900 dark:text-white">
                {project.title}
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20 uppercase font-semibold">
                {project.category}
              </span>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
              {project.description || 'Complete scene-based cinematic production pipeline.'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowScriptModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Script & Breakdown</span>
          </button>

          <button
            onClick={() => setShowCharModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#242424] hover:bg-zinc-50 dark:hover:bg-[#2b2b2b] text-zinc-800 dark:text-zinc-200 text-xs font-medium"
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Characters ({project.character_refs.length})</span>
          </button>

          <button
            onClick={handleExportSubtitles}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#242424] hover:bg-zinc-50 dark:hover:bg-[#2b2b2b] text-zinc-800 dark:text-zinc-200 text-xs font-medium"
            title="Export .srt, .vtt, .txt, .json"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>Export Subtitles</span>
          </button>

          <button
            onClick={handleAssembleTimeline}
            disabled={isAssemblingTimeline || project.scenes.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs transition-all active:scale-[0.98]"
          >
            {isAssemblingTimeline ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Stitching Reel...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Render Timeline Reel</span>
              </>
            )}
          </button>

          {onOpenProjectHub && (
            <button
              onClick={onOpenProjectHub}
              className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              title="Return to Project Hub"
            >
              <Folder className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Timeline View */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-zinc-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Character Library Bar */}
        {project.character_refs.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-white/10 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Character Consistency References (Auto-injected into scene prompts)
              </span>
              <button
                onClick={() => setShowCharModal(true)}
                className="text-[11px] text-purple-500 hover:text-purple-400 font-semibold"
              >
                + Add Character
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {project.character_refs.map((char) => (
                <div
                  key={char.id}
                  className="flex items-center gap-2 p-2 rounded-xl border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#222222] text-xs shrink-0"
                >
                  <div className="w-6 h-6 rounded-full bg-purple-600/20 text-purple-400 font-bold flex items-center justify-center text-[10px]">
                    {char.name.charAt(0)}
                  </div>
                  <div>
                    <span className="font-semibold text-zinc-900 dark:text-white block">
                      {char.name}
                    </span>
                    <span className="text-[10px] text-zinc-400 block line-clamp-1 max-w-[180px]">
                      {char.description}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDeleteCharacter(char.id)}
                    className="p-1 text-zinc-400 hover:text-red-400"
                    title="Remove Character"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Responsive Scene Timeline Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              Scene Storyboard & Production Sequence ({project.scenes.length} Scenes)
            </h2>
            <button
              onClick={handleAddScene}
              className="flex items-center gap-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Scene</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {project.scenes.map((scene, idx) => {
              const isGeneratingImg = generatingSceneId === scene.id;
              const isAnimatingVid = animatingSceneId === scene.id || scene.video_status === 'generating';

              return (
                <div
                  key={scene.id}
                  className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#1a1a1a] shadow-xs overflow-hidden flex flex-col justify-between"
                >
                  {/* Scene Card Header */}
                  <div className="p-4 border-b border-zinc-100 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-purple-600 text-white font-mono font-bold text-xs flex items-center justify-center">
                        {scene.scene_number}
                      </div>
                      <input
                        type="text"
                        value={scene.title}
                        onChange={(e) => {
                          const val = e.target.value;
                          const updated = project.scenes.map((s) =>
                            s.id === scene.id ? { ...s, title: val } : s
                          );
                          setProject({ ...project, scenes: updated });
                        }}
                        className="font-bold text-xs text-zinc-900 dark:text-white bg-transparent border-b border-transparent hover:border-zinc-300 dark:hover:border-white/20 focus:border-purple-500 focus:outline-none px-1"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-100 dark:bg-white/5 px-2 py-0.5 rounded">
                        <Clock className="w-2.5 h-2.5" />
                        {scene.duration_seconds || 4}s
                      </span>
                      <button
                        onClick={() => handleDeleteScene(scene.id)}
                        className="p-1 text-zinc-400 hover:text-red-500"
                        title="Delete Scene"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Scene Media Asset Workspace */}
                  <div className="p-4 space-y-3">
                    {/* Visual Keyframe Image Section */}
                    <div className="relative rounded-xl overflow-hidden bg-zinc-950 aspect-video flex items-center justify-center group border border-zinc-200 dark:border-white/5">
                      {scene.image_url ? (
                        <>
                          <img
                            src={scene.image_url}
                            alt={scene.title}
                            className="w-full h-full object-cover transition-transform group-hover:scale-102"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleGenerateSceneImage(scene.id)}
                              disabled={isGeneratingImg}
                              className="px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Regenerate (2K Upscale)</span>
                            </button>
                            <a
                              href={scene.image_url}
                              download={`scene_${scene.scene_number}.png`}
                              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs backdrop-blur-md"
                              title="Download Keyframe"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-4">
                          <ImageIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                          <button
                            onClick={() => handleGenerateSceneImage(scene.id)}
                            disabled={isGeneratingImg}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-xs"
                          >
                            {isGeneratingImg ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Generating 2K Visual...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Generate Scene Keyframe</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Video status overlay banner */}
                      {scene.video_url && (
                        <div className="absolute top-2 right-2 flex items-center gap-1 bg-emerald-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Video Ready</span>
                        </div>
                      )}
                    </div>

                    {/* Prompts & Dialogue Details */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                          Visual Prompt:
                        </span>
                        <textarea
                          value={scene.image_prompt}
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = project.scenes.map((s) =>
                              s.id === scene.id ? { ...s, image_prompt: val } : s
                            );
                            setProject({ ...project, scenes: updated });
                          }}
                          rows={2}
                          className="w-full mt-1 p-2 text-xs rounded-lg border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#202020] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
                          Dialogue / Subtitle Line:
                        </span>
                        <input
                          type="text"
                          value={scene.dialogue || ''}
                          placeholder="e.g. Character line or voiceover narration..."
                          onChange={(e) => {
                            const val = e.target.value;
                            const updated = project.scenes.map((s) =>
                              s.id === scene.id ? { ...s, dialogue: val } : s
                            );
                            setProject({ ...project, scenes: updated });
                          }}
                          className="w-full mt-1 p-2 text-xs rounded-lg border border-zinc-200 dark:border-white/5 bg-zinc-50 dark:bg-[#202020] text-zinc-800 dark:text-zinc-200 focus:outline-none"
                        />
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                        <span className="flex items-center gap-1">
                          <Camera className="w-3 h-3 text-blue-400" />
                          {scene.camera_angle || 'Cinematic Shot'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Volume2 className="w-3 h-3 text-purple-400" />
                          {scene.audio_notes || 'Ambient Score'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Scene Card Footer Actions */}
                  <div className="p-3.5 bg-zinc-50 dark:bg-[#1f1f1f] border-t border-zinc-100 dark:border-white/5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                      {scene.video_url ? (
                        <>
                          <button
                            onClick={() => {
                              setPreviewVideoUrl(scene.video_url!);
                              setPreviewVideoTitle(`Scene ${scene.scene_number}: ${scene.title}`);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-2xs"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Preview Video</span>
                          </button>
                          <button
                            onClick={() => handleGenerateSceneVideo(scene.id, true)}
                            disabled={isAnimatingVid}
                            className="p-1.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-200/50 dark:hover:bg-white/5 text-zinc-600 dark:text-zinc-300"
                            title="Regenerate Video"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleGenerateSceneVideo(scene.id, true)}
                            disabled={isAnimatingVid || !scene.image_url}
                            className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-xs font-semibold shadow-2xs"
                            title={!scene.image_url ? 'Generate image first' : 'Animate keyframe image'}
                          >
                            {isAnimatingVid ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Rendering Clip...</span>
                              </>
                            ) : (
                              <>
                                <Video className="w-3.5 h-3.5" />
                                <span>Animate Keyframe</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleGenerateSceneVideo(scene.id, false)}
                            disabled={isAnimatingVid}
                            className="py-1.5 px-2.5 rounded-lg border border-zinc-200 dark:border-white/10 hover:bg-zinc-200/50 dark:hover:bg-white/5 text-zinc-700 dark:text-zinc-300 text-xs font-medium"
                            title="Generate Text-to-Video directly"
                          >
                            <span>Text-to-Video</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Script & Scene Breakdown Generator Modal */}
      {showScriptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white dark:bg-[#1e1e1e] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Generate Script & Scene Breakdown
                </h3>
              </div>
              <button
                onClick={() => setShowScriptModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateScript} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Story Premise / Core Narrative:
                </label>
                <textarea
                  placeholder="e.g. A team of deep-space salvage divers discovers an ancient derelict vessel trapped in the event horizon of a black hole..."
                  value={scriptPremise}
                  onChange={(e) => setScriptPremise(e.target.value)}
                  rows={3}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Genre:
                  </label>
                  <select
                    value={scriptGenre}
                    onChange={(e) => setScriptGenre(e.target.value)}
                    className="w-full py-2 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] text-zinc-900 dark:text-white focus:outline-none"
                  >
                    <option value="Cinematic Sci-Fi">Cinematic Sci-Fi</option>
                    <option value="Cyberpunk Noir">Cyberpunk Noir</option>
                    <option value="Epic Fantasy">Epic Fantasy</option>
                    <option value="Nature Documentary">Nature Documentary</option>
                    <option value="Commercial Teaser">Commercial Teaser</option>
                    <option value="Dark Psychological Thriller">Psychological Thriller</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Target Scene Count:
                  </label>
                  <select
                    value={scriptSceneCount}
                    onChange={(e) => setScriptSceneCount(Number(e.target.value))}
                    className="w-full py-2 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] text-zinc-900 dark:text-white focus:outline-none"
                  >
                    <option value={3}>3 Scenes (Quick Teaser)</option>
                    <option value={4}>4 Scenes (Standard Short)</option>
                    <option value={6}>6 Scenes (Extended Reel)</option>
                    <option value={8}>8 Scenes (Complete Screenplay)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScriptModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGeneratingScript || !scriptPremise.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-semibold shadow-md"
                >
                  {isGeneratingScript ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Writing Screenplay...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Synthesize Storyboard</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Character Reference Creation Modal */}
      {showCharModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-[#1e1e1e] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Add Character Reference
                </h3>
              </div>
              <button
                onClick={() => setShowCharModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCharacter} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Character Name:
                </label>
                <input
                  type="text"
                  placeholder="e.g. Commander Vane"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Appearance & Costume Description:
                </label>
                <textarea
                  placeholder="e.g. Silver short hair, cybernetic titanium arm with blue circuits, matte black tactical stealth suit..."
                  value={charDescription}
                  onChange={(e) => setCharDescription(e.target.value)}
                  rows={2}
                  required
                  className="w-full py-2 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Visual Traits (comma-separated):
                </label>
                <input
                  type="text"
                  placeholder="e.g. silver hair, bionic arm, stealth suit"
                  value={charTraits}
                  onChange={(e) => setCharTraits(e.target.value)}
                  className="w-full py-2 px-3 text-xs rounded-lg border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-[#252525] text-zinc-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCharModal(false)}
                  className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-md"
                >
                  Save Character
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl space-y-3">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Play className="w-4 h-4 text-emerald-400" />
                {previewVideoTitle || 'Video Preview'}
              </h3>
              <button
                onClick={() => setPreviewVideoUrl(null)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-4">
              <div className="rounded-xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                <video
                  src={previewVideoUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            <div className="p-4 border-t border-white/10 flex items-center justify-between">
              <span className="text-[11px] text-zinc-400">
                HTTP 206 Partial Content Streamed • 720p / 1080p MP4
              </span>
              <a
                href={previewVideoUrl}
                download="hynex_scene_video.mp4"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download MP4</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Subtitles & Script Export Modal */}
      {showSubtitlesModal && subtitlesData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-white dark:bg-[#1e1e1e] border border-zinc-200 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    Export Subtitles & Production Data
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Industry standard subtitle formats with synchronized timings.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubtitlesModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Download Buttons Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <button
                onClick={() => downloadFile(subtitlesData.srt, `${project.title}.srt`, 'text/plain')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-amber-500/40 bg-zinc-50 dark:bg-white/5 text-xs font-semibold text-zinc-900 dark:text-white transition-colors"
              >
                <Download className="w-4 h-4 text-amber-500 mb-1" />
                <span>Download .SRT</span>
                <span className="text-[10px] text-zinc-400 font-normal">SubRip Subtitles</span>
              </button>

              <button
                onClick={() => downloadFile(subtitlesData.vtt, `${project.title}.vtt`, 'text/vtt')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-amber-500/40 bg-zinc-50 dark:bg-white/5 text-xs font-semibold text-zinc-900 dark:text-white transition-colors"
              >
                <Download className="w-4 h-4 text-blue-500 mb-1" />
                <span>Download .VTT</span>
                <span className="text-[10px] text-zinc-400 font-normal">WebVTT Format</span>
              </button>

              <button
                onClick={() => downloadFile(subtitlesData.txt, `${project.title}.txt`, 'text/plain')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-amber-500/40 bg-zinc-50 dark:bg-white/5 text-xs font-semibold text-zinc-900 dark:text-white transition-colors"
              >
                <Download className="w-4 h-4 text-purple-500 mb-1" />
                <span>Download .TXT</span>
                <span className="text-[10px] text-zinc-400 font-normal">Screenplay Text</span>
              </button>

              <button
                onClick={() => downloadFile(subtitlesData.json, `${project.title}.json`, 'application/json')}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-zinc-200 dark:border-white/10 hover:border-amber-500/40 bg-zinc-50 dark:bg-white/5 text-xs font-semibold text-zinc-900 dark:text-white transition-colors"
              >
                <Download className="w-4 h-4 text-emerald-500 mb-1" />
                <span>Download .JSON</span>
                <span className="text-[10px] text-zinc-400 font-normal">Structured Data</span>
              </button>
            </div>

            {/* Preview Box */}
            <div className="flex-1 overflow-y-auto rounded-xl bg-zinc-950 p-3 border border-white/10">
              <span className="text-[10px] font-mono text-zinc-500 block mb-1">
                Preview (.srt format):
              </span>
              <pre className="text-zinc-300 font-mono text-[11px] whitespace-pre-wrap">
                {subtitlesData.srt}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
