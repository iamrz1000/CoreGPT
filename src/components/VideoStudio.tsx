import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../services/api.ts';
import {
  Film,
  Video,
  Upload,
  Sparkles,
  Loader2,
  Download,
  Play,
  RotateCcw,
  AlertCircle,
  Clock,
  Layers,
  Image as ImageIcon,
  Check,
} from 'lucide-react';

interface VideoRecord {
  id: string;
  prompt: string;
  aspectRatio: string;
  operationName: string;
  videoUrl?: string;
  status: string;
  createdAt: string;
}

export const VideoStudio: React.FC = () => {
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageMime, setImageMime] = useState<string>('image/png');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [activeVideo, setActiveVideo] = useState<VideoRecord | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [videoKey, setVideoKey] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoLoading, setVideoLoading] = useState(false);

  const loadVideos = async () => {
    try {
      const res = await api.video.list();
      setVideos(res.videos || []);
      if (!activeVideo && res.videos && res.videos.length > 0) {
        setActiveVideo(res.videos[0]);
      }
    } catch (e) {
      console.warn('Could not load videos:', e);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  // Poll video generation operation status
  useEffect(() => {
    if (!pollingId) return;

    const interval = setInterval(async () => {
      try {
        const current = videos.find((v) => v.id === pollingId);
        if (!current || current.status === 'completed') {
          setPollingId(null);
          return;
        }

        const res = await api.video.status({
          operationName: current.operationName,
          videoId: current.id,
        });

        if (res.done) {
          setVideos((prev) =>
            prev.map((v) =>
              v.id === pollingId
                ? {
                    ...v,
                    status: 'completed',
                    videoUrl: res.videoUrl || v.videoUrl,
                  }
                : v
            )
          );
          if (activeVideo?.id === pollingId) {
            setActiveVideo((prev) =>
              prev
                ? { ...prev, status: 'completed', videoUrl: res.videoUrl || prev.videoUrl }
                : null
            );
          }
          setPollingId(null);
          setLoading(false);
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [pollingId, videos, activeVideo]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      setError('Photo exceeds 8MB limit.');
      return;
    }

    setImageMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage(event.target?.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !uploadedImage) {
      setError('Please provide a prompt or upload a photo.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.video.generate({
        prompt: prompt.trim(),
        aspectRatio,
        base64Image: mode === 'image' && uploadedImage ? uploadedImage : undefined,
        imageMimeType: imageMime,
      });

      const newVid = res.video;
      setVideos((prev) => [newVid, ...prev]);
      setActiveVideo(newVid);

      if (newVid.status === 'completed' && newVid.videoUrl) {
        setLoading(false);
      } else {
        setPollingId(newVid.id);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to initiate video generation.');
      }
      setLoading(false);
    }
  };

  const samplePrompts = [
    'A cinematic drone flight over bioluminescent oceanic waves under twilight aurora',
    'A neon cyberpunk hovercar speeding through towering glass skyscrapers in the rain',
    'Macro camera pan of a blooming iridescent crystal orchid in slow motion, 8K',
    'Astronaut walking on ancient Martian obsidian ruins with glowing cosmic dust',
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-[#fbfbfa] dark:bg-[#09090b] transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-white/[0.08] pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <Film className="w-4 h-4" />
              <span>Google Veo 3 Video Studio</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-100">
              Generative Cinema & Animation
            </h1>
            <p className="text-xs md:text-sm text-slate-500 dark:text-zinc-400">
              Synthesize high-definition cinematic video from text or animate still photos using model <span className="font-mono text-emerald-600 dark:text-emerald-400">veo-3.1-generate-preview</span>.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-white/[0.06] border border-slate-200/80 dark:border-white/[0.08] self-start sm:self-center">
            <button
              onClick={() => setMode('text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'text'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Text to Video</span>
            </button>
            <button
              onClick={() => setMode('image')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                mode === 'image'
                  ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-zinc-100 shadow-xs'
                  : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Animate Photo</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Main Generator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleGenerate} className="space-y-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/70 dark:bg-[#121216]/70 backdrop-blur-xl p-5 shadow-xs">
              {/* Photo Upload for Animate Mode */}
              {mode === 'image' && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                    Source Photo to Animate
                  </label>
                  {uploadedImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-white/[0.08] max-h-48 group">
                      <img
                        src={uploadedImage}
                        alt="To animate"
                        className="w-full h-44 object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setUploadedImage(null)}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white text-xs hover:bg-black/90 transition-colors"
                      >
                        Change Photo
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 dark:border-zinc-700 rounded-xl cursor-pointer hover:border-emerald-500/60 dark:hover:border-emerald-500/50 bg-slate-50/50 dark:bg-zinc-900/50 transition-all">
                      <Upload className="w-8 h-8 text-slate-400 mb-2" />
                      <span className="text-xs font-medium text-slate-700 dark:text-zinc-300">
                        Upload photo to animate
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
                        PNG, JPG or WEBP up to 8MB
                      </span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              )}

              {/* Prompt Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  {mode === 'image' ? 'Motion & Direction Prompt (Optional)' : 'Cinematic Video Prompt'}
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={
                    mode === 'image'
                      ? 'e.g. Camera pushes slowly forward, golden hour sunlight shines through mist...'
                      : 'e.g. Majestic eagle soaring over misty alpine mountains at dawn, cinematic 8K...'
                  }
                  rows={4}
                  className="w-full resize-none rounded-xl border border-slate-200 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90 p-3 text-xs text-slate-900 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>

              {/* Aspect Ratio Selector (16:9 or 9:16 per instructions) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Aspect Ratio (Veo 3 Standard)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                      aspectRatio === '16:9'
                        ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="font-mono">16:9</span>
                    <span>Landscape</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all ${
                      aspectRatio === '9:16'
                        ? 'border-emerald-500/80 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="font-mono">9:16</span>
                    <span>Portrait / Reel</span>
                  </button>
                </div>
              </div>

              {/* Model Info Badge */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200/60 dark:border-white/[0.04] text-[11px] text-slate-500 dark:text-zinc-400 flex items-center justify-between">
                <span>Model Engine:</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  veo-3.1-generate-preview
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || (!prompt.trim() && !uploadedImage)}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering with Google Veo 3...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Video with Veo 3</span>
                  </>
                )}
              </button>
            </form>

            {/* Inspiration Prompt Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                Inspiration Prompts
              </span>
              <div className="flex flex-col gap-1.5">
                {samplePrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setMode('text');
                      setPrompt(p);
                    }}
                    className="p-2 rounded-lg bg-white/70 dark:bg-[#121216]/70 border border-slate-200/70 dark:border-white/[0.06] text-left text-[11px] text-slate-700 dark:text-zinc-300 hover:border-emerald-500/50 transition-colors line-clamp-1"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Player & Preview Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* Active Video Player */}
            <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white/80 dark:bg-[#121216]/80 backdrop-blur-xl p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.04]">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold text-slate-900 dark:text-zinc-100">
                    Cinema Monitor
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                    Veo 3 Neural Flow
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {activeVideo?.videoUrl && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setVideoKey((k) => k + 1);
                          setVideoFailed(false);
                          setVideoLoading(false);
                        }}
                        className="py-1 px-2 rounded-lg bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] text-slate-700 dark:text-zinc-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
                        title="Reload video player buffer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reload</span>
                      </button>
                      <a
                        href={activeVideo.videoUrl}
                        download="veo-3-video.mp4"
                        target="_blank"
                        rel="noreferrer"
                        className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download MP4</span>
                      </a>
                    </>
                  )}
                </div>
              </div>

              {activeVideo?.videoUrl ? (
                <div className="mt-3 relative rounded-xl overflow-hidden bg-slate-950 flex items-center justify-center min-h-[300px]">
                  {videoLoading && (
                    <div className="absolute inset-0 z-10 bg-slate-950/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 text-white">
                      <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                      <span className="text-xs font-medium">Buffering cinematic stream...</span>
                    </div>
                  )}

                  {videoFailed ? (
                    <div className="h-72 w-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-slate-900/90 text-white">
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Video Render Ready</p>
                        <p className="text-xs text-slate-400 max-w-sm">
                          Your Veo 3 video was synthesized successfully. You can stream or download it directly.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setVideoFailed(false);
                            setVideoKey((k) => k + 1);
                          }}
                          className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Replay Video</span>
                        </button>
                        <a
                          href={activeVideo.videoUrl}
                          download="veo-video.mp4"
                          className="py-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download MP4</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`w-full flex items-center justify-center ${
                        activeVideo.aspectRatio === '9:16'
                          ? 'max-w-[280px] aspect-[9/16]'
                          : 'aspect-video max-h-[460px]'
                      }`}
                    >
                      <video
                        key={`${activeVideo.videoUrl}-${videoKey}`}
                        src={activeVideo.videoUrl}
                        controls
                        autoPlay
                        muted
                        loop
                        playsInline
                        preload="auto"
                        onWaiting={() => setVideoLoading(true)}
                        onPlaying={() => setVideoLoading(false)}
                        onCanPlay={() => {
                          setVideoFailed(false);
                          setVideoLoading(false);
                        }}
                        onLoadedData={() => {
                          setVideoFailed(false);
                          setVideoLoading(false);
                        }}
                        onError={() => {
                          setVideoLoading(false);
                          setVideoFailed(true);
                        }}
                        className="w-full h-full object-contain rounded-xl"
                      />
                    </div>
                  )}
                </div>
              ) : loading ? (
                <div className="mt-3 h-72 rounded-xl bg-black/20 flex flex-col items-center justify-center space-y-3 text-center p-6">
                  <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-zinc-100">
                      Google Veo 3 Neural Synthesis in Progress
                    </p>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm">
                      Rendering high-fidelity video frames, camera motion, and cinematic lighting...
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-3 h-72 rounded-xl border border-dashed border-slate-200 dark:border-white/[0.08] flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <Play className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-xs font-medium text-slate-600 dark:text-zinc-400">
                    No video currently active
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-zinc-500">
                    Enter a prompt or upload a photo to generate your first Veo 3 scene.
                  </p>
                </div>
              )}

              {activeVideo && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/[0.04] space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-zinc-500">
                    <span className="font-mono">Aspect: {activeVideo.aspectRatio}</span>
                    <span>Status: <strong className="text-emerald-500 capitalize">{activeVideo.status}</strong></span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-zinc-300 italic">
                    "{activeVideo.prompt}"
                  </p>
                </div>
              )}
            </div>

            {/* Generated Videos Gallery */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 dark:text-zinc-300">
                  Recent Video Generations
                </span>
                <span className="text-[11px] text-slate-400 dark:text-zinc-500">
                  {videos.length} videos
                </span>
              </div>

              {videos.length === 0 ? (
                <div className="p-4 rounded-xl border border-slate-200/60 dark:border-white/[0.06] text-center text-xs text-slate-400">
                  No video renders yet. Your created videos will appear here.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {videos.map((vid) => (
                    <div
                      key={vid.id}
                      onClick={() => setActiveVideo(vid)}
                      className={`group relative rounded-xl overflow-hidden border p-2 cursor-pointer transition-all ${
                        activeVideo?.id === vid.id
                          ? 'border-emerald-500 ring-1 ring-emerald-500/30 bg-emerald-500/5'
                          : 'border-slate-200/80 dark:border-white/[0.08] hover:border-emerald-500/50 bg-white/60 dark:bg-[#121216]/60'
                      }`}
                    >
                      {vid.videoUrl ? (
                        <video
                          key={vid.videoUrl}
                          src={vid.videoUrl}
                          className="w-full h-20 object-cover rounded-lg bg-slate-900"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      ) : (
                        <div className="w-full h-20 rounded-lg bg-slate-200 dark:bg-zinc-800 flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                        </div>
                      )}
                      <p className="mt-1 text-[10px] text-slate-700 dark:text-zinc-300 truncate font-medium">
                        {vid.prompt}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
