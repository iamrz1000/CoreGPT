import React, { useState, useEffect } from 'react';
import { api, ApiError, getAuthToken } from '../services/api.ts';
import { GeneratedImage, UsageState, User } from '../types/index.ts';
import { CoreGptWatermark } from './CoreGptWatermark.tsx';
import {
  Sparkles,
  Download,
  RotateCcw,
  Loader2,
  Maximize2,
  X,
  AlertCircle,
  Image as ImageIcon,
  Flame,
  Wand2,
  Copy,
  Check,
  Lightbulb,
} from 'lucide-react';

interface ImageStudioProps {
  usage: UsageState | null;
  onRefreshUsage: () => void;
  currentUser?: User | null;
}

export const ImageStudio: React.FC<ImageStudioProps> = ({ usage, onRefreshUsage, currentUser }) => {
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [selectedStyle, setSelectedStyle] = useState('Realistic Photo');
  const [selectedModel, setSelectedModel] = useState('flux-realism');
  const [loading, setLoading] = useState(false);
  const [enhancing, setEnhancing] = useState(false);
  const [autoEnhance, setAutoEnhance] = useState(true);
  const [lastEnhancedPrompt, setLastEnhancedPrompt] = useState<string | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [activeImage, setActiveImage] = useState<GeneratedImage | null>(null);

  const models = [
    {
      id: 'flux-realism',
      name: 'FLUX.1 Realism Master',
      tag: 'Ultra-Realism 8K',
      desc: 'State-of-the-art neural engine with hyper-realistic textures, authentic human skin tones, crisp lighting, and zero distortion',
    },
    {
      id: 'gemini-nano-banana-2.1',
      name: 'Google Gemini Nano Banana 2.1',
      tag: 'Google Advanced 4K',
      desc: 'Next-gen Google flagship model for high-resolution detail, rich cinematic depth, and intricate composition',
    },
    {
      id: 'flux-anime',
      name: 'FLUX.1 Anime & Digital Art',
      tag: 'Artistic Master',
      desc: 'Specialized model for breathtaking manga, anime, 3D digital art, and stylized illustrations',
    },
    {
      id: 'gemini-3.1-flash-lite-image',
      name: 'Gemini Nano Banana Lite',
      tag: 'Ultra-Fast',
      desc: 'High-throughput generative engine for rapid visual prototyping',
    },
  ];

  const stylePresets = [
    { label: 'Realistic Photo', promptSuffix: ', photorealistic, 8k resolution, cinematic lighting, sharp focus' },
    { label: 'Cyberpunk Neon', promptSuffix: ', cyberpunk aesthetic, neon glow, futuristic city, highly detailed, octane render' },
    { label: 'Cinematic 3D', promptSuffix: ', 3D digital art, Pixar style, volumetric lighting, rich textures' },
    { label: 'Anime / Manga', promptSuffix: ', modern anime aesthetic, Makoto Shinkai style, vibrant colors, clean lines' },
    { label: 'Fantasy Concept', promptSuffix: ', epic fantasy illustration, digital painting, dramatic atmosphere, trending on ArtStation' },
    { label: 'Minimalist Vector', promptSuffix: ', minimalist vector illustration, clean lines, flat modern aesthetic' },
  ];

  const aspectRatios = [
    { id: '1:1', label: '1:1 Square', desc: 'Social & Avatars' },
    { id: '16:9', label: '16:9 Landscape', desc: 'Banners & Wallpapers' },
    { id: '9:16', label: '9:16 Portrait', desc: 'Stories & Mobile' },
    { id: '4:3', label: '4:3 Classic', desc: 'Standard Photo' },
    { id: '3:4', label: '3:4 Tall', desc: 'Poster & Portrait' },
  ];

  const quickInspirations = [
    { label: 'Nano Banana Cyber', prompt: 'futuristic golden Nano Banana pulsing with glowing neon circuits in high-tech laboratory, 8k cinematic lighting, octane render' },
    { label: 'Cyberpunk Tokyo', prompt: 'cyberpunk girl standing under neon rain in neo-Tokyo' },
    { label: 'Bioluminescent Fox', prompt: 'glowing mystical fox in an enchanted bioluminescent forest' },
    { label: 'Astronaut Stardust', prompt: 'futuristic astronaut floating inside a vibrant starlight nebula' },
    { label: 'Vintage Hypercar', prompt: 'classic 1970s sports car racing along an autumn mountain cliff' },
  ];

  const fetchImages = async () => {
    if (!currentUser && !getAuthToken()) {
      return;
    }
    try {
      const res = await api.images.list();
      setImages(res.images || []);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        return;
      }
      console.warn('Could not load gallery images:', err);
    }
  };

  useEffect(() => {
    if (currentUser || getAuthToken()) {
      fetchImages();
    }
  }, [currentUser]);

  const handleEnhancePrompt = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || enhancing) return;

    setError(null);
    setEnhancing(true);

    try {
      const res = await api.images.enhancePrompt({
        prompt: trimmed,
        style: selectedStyle,
      });

      if (res.enhancedPrompt) {
        setPrompt(res.enhancedPrompt);
        setLastEnhancedPrompt(res.enhancedPrompt);
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to enhance prompt with Gemini AI.');
    } finally {
      setEnhancing(false);
    }
  };

  const handleGenerate = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const targetPrompt = (customPrompt || prompt).trim();
    if (!targetPrompt || loading) return;

    setError(null);
    setLoading(true);

    try {
      const styleObj = stylePresets.find((s) => s.label === selectedStyle);
      const enhancedPromptWithStyle = `${targetPrompt}${styleObj?.promptSuffix || ''}`;

      const res = await api.images.generate({
        prompt: enhancedPromptWithStyle,
        aspectRatio,
        autoEnhance,
        style: selectedStyle,
        model: selectedModel,
      });

      setImages((prev) => [res.image, ...prev]);
      setActiveImage(res.image);
      if (res.finalPrompt && res.finalPrompt !== targetPrompt) {
        setLastEnhancedPrompt(res.finalPrompt);
      }
      onRefreshUsage();
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
      else setError('Failed to generate image. Please try another prompt.');
    } finally {
      setLoading(false);
    }
  };

  const downloadImage = (img: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = img.image_url;
    link.download = `coregpt-art-${img.id.slice(0, 8)}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(id);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const wordCount = prompt.trim() ? prompt.trim().split(/\s+/).length : 0;
  const isSmallPrompt = wordCount > 0 && wordCount < 12;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 bg-white dark:bg-[#181818] text-zinc-900 dark:text-zinc-100 transition-colors">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Studio Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 rounded-2xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-white/[0.03]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-zinc-900 dark:text-white" />
              <span className="text-xs font-bold tracking-wider uppercase text-zinc-600 dark:text-zinc-400">
                CoreGPT Visual Studio
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              High-Fidelity Image Synthesis
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-lg leading-relaxed">
              Transform descriptive concepts into 4K artwork powered by Google Gemini models with watermark authenticity.
            </p>
          </div>

          {/* Daily Use Limit / Quota badge */}
          {usage && (
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-right shrink-0">
              <div className="flex items-center justify-end gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium">
                <Flame className="w-3.5 h-3.5 text-zinc-800 dark:text-zinc-200" />
                <span>{usage.isAdmin ? 'Admin Clearance' : 'Daily Use Limit'}</span>
              </div>
              <p className="text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                {usage.isAdmin ? 'Admin: Unlimited' : `${usage.imageRemaining} / ${usage.imageLimit} left today`}
              </p>
              {!usage.isAdmin && (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Resets daily at 00:00 UTC
                </p>
              )}
            </div>
          )}
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
            <div className="space-y-0.5">
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        {/* Generator Controls */}
        <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-xs space-y-4">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span>Image Prompt</span>
                  {isSmallPrompt && autoEnhance && (
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                      · Auto-Enhance Active
                    </span>
                  )}
                </label>

                {/* Gemini Prompt Enhancer Button */}
                <button
                  type="button"
                  onClick={handleEnhancePrompt}
                  disabled={enhancing || !prompt.trim() || loading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 shadow-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Use Gemini AI to turn short words into detailed visual prompt"
                >
                  {enhancing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Enhancing with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Magic Prompt Expander</span>
                    </>
                  )}
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter a creative prompt: e.g. 'A futuristic hypercar racing along a neon coastal cliff at dusk, 8k resolution, volumetric smoke'..."
                  rows={3}
                  className="w-full p-3 text-sm rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-white transition-all pr-12"
                />
                {prompt.trim() && (
                  <button
                    type="button"
                    onClick={() => setPrompt('')}
                    className="absolute right-3 top-3 p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                    title="Clear prompt"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Inspiration Chips */}
              <div className="mt-2.5">
                <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 mb-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-zinc-700 dark:text-zinc-300" />
                  <span>Quick inspiration:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {quickInspirations.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setPrompt(item.prompt)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto Enhance Switch */}
              <div className="mt-3 flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Auto-Enrich Short Prompts
                    </span>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Automatically expands brief concepts into high-fidelity artistic descriptions before generation.
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoEnhance}
                    onChange={(e) => setAutoEnhance(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-zinc-900 dark:peer-checked:bg-white"></div>
                </label>
              </div>
            </div>

            {/* Generative Model Engine */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Generative Engine
                </label>
                <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
                  Google Gemini Nano Banana Series
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {models.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      selectedModel === m.id
                        ? 'border-zinc-900 dark:border-white bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold ring-1 ring-zinc-900 dark:ring-white'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-xs font-semibold">{m.name}</span>
                      <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-200">
                        {m.tag}
                      </span>
                    </div>
                    <div className="text-[10px] text-zinc-500 dark:text-zinc-400 line-clamp-1">
                      {m.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Aspect Ratio Selector */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Aspect Ratio
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {aspectRatios.map((ar) => (
                  <button
                    type="button"
                    key={ar.id}
                    onClick={() => setAspectRatio(ar.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      aspectRatio === ar.id
                        ? 'border-zinc-900 dark:border-white bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-bold'
                        : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-850 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400 dark:hover:border-zinc-600'
                    }`}
                  >
                    <div className="text-xs font-semibold">{ar.label}</div>
                    <div className="text-[10px] opacity-75 truncate">{ar.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Style Preset */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                Visual Style Preset
              </label>
              <div className="flex flex-wrap gap-1.5">
                {stylePresets.map((s) => (
                  <button
                    type="button"
                    key={s.label}
                    onClick={() => setSelectedStyle(s.label)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      selectedStyle === s.label
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-semibold shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-black text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-900 font-semibold text-xs transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Composition with Gemini...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Synthesize Composition</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Gallery */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-zinc-500" />
              Generated Gallery ({images.length})
            </h3>
            <span className="text-xs text-zinc-400">All outputs stamped with CoreGPT watermark</span>
          </div>

          {images.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <ImageIcon className="w-10 h-10 mx-auto text-zinc-400 mb-2 opacity-50" />
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                No images generated yet
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                Enter a creative prompt above to create your first visual masterpiece.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {images.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs transition-all hover:border-zinc-400 dark:hover:border-zinc-600"
                >
                  <div className="aspect-square overflow-hidden bg-black relative">
                    <img
                      src={img.image_url}
                      alt={img.prompt}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />

                    {/* GEMINI-STYLE CORNER WATERMARK BADGE */}
                    <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none group-hover:opacity-30 transition-opacity">
                      <CoreGptWatermark size="sm" theme="glass" />
                    </div>
                  </div>

                  {/* Overlay Controls */}
                  <div className="absolute inset-0 bg-black/65 opacity-0 group-hover:opacity-100 transition-opacity p-4 flex flex-col justify-between text-white">
                    <p className="text-xs line-clamp-3 text-white/90">{img.prompt}</p>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/20">
                      <span className="text-[10px] uppercase font-bold text-white/80">
                        {img.aspect_ratio}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => copyToClipboard(img.prompt, img.id)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-xs transition-colors cursor-pointer"
                          title="Copy Prompt"
                        >
                          {copiedPrompt === img.id ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => downloadImage(img)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-xs transition-colors cursor-pointer"
                          title="Download Image"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setPrompt(img.prompt);
                            handleGenerate(undefined, img.prompt);
                          }}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-xs transition-colors cursor-pointer"
                          title="Regenerate with same prompt"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setActiveImage(img)}
                          className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 backdrop-blur-xs transition-colors cursor-pointer"
                          title="View Fullscreen"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal with Watermark */}
      {activeImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <button
            onClick={() => setActiveImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-4xl max-h-[90vh] flex flex-col items-center gap-4">
            <div className="relative max-h-[75vh] rounded-xl overflow-hidden shadow-2xl">
              <img
                src={activeImage.image_url}
                alt={activeImage.prompt}
                className="max-h-[75vh] w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              {/* Corner Watermark */}
              <div className="absolute bottom-4 right-4 z-20 pointer-events-none">
                <CoreGptWatermark size="md" theme="glass" />
              </div>
            </div>

            <div className="w-full flex items-center justify-between text-white px-2 gap-4">
              <p className="text-xs max-w-xl truncate text-white/80">{activeImage.prompt}</p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => copyToClipboard(activeImage.prompt, 'modal')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
                >
                  {copiedPrompt === 'modal' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Prompt
                    </>
                  )}
                </button>
                <button
                  onClick={() => downloadImage(activeImage)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white text-zinc-900 hover:bg-zinc-200 text-xs font-semibold shadow-md cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
