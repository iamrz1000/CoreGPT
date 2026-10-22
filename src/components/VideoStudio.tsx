import React, { useState, useEffect } from 'react';
import { api, ApiError } from '../services/api.ts';
import { CoreGptWatermark } from './CoreGptWatermark.tsx';
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
  ShieldCheck,
  Crown,
  Camera,
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

interface VideoUsageInfo {
  isAdmin: boolean;
  textToVideoCount: number;
  textToVideoLimit: number;
  textToVideoRemaining: number;
  imageToVideoCount: number;
  imageToVideoLimit: number;
  imageToVideoRemaining: number;
  resetsAt: string;
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
  const [videoUsage, setVideoUsage] = useState<VideoUsageInfo | null>(null);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);


  const loadUsage = async () => {
    try {
      const u = await api.video.getUsage();
      setVideoUsage(u);
    } catch (e) {
      console.warn('Could not load video usage:', e);
    }
  };

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
    loadUsage();
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
          loadUsage();
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [pollingId, videos, activeVideo]);

  const processImageFile = (file: File) => {
    if (!file) return;
    setError(null);
    setIsProcessingPhoto(true);

    const reader = new FileReader();
    reader.onerror = () => {
      setError('Could not read the selected image file. Please try another photo.');
      setIsProcessingPhoto(false);
    };

    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        setIsProcessingPhoto(false);
        return;
      }

      // Automatically downscale high-resolution mobile photos (e.g. 48MP) using an offscreen canvas
      const img = new Image();
      img.onload = () => {
        try {
          const maxDim = 1920;
          let width = img.width;
          let height = img.height;

          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
            setUploadedImage(optimizedDataUrl);
            setImageMime('image/jpeg');
          } else {
            setUploadedImage(dataUrl);
            setImageMime(file.type || 'image/jpeg');
          }
        } catch {
          setUploadedImage(dataUrl);
          setImageMime(file.type || 'image/jpeg');
        } finally {
          setIsProcessingPhoto(false);
        }
      };

      img.onerror = () => {
        setUploadedImage(dataUrl);
        setImageMime(file.type || 'image/jpeg');
        setIsProcessingPhoto(false);
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    e.target.value = '';
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() && !uploadedImage) {
      setError('Please provide a prompt or upload a photo.');
      return;
    }

    // Client-side quota guard
    if (videoUsage && !videoUsage.isAdmin) {
      if (mode === 'text' && videoUsage.textToVideoRemaining <= 0) {
        setError(`Daily Text-to-Video quota limit reached (${videoUsage.textToVideoLimit}/day). Resets daily at 00:00 UTC.`);
        return;
      }
      if (mode === 'image' && videoUsage.imageToVideoRemaining <= 0) {
        setError(`Daily Image-to-Video quota limit reached (${videoUsage.imageToVideoLimit}/day). Resets daily at 00:00 UTC.`);
        return;
      }
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
      loadUsage();
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

  const isTextQuotaExhausted =
    videoUsage && !videoUsage.isAdmin && videoUsage.textToVideoRemaining <= 0;
  const isImageQuotaExhausted =
    videoUsage && !videoUsage.isAdmin && videoUsage.imageToVideoRemaining <= 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-white dark:bg-[#181818] text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/10 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              <Film className="w-4 h-4 text-zinc-900 dark:text-white" />
              <span>CoreGPT Generative Cinema & Animation</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Generative Cinema & Animation
            </h1>
            <p className="text-xs md:text-sm text-zinc-500 dark:text-zinc-400">
              Synthesize cinematic video from text or animate still photos with Google Veo engine and watermark authentication.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10 self-start sm:self-center">
            <button
              onClick={() => { setMode('text'); setError(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'text'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>Text to Video</span>
            </button>
            <button
              onClick={() => { setMode('image'); setError(null); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                mode === 'image'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Animate Photo</span>
            </button>
          </div>
        </div>

        {/* DAILY LIMIT NOTICE / ADMIN STATUS BANNER */}
        <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03] p-4">
          {videoUsage?.isAdmin ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 flex items-center justify-center font-bold shrink-0">
                  <Crown className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                    <span>Administrator Clearance Active</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-white/10 text-zinc-800 dark:text-zinc-200">
                      Master Access
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Unlimited Text-to-Video and Image-to-Video generation access with priority neural rendering.
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 shrink-0">
                Quota: <span className="font-bold">Unlimited</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-200 dark:border-white/[0.06] pb-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  <Clock className="w-4 h-4 text-zinc-500" />
                  <span>Daily Use Limit Status</span>
                </div>
                <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Resets daily at 00:00 UTC
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Text to Video Quota Card */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    mode === 'text'
                      ? 'border-zinc-900 dark:border-white bg-white dark:bg-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <Video className="w-3.5 h-3.5" /> Text to Video Quota
                    </span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        isTextQuotaExhausted ? 'text-red-500' : 'text-zinc-900 dark:text-white'
                      }`}
                    >
                      {videoUsage ? `${videoUsage.textToVideoRemaining} / ${videoUsage.textToVideoLimit}` : '2 / 2'} left today
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isTextQuotaExhausted ? 'bg-red-500' : 'bg-zinc-900 dark:bg-white'
                      }`}
                      style={{
                        width: videoUsage
                          ? `${Math.max(0, Math.min(100, (videoUsage.textToVideoRemaining / videoUsage.textToVideoLimit) * 100))}%`
                          : '100%',
                      }}
                    />
                  </div>
                </div>

                {/* Image to Video Quota Card */}
                <div
                  className={`p-3 rounded-xl border transition-all ${
                    mode === 'image'
                      ? 'border-zinc-900 dark:border-white bg-white dark:bg-zinc-900'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white/60 dark:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" /> Animate Photo Quota
                    </span>
                    <span
                      className={`font-mono text-xs font-bold ${
                        isImageQuotaExhausted ? 'text-red-500' : 'text-zinc-900 dark:text-white'
                      }`}
                    >
                      {videoUsage ? `${videoUsage.imageToVideoRemaining} / ${videoUsage.imageToVideoLimit}` : '2 / 2'} left today
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isImageQuotaExhausted ? 'bg-red-500' : 'bg-zinc-900 dark:bg-white'
                      }`}
                      style={{
                        width: videoUsage
                          ? `${Math.max(0, Math.min(100, (videoUsage.imageToVideoRemaining / videoUsage.imageToVideoLimit) * 100))}%`
                          : '100%',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-xs hover:underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Main Generator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            <form onSubmit={handleGenerate} className="space-y-4 rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-5 shadow-xs">
              {/* Photo Upload for Animate Mode */}
              {mode === 'image' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Source Photo to Animate
                    </label>
                    <span className="text-[10px] text-zinc-400 font-mono">
                      Mobile & Desktop Supported
                    </span>
                  </div>


                  {uploadedImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 max-h-56 group bg-black/5 dark:bg-white/5">
                      <img
                        src={uploadedImage}
                        alt="To animate"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />
                      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-white font-medium drop-shadow-sm flex items-center gap-1">
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          Photo ready to animate
                        </span>
                        <div className="flex items-center gap-1.5">
                          {/* Native touch-friendly Change Photo button */}
                          <label className="relative px-2.5 py-1 rounded-lg bg-white/95 text-zinc-900 text-xs font-semibold hover:bg-white transition-all cursor-pointer shadow-sm active:scale-95 flex items-center">
                            <span>Change</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleFileInputChange}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => setUploadedImage(null)}
                            className="px-2 py-1 rounded-lg bg-black/70 text-white text-xs hover:bg-black transition-all cursor-pointer shadow-sm active:scale-95"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {/* Interactive Tap Zone with Native Invisible Input Overlay */}
                      <label className="relative flex flex-col items-center justify-center p-5 border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 rounded-xl cursor-pointer bg-zinc-50 dark:bg-zinc-850 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/80 transition-all select-none overflow-hidden">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileInputChange}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {isProcessingPhoto ? (
                          <div className="flex flex-col items-center py-2 pointer-events-none">
                            <Loader2 className="w-7 h-7 text-zinc-800 dark:text-zinc-200 animate-spin mb-2" />
                            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                              Optimizing mobile photo...
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center pointer-events-none">
                            <Upload className="w-7 h-7 text-zinc-400 mb-2" />
                            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 text-center">
                              Tap or Drag Photo to Animate
                            </span>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-1 text-center">
                              Works on all phones · Camera or Gallery photo
                            </span>
                          </div>
                        )}
                      </label>

                      {/* Mobile Native Action Buttons (Camera vs Gallery) */}
                      <div className="grid grid-cols-2 gap-2">
                        {/* Direct Camera Button */}
                        <label className="relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs overflow-hidden">
                          <Camera className="w-4 h-4 text-zinc-600 dark:text-zinc-300 pointer-events-none" />
                          <span className="pointer-events-none">Take Photo</span>
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handleFileInputChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                        </label>

                        {/* Direct Gallery Button */}
                        <label className="relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-2xs overflow-hidden">
                          <ImageIcon className="w-4 h-4 text-zinc-600 dark:text-zinc-300 pointer-events-none" />
                          <span className="pointer-events-none">Photo Gallery</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileInputChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Prompt Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
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
                  className="w-full resize-none rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 p-3 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all"
                />
              </div>

              {/* Aspect Ratio Selector */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Aspect Ratio (Veo Standard)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAspectRatio('16:9')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      aspectRatio === '16:9'
                        ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-mono">16:9</span>
                    <span>Landscape</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAspectRatio('9:16')}
                    className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      aspectRatio === '9:16'
                        ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold'
                        : 'border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="font-mono">9:16</span>
                    <span>Portrait / Reel</span>
                  </button>
                </div>
              </div>

              {/* Model & Watermark Info */}
              <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-white/[0.04] border border-zinc-200/80 dark:border-white/[0.06] text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
                <span>Watermark Protection:</span>
                <span className="font-mono text-zinc-800 dark:text-zinc-200 flex items-center gap-1 font-semibold">
                  <CoreGptWatermark size="sm" />
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={
                  loading ||
                  (!prompt.trim() && !uploadedImage) ||
                  (mode === 'text' && Boolean(isTextQuotaExhausted)) ||
                  (mode === 'image' && Boolean(isImageQuotaExhausted))
                }
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Rendering Cinematic Video...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {mode === 'text' && isTextQuotaExhausted
                        ? 'Daily Limit Reached (Admin Required)'
                        : mode === 'image' && isImageQuotaExhausted
                        ? 'Daily Photo Limit Reached (Admin Required)'
                        : 'Generate Video with CoreGPT Veo'}
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Inspiration Prompt Chips */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
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
                    className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-left text-[11px] text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600 transition-colors line-clamp-1 cursor-pointer"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Player & Preview Column */}
          <div className="lg:col-span-7 space-y-4">
            {/* Active Video Player with Watermark */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <Film className="w-4 h-4 text-zinc-900 dark:text-white" />
                  <span className="text-xs font-bold text-zinc-900 dark:text-white">
                    Cinema Monitor
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-white/10 text-zinc-800 dark:text-zinc-200 font-mono font-medium">
                    Veo Engine
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
                        className="py-1 px-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="Reload video player buffer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reload</span>
                      </button>
                      <a
                        href={activeVideo.videoUrl}
                        download="coregpt-video.mp4"
                        target="_blank"
                        rel="noreferrer"
                        className="py-1 px-3 rounded-lg bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 text-[11px] font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                      >
                        <Download className="w-3 h-3" />
                        <span>Download MP4</span>
                      </a>
                    </>
                  )}
                </div>
              </div>

              {activeVideo?.videoUrl ? (
                <div className="mt-3 relative rounded-xl overflow-hidden bg-black flex items-center justify-center min-h-[300px]">
                  {videoLoading && (
                    <div className="absolute inset-0 z-10 bg-black/75 backdrop-blur-xs flex flex-col items-center justify-center space-y-2 text-white">
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                      <span className="text-xs font-medium">Buffering cinematic stream...</span>
                    </div>
                  )}

                  {videoFailed ? (
                    <div className="h-72 w-full flex flex-col items-center justify-center p-6 text-center space-y-3 bg-zinc-900 text-white">
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                      <div className="space-y-1">
                        <p className="text-sm font-semibold">Video Render Ready</p>
                        <p className="text-xs text-zinc-400 max-w-sm">
                          Your synthesized CoreGPT video is ready. Stream or download it directly.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setVideoFailed(false);
                            setVideoKey((k) => k + 1);
                          }}
                          className="py-1.5 px-3 rounded-lg bg-white text-zinc-900 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Replay Video</span>
                        </button>
                        <a
                          href={activeVideo.videoUrl}
                          download="coregpt-video.mp4"
                          className="py-1.5 px-3 rounded-lg bg-zinc-800 text-white text-xs font-medium flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Direct Download</span>
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="relative w-full flex items-center justify-center bg-black">
                      <video
                        key={videoKey}
                        src={activeVideo.videoUrl}
                        controls
                        autoPlay
                        loop
                        playsInline
                        onLoadStart={() => setVideoLoading(true)}
                        onCanPlay={() => setVideoLoading(false)}
                        onError={() => {
                          setVideoLoading(false);
                          setVideoFailed(true);
                        }}
                        className={`w-full max-h-[480px] object-contain rounded-xl ${
                          activeVideo.aspectRatio === '9:16' ? 'max-w-xs mx-auto' : ''
                        }`}
                      />

                      {/* GEMINI-STYLE CORNER WATERMARK BADGE */}
                      <div className="absolute bottom-12 right-4 z-20 pointer-events-none">
                        <CoreGptWatermark size="sm" theme="glass" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 h-72 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-850/50 flex flex-col items-center justify-center p-6 text-center text-zinc-400 dark:text-zinc-500">
                  <Film className="w-10 h-10 mb-2 opacity-30" />
                  <p className="text-xs font-medium">No video selected</p>
                  <p className="text-[11px] max-w-xs mt-1">
                    Enter a creative scene prompt above or animate a photo to synthesize high-definition cinema.
                  </p>
                </div>
              )}

              {activeVideo && (
                <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                  <span className="truncate max-w-md font-medium text-zinc-800 dark:text-zinc-200">
                    {activeVideo.prompt}
                  </span>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[10px] uppercase">
                      Aspect: {activeVideo.aspectRatio}
                    </span>
                    <CoreGptWatermark size="sm" />
                  </div>
                </div>
              )}
            </div>

            {/* Generated Videos Gallery */}
            <div className="rounded-2xl border border-zinc-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-zinc-500" />
                  <span>Cinematic Library ({videos.length})</span>
                </span>
                <span className="text-[11px] text-zinc-400">Select to monitor</span>
              </div>

              {videos.length === 0 ? (
                <p className="text-xs text-zinc-400 py-4 text-center">
                  Your generated cinema library is empty.
                </p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-64 overflow-y-auto pr-1">
                  {videos.map((vid) => (
                    <button
                      key={vid.id}
                      onClick={() => {
                        setActiveVideo(vid);
                        setVideoKey((k) => k + 1);
                        setVideoFailed(false);
                      }}
                      className={`relative rounded-xl overflow-hidden border text-left p-2 transition-all cursor-pointer group ${
                        activeVideo?.id === vid.id
                          ? 'border-zinc-900 dark:border-white ring-1 ring-zinc-900 dark:ring-white bg-zinc-100 dark:bg-zinc-800'
                          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-850/50'
                      }`}
                    >
                      <div className="aspect-video bg-black rounded-lg overflow-hidden relative flex items-center justify-center">
                        <Film className="w-5 h-5 text-zinc-600 group-hover:text-white transition-colors" />
                        <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1 py-0.2 rounded bg-black/80 text-white font-medium">
                          {vid.aspectRatio}
                        </span>
                        <div className="absolute top-1 left-1 pointer-events-none scale-75 origin-top-left">
                          <CoreGptWatermark size="sm" />
                        </div>
                      </div>
                      <p className="text-[11px] text-zinc-800 dark:text-zinc-200 font-medium truncate mt-1.5">
                        {vid.prompt}
                      </p>
                      <span className="text-[10px] text-zinc-400 block">
                        {new Date(vid.createdAt).toLocaleDateString()}
                      </span>
                    </button>
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
