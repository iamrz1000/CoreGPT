import React, { useState, useEffect, useRef } from 'react';
import {
  Music,
  Disc3,
  Play,
  Pause,
  Download,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
  Sliders,
  ListMusic,
  Radio,
  Clock,
  Zap,
  Flame,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { api, ApiError } from '../services/api.ts';
import { User, UsageState } from '../types/index.ts';
import { UnityAdModal } from './UnityAdModal.tsx';
import { AdRewardPromptCard } from './AdRewardPromptCard.tsx';

interface Track {
  id: string;
  title: string;
  prompt: string;
  model: 'lyria-3-clip-preview' | 'lyria-3-pro-preview';
  durationSeconds: number;
  genre: string;
  bpm: number;
  audioUrl: string;
  createdAt: string;
  lyrics?: string;
}

interface MusicStudioProps {
  currentUser?: User | null;
  usage?: UsageState | null;
}

const GENRE_PRESETS = [
  { name: 'Cyberpunk Synthwave', icon: '⚡', prompt: 'Neon synth bassline with driving 80s drums and dark futuristic arpeggios' },
  { name: 'Lo-Fi Chill Hop', icon: '☕', prompt: 'Mellow vinyl crackle with smooth rhodes piano chords and relaxed boom-bap rhythm' },
  { name: 'Cinematic Orchestral', icon: '🎻', prompt: 'Epic swelling strings, heavy brass hits, and powerful cinematic battle percussion' },
  { name: 'High-Energy EDM', icon: '🔥', prompt: 'Thumping four-on-the-floor kick, euphoric supersaw lead, and intense festival drop' },
  { name: 'Ambient Zen', icon: '🌌', prompt: 'Weightless atmospheric pads, gentle ethereal textures, and cosmic meditation drones' },
  { name: '80s Retrowave', icon: '🕶️', prompt: 'Nostalgic analog synthesizer chords, gated reverb snare, and outrun highway vibe' },
];

export const MusicStudio: React.FC<MusicStudioProps> = ({ currentUser, usage }) => {
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState<'lyria-3-clip-preview' | 'lyria-3-pro-preview'>('lyria-3-clip-preview');
  const [selectedGenre, setSelectedGenre] = useState('Cyberpunk Synthwave');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Tracks & Playback state
  const [tracks, setTracks] = useState<Track[]>([]);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);

  // Rewarded Ad state
  const [adModalOpen, setAdModalOpen] = useState(false);
  const [adSuccessToast, setAdSuccessToast] = useState<string | null>(null);

  const isAdmin =
    currentUser?.role === 'admin' ||
    currentUser?.email === 'umarhani2000@gmail.com' ||
    currentUser?.email === 'faqruddin00000@gmail.com' ||
    Boolean(usage?.isAdmin);

  // Audio & Visualizer refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Load existing tracks
  useEffect(() => {
    api.music
      .list()
      .then((res) => {
        if (res.tracks && res.tracks.length > 0) {
          setTracks(res.tracks);
          setCurrentTrack(res.tracks[0]);
        }
      })
      .catch((err) => {
        console.warn('Could not load track history:', err);
      });
  }, []);

  // Initialize Web Audio Visualizer
  const setupAudioContext = () => {
    if (!audioRef.current || audioContextRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;

      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);

      audioContextRef.current = ctx;
      analyserRef.current = analyser;
      sourceNodeRef.current = source;
    } catch (e) {
      console.warn('AudioContext initialization skipped:', e);
    }
  };

  // Canvas Visualizer Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (analyserRef.current && isPlaying) {
        const bufferLength = analyserRef.current.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyserRef.current.getByteFrequencyData(dataArray);

        const barWidth = (width / bufferLength) * 1.5;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (dataArray[i] / 255) * height * 0.9;
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, '#10b981');
          gradient.addColorStop(0.5, '#06b6d4');
          gradient.addColorStop(1, '#a855f7');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, [3, 3, 0, 0]);
          ctx.fill();

          x += barWidth;
        }
      } else {
        // Ambient idle waveform
        const numBars = 32;
        const barWidth = width / numBars;
        const now = Date.now() / 800;

        for (let i = 0; i < numBars; i++) {
          const idleHeight = Math.sin(now + i * 0.3) * 6 + 10;
          ctx.fillStyle = 'rgba(16, 185, 129, 0.25)';
          ctx.beginPath();
          ctx.roundRect(i * barWidth, height - idleHeight, barWidth - 2, idleHeight, [2, 2, 0, 0]);
          ctx.fill();
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying]);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setErrorMessage(null);

    try {
      const res = await api.music.generate({
        prompt: prompt.trim(),
        duration: selectedModel === 'lyria-3-pro-preview' ? 'pro' : 'clip',
        genre: selectedGenre,
      });

      if (res.track) {
        setTracks((prev) => [res.track, ...prev]);
        setCurrentTrack(res.track);
        setIsPlaying(true);
        if (audioRef.current) {
          audioRef.current.src = res.track.audioUrl;
          audioRef.current.play().catch(() => {});
        }
      }
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 429) {
        if (!isAdmin) {
          setAdModalOpen(true);
        }
      }
      setErrorMessage(err.message || 'Music generation failed. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = () => {
    if (!audioRef.current || !currentTrack) return;
    setupAudioContext();

    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    }
  };

  const handleSelectTrack = (track: Track) => {
    setCurrentTrack(track);
    setupAudioContext();
    if (audioRef.current) {
      audioRef.current.src = track.audioUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.volume = volume || 0.8;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-3.5rem)] overflow-y-auto bg-zinc-50 dark:bg-[#1a1a1a] text-zinc-900 dark:text-zinc-100 p-4 sm:p-6 lg:p-8">
      {/* Hidden Audio Player */}
      <audio
        ref={audioRef}
        src={currentTrack ? currentTrack.audioUrl : undefined}
        loop={isLooping}
        onTimeUpdate={() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
            setDuration(audioRef.current.duration || 0);
          }
        }}
        onEnded={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="max-w-6xl mx-auto w-full space-y-6">
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-white/10 pb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Music className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-zinc-900 dark:text-white">
                HYNEX AI Music Studio
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                Google Lyria 3
              </span>
            </div>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
              Generate full studio tracks &amp; cinematic clips using Google Lyria neural acoustics
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 dark:text-zinc-400">Engine:</span>
            <div className="inline-flex rounded-xl p-1 bg-zinc-200/70 dark:bg-white/5 border border-zinc-300 dark:border-white/10">
              <button
                onClick={() => setSelectedModel('lyria-3-clip-preview')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedModel === 'lyria-3-clip-preview'
                    ? 'bg-white dark:bg-[#2a2a2a] text-zinc-950 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                Lyria Clip (30s)
              </button>
              <button
                onClick={() => setSelectedModel('lyria-3-pro-preview')}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  selectedModel === 'lyria-3-pro-preview'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                Lyria Pro (Full)
              </button>
            </div>
          </div>
        </div>

        {/* Ad Reward Success Notification */}
        {adSuccessToast && (
          <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-md flex items-center justify-between">
            <span>{adSuccessToast}</span>
            <button onClick={() => setAdSuccessToast(null)} className="cursor-pointer text-emerald-300 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* Studio Grid: Generation Panel (Left) & Active Player / Visualizer (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Generation Input Form (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#212121] border border-zinc-200 dark:border-white/10 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Prompt / Audio Concept</span>
                </label>
                <span className="text-[11px] font-mono text-zinc-400">
                  {selectedModel === 'lyria-3-pro-preview' ? 'Full Length' : '30s Clip'}
                </span>
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your desired music, instruments, mood, tempo, and atmosphere (e.g. 'Cyberpunk synthwave with heavy analog bassline, punchy drums, and shimmering arpeggios')..."
                rows={3}
                className="w-full p-3 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-50 dark:bg-black/30 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 text-xs sm:text-sm focus:outline-none focus:border-purple-500 dark:focus:border-purple-400 transition-colors resize-none"
              />

              {/* Genre Pills */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  Style &amp; Mood Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {GENRE_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setSelectedGenre(preset.name);
                        setPrompt(preset.prompt);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                        selectedGenre === preset.name
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'bg-zinc-100 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-white/10 border border-zinc-200 dark:border-white/5'
                      }`}
                    >
                      <span>{preset.icon}</span>
                      <span>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
                  {errorMessage}
                </div>
              )}

              {/* Generate Button */}
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-600 via-indigo-600 to-emerald-600 hover:opacity-95 text-white shadow-md transition-all active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Disc3 className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Track with Lyria...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Generate Music Track</span>
                  </>
                )}
              </button>

              {/* Quota prompt for normal users */}
              {!isAdmin && (
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 text-center">
                  Normal user: 5 free Lyria music tracks/day. Admins have unlimited access.
                </div>
              )}
            </div>
          </div>

          {/* Active Audio Visualizer & Player (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#212121] border border-zinc-200 dark:border-white/10 shadow-xs space-y-5">
              {/* Spectrum Visualizer Canvas */}
              <div className="relative w-full h-36 rounded-xl bg-black/90 dark:bg-black/80 overflow-hidden border border-zinc-800 flex items-center justify-center">
                <canvas ref={canvasRef} width={500} height={140} className="w-full h-full" />
                <div className="absolute top-2.5 left-3 flex items-center gap-2 text-[10px] font-mono text-zinc-400">
                  <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-zinc-600'}`}></span>
                  <span>{isPlaying ? 'PLAYING AUDIO STREAM' : 'AUDIO READY'}</span>
                </div>
                {currentTrack && (
                  <div className="absolute bottom-2.5 right-3 text-[10px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                    {currentTrack.model} · {currentTrack.bpm} BPM
                  </div>
                )}
              </div>

              {/* Current Track Details */}
              {currentTrack ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base sm:text-lg text-zinc-900 dark:text-white truncate">
                        {currentTrack.title}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1">
                        {currentTrack.prompt}
                      </p>
                    </div>
                    <a
                      href={currentTrack.audioUrl}
                      download={`${currentTrack.title.replace(/\s+/g, '_')}.wav`}
                      className="p-2 rounded-xl border border-zinc-200 dark:border-white/10 bg-zinc-100 dark:bg-white/5 hover:bg-zinc-200 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                      title="Download Master Audio File"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Download WAV</span>
                    </a>
                  </div>

                  {/* Seek Bar & Time */}
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min={0}
                      max={duration || currentTrack.durationSeconds || 30}
                      step={0.1}
                      value={currentTime}
                      onChange={handleSeek}
                      className="w-full accent-purple-600 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg"
                    />
                    <div className="flex justify-between text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration || currentTrack.durationSeconds || 30)}</span>
                    </div>
                  </div>

                  {/* Playback Controls Bar */}
                  <div className="flex items-center justify-between pt-1">
                    {/* Left: Loop & Rewind */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (audioRef.current) audioRef.current.currentTime = 0;
                        }}
                        className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Restart Track"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setIsLooping(!isLooping)}
                        className={`p-2 rounded-lg transition-colors cursor-pointer ${
                          isLooping
                            ? 'text-purple-600 dark:text-purple-400 bg-purple-500/10'
                            : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
                        }`}
                        title={isLooping ? 'Loop Enabled' : 'Enable Loop'}
                      >
                        <Disc3 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Center: Play / Pause */}
                    <button
                      onClick={handlePlayPause}
                      className="w-12 h-12 rounded-full bg-zinc-900 text-white dark:bg-white dark:text-black flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
                      title={isPlaying ? 'Pause' : 'Play'}
                    >
                      {isPlaying ? (
                        <Pause className="w-5 h-5 fill-current" />
                      ) : (
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      )}
                    </button>

                    {/* Right: Volume */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleMute}
                        className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
                        title={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted || volume === 0 ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={isMuted ? 0 : volume}
                        onChange={handleVolumeChange}
                        className="w-16 accent-purple-600 cursor-pointer h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded-lg hidden sm:block"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-400 dark:text-zinc-500 text-xs">
                  No active track loaded. Generate a track on the left to start listening!
                </div>
              )}
            </div>

            {/* Track History Library */}
            <div className="p-5 rounded-2xl bg-white dark:bg-[#212121] border border-zinc-200 dark:border-white/10 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-300 flex items-center gap-1.5">
                  <ListMusic className="w-3.5 h-3.5 text-purple-500" />
                  <span>Recent Creations ({tracks.length})</span>
                </h4>
              </div>

              {tracks.length === 0 ? (
                <p className="text-xs text-zinc-400 dark:text-zinc-500 py-4 text-center">
                  Your generated music library will appear here.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {tracks.map((t) => {
                    const isSelected = currentTrack?.id === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => handleSelectTrack(t)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-purple-500/10 border-purple-500/30 text-purple-900 dark:text-purple-200'
                            : 'bg-zinc-50 dark:bg-white/5 border-zinc-200/70 dark:border-white/5 hover:bg-zinc-100 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <button
                            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected && isPlaying
                                ? 'bg-purple-600 text-white'
                                : 'bg-zinc-200 dark:bg-white/10 text-zinc-700 dark:text-zinc-300'
                            }`}
                          >
                            {isSelected && isPlaying ? (
                              <Pause className="w-3.5 h-3.5 fill-current" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                            )}
                          </button>
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{t.title}</p>
                            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                              {t.genre} · {t.durationSeconds}s
                            </p>
                          </div>
                        </div>

                        <a
                          href={t.audioUrl}
                          download={`${t.title}.wav`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                          title="Download track"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Rewarded Ad Modal for Music Credits */}
      <UnityAdModal
        isOpen={adModalOpen}
        onClose={() => setAdModalOpen(false)}
        mode="rewarded"
        rewardType="text"
        isAdmin={isAdmin}
        onRewardClaimed={() => {
          setErrorMessage(null);
          setAdSuccessToast('🎉 Bonus Music Creation Credits Granted via Unity Ads!');
          setTimeout(() => setAdSuccessToast(null), 6000);
        }}
      />
    </div>
  );
};
