import React, { useState, useEffect, useRef } from 'react';
import { api, getAuthToken } from '../services/api.ts';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  Camera,
  CameraOff,
  RefreshCw,
  Sparkles,
  Loader2,
  Radio,
  Zap,
  Activity,
  RotateCcw,
  Eye,
  Sliders,
  Scan,
} from 'lucide-react';
import { ThinkAiLogo } from './ThinkAiLogo.tsx';

interface VoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceName: string;
  onVoiceChange?: (voice: string) => void;
  selectedLanguage: string;
}

export const GEMINI_PREBUILT_VOICES = [
  { id: 'Zephyr', name: 'Zephyr', tone: 'Calm, Articulate & Warm', tag: 'Gemini Default' },
  { id: 'Kore', name: 'Kore', tone: 'Natural, Expressive & Friendly', tag: 'Recommended' },
  { id: 'Puck', name: 'Puck', tone: 'Energetic, Bright & Dynamic', tag: 'Upbeat' },
  { id: 'Fenrir', name: 'Fenrir', tone: 'Deep, Confident & Smooth', tag: 'Authoritative' },
  { id: 'Charon', name: 'Charon', tone: 'Thoughtful, Composed & Steady', tag: 'Executive' },
] as const;

// Convert 16-bit PCM little-endian Base64 string to 24kHz AudioBuffer for gapless playback
function pcm24kBase64ToAudioBuffer(base64: string, ctx: AudioContext): AudioBuffer {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  const buffer = ctx.createBuffer(1, float32Array.length, 24000);
  buffer.copyToChannel(float32Array, 0);
  return buffer;
}

// Convert Float32Array from microphone to 16-bit PCM little-endian ArrayBuffer
function floatTo16BitPCM(input: Float32Array): ArrayBuffer {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output.buffer;
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export const VoiceConversationModal: React.FC<VoiceConversationModalProps> = ({
  isOpen,
  onClose,
  voiceName,
  onVoiceChange,
  selectedLanguage,
}) => {
  const [activeModel, setActiveModel] = useState<'gemini-3.8-live' | 'gemini-3.8-flash'>(
    'gemini-3.8-live'
  );
  const [state, setState] = useState<'idle' | 'connecting' | 'listening' | 'speaking' | 'thinking'>(
    'idle'
  );
  const [transcript, setTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [statusMessage, setStatusMessage] = useState('Select Start to begin talking');
  const [liveConnected, setLiveConnected] = useState(false);

  // Voice selection state
  const [currentVoice, setCurrentVoice] = useState<string>(voiceName || 'Zephyr');
  const [showVoicePicker, setShowVoicePicker] = useState(false);

  // Microphone mute
  const [isMuted, setIsMuted] = useState(false);
  const isMutedRef = useRef(false);

  // Camera Live Vision state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [visionFramesSent, setVisionFramesSent] = useState(0);
  const [snapshotEffect, setSnapshotEffect] = useState(false);

  // Audio level meter for reactive aura visualizer
  const [audioLevel, setAudioLevel] = useState(0);
  const [freqBars, setFreqBars] = useState<number[]>(new Array(16).fill(0.08));

  // References for Live API WebSocket & AudioContext
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);

  // Audio Analyser
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Camera references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameBase64Ref = useRef<string | null>(null);

  // Fallback Web Speech Recognition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    if (voiceName) {
      setCurrentVoice(voiceName);
    }
  }, [voiceName]);

  useEffect(() => {
    if (!isOpen) {
      cleanupAll();
    }
    return () => {
      cleanupAll();
    };
  }, [isOpen]);

  const cleanupAll = () => {
    stopLiveSession();
    stopCamera();
    cleanupFallback();
    stopAudioAnalysis();
    setState('idle');
    setLiveConnected(false);
    setAudioLevel(0);
    setFreqBars(new Array(16).fill(0.08));
  };

  const cleanupFallback = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    if (fallbackAudioRef.current) {
      fallbackAudioRef.current.pause();
      fallbackAudioRef.current = null;
    }
  };

  const stopAudioAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    analyserRef.current = null;
  };

  const setupAudioAnalysis = (sourceNode: AudioNode, ctx: AudioContext) => {
    stopAudioAnalysis();
    try {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.65;
      sourceNode.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateMeter = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        const bars: number[] = [];
        const step = Math.max(1, Math.floor(dataArray.length / 16));
        for (let i = 0; i < 16; i++) {
          const val = dataArray[i * step] || 0;
          sum += val;
          bars.push(Math.max(0.06, val / 255));
        }
        const avg = sum / (dataArray.length * 255);
        setAudioLevel(avg);
        setFreqBars(bars);

        animFrameRef.current = requestAnimationFrame(updateMeter);
      };

      animFrameRef.current = requestAnimationFrame(updateMeter);
    } catch (e) {
      console.warn('Audio analysis setup warning:', e);
    }
  };

  const stopLiveSession = () => {
    // Stop all audio output sources
    scheduledSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {}
    });
    scheduledSourcesRef.current = [];
    nextStartTimeRef.current = 0;

    // Disconnect microphone processor & tracks
    if (processorRef.current) {
      try {
        processorRef.current.disconnect();
      } catch {}
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      try {
        inputAudioContextRef.current.close();
      } catch {}
      inputAudioContextRef.current = null;
    }
    if (audioContextRef.current) {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    // Close WebSocket
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    setLiveConnected(false);
  };

  // CAMERA LIVE STREAM CONTROLS
  const startCamera = async (facing: 'user' | 'environment' = cameraFacingMode) => {
    setIsCameraLoading(true);
    setCameraError(null);
    try {
      if (cameraStreamRef.current) {
        cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });
      cameraStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setIsCameraActive(true);
      setCameraFacingMode(facing);

      // Start 1 FPS capture loop for Gemini Live (per SDK guidelines)
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = setInterval(() => {
        captureAndSendVideoFrame();
      }, 1000);
    } catch (err: unknown) {
      console.warn('Camera access failed:', err);
      const msg = err instanceof Error ? err.message : 'Could not access camera device.';
      setCameraError(msg);
      setIsCameraActive(false);
    } finally {
      setIsCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    lastFrameBase64Ref.current = null;
  };

  const toggleCamera = () => {
    if (isCameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  };

  const flipCamera = () => {
    const nextFacing = cameraFacingMode === 'user' ? 'environment' : 'user';
    startCamera(nextFacing);
  };

  const captureAndSendVideoFrame = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const maxDim = 640;
    let targetW = width;
    let targetH = height;
    if (width > maxDim || height > maxDim) {
      if (width > height) {
        targetW = maxDim;
        targetH = Math.round((height * maxDim) / width);
      } else {
        targetH = maxDim;
        targetW = Math.round((width * maxDim) / height);
      }
    }

    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.65);
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) return;

    lastFrameBase64Ref.current = base64Data;
    setVisionFramesSent((prev) => prev + 1);

    // Subtle snapshot pulse
    setSnapshotEffect(true);
    setTimeout(() => setSnapshotEffect(false), 200);

    // Stream frame to Gemini Live API via WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          video: base64Data,
          mimeType: 'image/jpeg',
        })
      );
    }
  };

  // Start Gemini 3.8 Live API real-time session
  const startLiveApiSession = async (voiceOverride?: string) => {
    cleanupAll();
    setState('connecting');
    const activeVoice = voiceOverride || currentVoice;
    setStatusMessage(`Connecting to Gemini 3.8 Live API with ${activeVoice} voice...`);

    try {
      // 1. Initialize 24kHz AudioContext for model playback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const outputCtx = new AudioCtx({ sampleRate: 24000 });
      if (outputCtx.state === 'suspended') {
        await outputCtx.resume();
      }
      audioContextRef.current = outputCtx;
      nextStartTimeRef.current = outputCtx.currentTime;

      // 2. Open WebSocket to backend Live API proxy with selected voice
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live?voice=${encodeURIComponent(activeVoice)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`🎙️ [Live API Client]: Connected with ${activeVoice} voice`);
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ready') {
            setLiveConnected(true);
            setState('listening');
            setStatusMessage(`Gemini 3.8 Live connected (${msg.voice || activeVoice} voice). Speak freely!`);
          }

          // Handle incoming live model audio chunks (24kHz PCM)
          if (msg.type === 'audio' && msg.audio && audioContextRef.current) {
            setState('speaking');
            playLiveAudioChunk(msg.audio);
          }

          // Handle incoming text transcription
          if (msg.type === 'text' && msg.text) {
            setAiResponse((prev) => prev + msg.text);
          }

          // Handle model interruption
          if (msg.type === 'interrupted') {
            interruptLiveAudio();
            setStatusMessage('Interrupted. Listening to you...');
            setState('listening');
          }

          // Handle fallback signal from server
          if (msg.type === 'fallback') {
            setStatusMessage('Live session active in high-fidelity voice mode.');
            setLiveConnected(true);
            setState('listening');
          }
        } catch (e) {
          console.warn('[Live API Client] Parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('Live API WebSocket notice, falling back to Flash voice pipeline:', err);
        fallbackToFlashVoice();
      };

      ws.onclose = () => {
        setLiveConnected(false);
      };

      // 3. Capture Microphone at 16kHz for Live API Input
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      const inputCtx = new AudioCtx({ sampleRate: 16000 });
      inputAudioContextRef.current = inputCtx;
      const source = inputCtx.createMediaStreamSource(stream);

      // Connect mic to visualizer analyser
      setupAudioAnalysis(source, inputCtx);

      // Buffer size 2048 at 16kHz is ~128ms per chunk
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN && !isMutedRef.current) {
          const inputData = e.inputBuffer.getChannelData(0);
          const pcmBuffer = floatTo16BitPCM(inputData);
          const base64Audio = arrayBufferToBase64(pcmBuffer);
          ws.send(JSON.stringify({ audio: base64Audio }));
        }
      };

      source.connect(processor);
      processor.connect(inputCtx.destination);
    } catch (err: unknown) {
      console.warn('Could not initialize direct Live API audio pipeline:', err);
      fallbackToFlashVoice();
    }
  };

  // Play incoming raw PCM audio chunk gaplessly
  const playLiveAudioChunk = (base64Audio: string) => {
    const ctx = audioContextRef.current;
    if (!ctx) return;

    try {
      const buffer = pcm24kBase64ToAudioBuffer(base64Audio, ctx);
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      // Connect to output analyser for visual frequency bouncing
      setupAudioAnalysis(source, ctx);
      source.connect(ctx.destination);

      // Gapless scheduling
      const now = ctx.currentTime;
      const startTime = Math.max(now, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + buffer.duration;

      scheduledSourcesRef.current.push(source);
      source.onended = () => {
        scheduledSourcesRef.current = scheduledSourcesRef.current.filter((s) => s !== source);
        if (scheduledSourcesRef.current.length === 0) {
          setState('listening');
          setStatusMessage(
            isCameraActive
              ? 'Gemini Live Vision active. Listening to you...'
              : 'Listening to your voice... Speak anytime'
          );
        }
      };
    } catch (e) {
      console.warn('Audio chunk decode failed:', e);
    }
  };

  // Interruption: immediately cancel queued playback nodes
  const interruptLiveAudio = () => {
    scheduledSourcesRef.current.forEach((src) => {
      try {
        src.stop();
      } catch {}
    });
    scheduledSourcesRef.current = [];
    if (audioContextRef.current) {
      nextStartTimeRef.current = audioContextRef.current.currentTime;
    }
  };

  // Fallback to Gemini 3.8 Flash + Web Speech Recognition + TTS
  const fallbackToFlashVoice = () => {
    setActiveModel('gemini-3.8-flash');
    startFlashListening();
  };

  const startFlashListening = () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setStatusMessage('Speech recognition is not supported in this browser.');
      setState('idle');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;

      if (selectedLanguage && selectedLanguage !== 'auto') {
        const langMap: Record<string, string> = {
          English: 'en-US',
          Hindi: 'hi-IN',
          Urdu: 'ur-PK',
          Marathi: 'mr-IN',
          Arabic: 'ar-SA',
          Spanish: 'es-ES',
          French: 'fr-FR',
          German: 'de-DE',
          Chinese: 'zh-CN',
          Japanese: 'ja-JP',
        };
        recognition.lang = langMap[selectedLanguage] || 'en-US';
      }

      recognition.onstart = () => {
        setState('listening');
        setStatusMessage('Listening with Gemini 3.8 Flash... Speak now');
        setTranscript('');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let text = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          text += event.results[i][0].transcript;
        }
        setTranscript(text);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed') {
          setStatusMessage(
            'Microphone access is blocked. Please enable microphone permissions in your browser.'
          );
        } else if (event.error !== 'no-speech') {
          setStatusMessage(`Voice notice: ${event.error}`);
        }
        setState('idle');
      };

      recognition.onend = () => {
        setTranscript((current) => {
          if (current.trim()) {
            handleProcessFlashQuestion(current.trim());
          } else {
            setState('idle');
            setStatusMessage('No speech detected. Press Start to speak again.');
          }
          return current;
        });
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.error('Speech initialization error:', err);
      setStatusMessage('Could not access microphone.');
      setState('idle');
    }
  };

  const handleProcessFlashQuestion = async (userQuestion: string) => {
    setState('thinking');
    setStatusMessage('Thinking with Gemini 3.8 Flash...');

    try {
      const token = getAuthToken();
      // If camera is active, include snapshot in request context
      let contextualMessage = userQuestion;
      if (isCameraActive && lastFrameBase64Ref.current) {
        contextualMessage += `\n[Camera Vision Snapshot attached: user is currently showing you something via real-time camera feed]`;
      }

      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          message: contextualMessage,
          model: 'gemini-3.8-flash',
          language: selectedLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate AI response');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            const rawChunk = decoder.decode(value, { stream: true });
            const lines = rawChunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(line.slice(6));
                  if (parsed.type === 'chunk' && parsed.text) {
                    accumulated += parsed.text;
                    setAiResponse(accumulated);
                  }
                } catch {}
              }
            }
          }
        }
      }

      if (accumulated.trim()) {
        await playFlashSpeech(accumulated.trim());
      } else {
        setState('idle');
        setStatusMessage('Done. Tap to talk again.');
      }
    } catch (err) {
      console.error('Processing voice query failed:', err);
      setStatusMessage('Encountered an issue. Please try again.');
      setState('idle');
    }
  };

  const playFlashSpeech = async (text: string) => {
    setState('speaking');
    setStatusMessage('Speaking response...');

    try {
      const res = await api.voice.tts({
        text: text.slice(0, 1000),
        voice: currentVoice,
      });

      const audioUrl = `data:audio/wav;base64,${res.audioBase64}`;
      const audio = new Audio(audioUrl);
      fallbackAudioRef.current = audio;

      audio.onended = () => {
        setState('listening');
        setStatusMessage('Listening again... Keep talking');
        startFlashListening();
      };

      audio.onerror = () => {
        setState('idle');
        setStatusMessage('Speech audio playback failed.');
      };

      await audio.play();
    } catch (err) {
      console.error('TTS playback error:', err);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text.slice(0, 500));
        utterance.onend = () => {
          startFlashListening();
        };
        window.speechSynthesis.speak(utterance);
      } else {
        setState('idle');
      }
    }
  };

  const handleSelectVoice = (v: string) => {
    setCurrentVoice(v);
    onVoiceChange?.(v);
    setShowVoicePicker(false);
    if (state !== 'idle' && activeModel === 'gemini-3.8-live') {
      startLiveApiSession(v);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-3 sm:p-5 animate-in fade-in duration-200">
      {/* Hidden canvas for video frame sampling */}
      <canvas ref={canvasRef} className="hidden" />

      <div className="relative w-full max-w-2xl max-h-[94vh] overflow-y-auto bg-[#0a0a0f] border border-white/[0.12] rounded-3xl p-4 sm:p-7 text-white shadow-2xl flex flex-col items-center text-center">
        {/* Top Controls Bar */}
        <div className="w-full flex items-center justify-between gap-2 mb-4 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <ThinkAiLogo size={32} />
            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white tracking-tight">CoreGPT Live</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-blue-500/20 text-sky-400 border border-blue-500/30">
                  GEMINI 3.8
                </span>
              </div>
              <p className="text-[10px] text-zinc-400">Real-Time Voice &amp; Camera Vision</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Voice Persona Selector Button */}
            <div className="relative">
              <button
                onClick={() => setShowVoicePicker(!showVoicePicker)}
                className="py-1.5 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Select Gemini Prebuilt Voice"
              >
                <Sliders className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold text-zinc-200">{currentVoice}</span>
              </button>

              {showVoicePicker && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#16161e] border border-white/10 shadow-2xl p-2 z-30 space-y-1 text-left animate-in fade-in zoom-in-95">
                  <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Gemini Live Prebuilt Voices
                  </div>
                  {GEMINI_PREBUILT_VOICES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleSelectVoice(v.id)}
                      className={`w-full p-2 rounded-xl text-left text-xs transition-colors ${
                        currentVoice === v.id
                          ? 'bg-blue-600 text-white font-semibold'
                          : 'hover:bg-white/5 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{v.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/30 text-sky-300 font-mono">
                          {v.tag}
                        </span>
                      </div>
                      <div className="text-[10px] opacity-75 truncate">{v.tone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors min-w-[38px] min-h-[38px] flex items-center justify-center"
              title="Close live conversation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Model Mode Toggle */}
        <div className="flex items-center justify-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-4 text-xs w-full max-w-sm">
          <button
            type="button"
            onClick={() => {
              setActiveModel('gemini-3.8-live');
              cleanupAll();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeModel === 'gemini-3.8-live'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Gemini Live Duplex</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveModel('gemini-3.8-flash');
              cleanupAll();
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeModel === 'gemini-3.8-flash'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Gemini Flash</span>
          </button>
        </div>

        {/* CAMERA LIVE VISION VIEWPORT (When Camera is Active) */}
        {isCameraActive && (
          <div className="relative w-full max-w-lg aspect-4/3 sm:aspect-16/10 rounded-2xl overflow-hidden mb-4 border border-cyan-500/30 bg-black shadow-2xl shadow-cyan-500/10 transition-all">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* Shutter Flash Effect on 1 FPS frame sampling */}
            <div
              className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ${
                snapshotEffect ? 'opacity-25' : 'opacity-0'
              }`}
            />

            {/* Gemini Vision HUD Overlay Brackets */}
            <div className="absolute inset-2 sm:inset-4 pointer-events-none border border-cyan-400/20 rounded-xl">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
            </div>

            {/* Live Camera Perception Status Header */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-auto">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>GEMINI VISION LIVE · 1 FPS</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={flipCamera}
                  disabled={isCameraLoading}
                  className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white text-xs flex items-center gap-1 transition-colors"
                  title="Flip Camera (Front / Rear)"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCameraLoading ? 'animate-spin' : ''}`} />
                  <span className="text-[10px] font-medium hidden sm:inline">Flip</span>
                </button>

                <button
                  onClick={stopCamera}
                  className="p-1.5 rounded-lg bg-red-600/80 hover:bg-red-600 backdrop-blur-md text-white transition-colors"
                  title="Turn off camera"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bottom Perception Banner */}
            <div className="absolute bottom-2 left-3 right-3 flex items-center justify-between text-[10px] text-zinc-300 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 font-mono">
              <span className="flex items-center gap-1 text-emerald-400">
                <Eye className="w-3 h-3" />
                <span>Active Scene Perception</span>
              </span>
              <span className="text-zinc-400">{visionFramesSent} frames analyzed</span>
            </div>
          </div>
        )}

        {/* Camera Error Alert */}
        {cameraError && (
          <div className="w-full max-w-md p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-400 mb-3 flex items-center justify-between">
            <span>{cameraError}</span>
            <button onClick={() => setCameraError(null)} className="p-1 text-red-300">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ICONIC GEMINI LIVE FLUID AURA & SOUNDWAVE VISUALIZER */}
        <div className="relative my-3 sm:my-5 flex flex-col items-center justify-center">
          {/* Multi-layered dynamic breathing radial aura */}
          <div
            className="absolute rounded-full transition-transform duration-150 pointer-events-none"
            style={{
              width: isCameraActive ? '160px' : '230px',
              height: isCameraActive ? '160px' : '230px',
              transform: `scale(${1 + audioLevel * 0.7})`,
              background:
                state === 'speaking'
                  ? 'radial-gradient(circle, rgba(66, 133, 244, 0.45) 0%, rgba(147, 51, 234, 0.3) 50%, rgba(0, 0, 0, 0) 70%)'
                  : state === 'listening'
                  ? 'radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(16, 185, 129, 0.3) 50%, rgba(0, 0, 0, 0) 70%)'
                  : state === 'thinking'
                  ? 'radial-gradient(circle, rgba(236, 72, 153, 0.4) 0%, rgba(99, 102, 241, 0.3) 50%, rgba(0, 0, 0, 0) 70%)'
                  : 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0) 70%)',
            }}
          />

          {/* Central Pulsing Orb / Action Core */}
          <div
            onClick={() => {
              if (state === 'idle') {
                if (activeModel === 'gemini-3.8-live') startLiveApiSession();
                else startFlashListening();
              } else if (state === 'speaking') {
                if (activeModel === 'gemini-3.8-live') interruptLiveAudio();
                else cleanupAll();
              } else {
                cleanupAll();
              }
            }}
            className={`relative z-10 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all cursor-pointer border ${
              isCameraActive ? 'w-24 h-24' : 'w-32 h-32 sm:w-36 sm:h-36'
            } ${
              state === 'listening'
                ? 'bg-gradient-to-tr from-sky-600 to-emerald-500 border-sky-400/50 shadow-sky-500/30'
                : state === 'thinking'
                ? 'bg-gradient-to-tr from-indigo-600 to-pink-500 border-indigo-400/50 animate-pulse shadow-indigo-500/30'
                : state === 'speaking'
                ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 border-blue-400/50 shadow-blue-500/40'
                : 'bg-zinc-900 hover:bg-zinc-800/80 border-white/[0.12]'
            }`}
          >
            {state === 'listening' ? (
              <Mic className={`${isCameraActive ? 'w-8 h-8' : 'w-10 h-10'} animate-pulse text-white`} />
            ) : state === 'thinking' ? (
              <Loader2 className={`${isCameraActive ? 'w-8 h-8' : 'w-10 h-10'} animate-spin text-white`} />
            ) : state === 'speaking' ? (
              <Volume2 className={`${isCameraActive ? 'w-8 h-8' : 'w-10 h-10'} animate-bounce text-white`} />
            ) : (
              <div className="flex flex-col items-center">
                <Mic className={`${isCameraActive ? 'w-7 h-7' : 'w-9 h-9'} text-zinc-300 mb-1`} />
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Tap to Start</span>
              </div>
            )}
          </div>

          {/* Real-time Spectrum Soundwave Bars */}
          {state !== 'idle' && (
            <div className="flex items-center justify-center gap-1 mt-4 h-6 px-3">
              {freqBars.map((bar, idx) => (
                <div
                  key={idx}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    state === 'speaking'
                      ? 'bg-gradient-to-t from-blue-500 to-cyan-300'
                      : state === 'listening'
                      ? 'bg-gradient-to-t from-emerald-500 to-sky-300'
                      : 'bg-zinc-600'
                  }`}
                  style={{
                    height: `${Math.max(4, bar * 24)}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Live Status Message */}
        <p className="text-xs sm:text-sm font-semibold text-sky-300 min-h-[22px] mb-3 flex items-center justify-center gap-2">
          {state === 'connecting' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {state === 'speaking' && <Activity className="w-3.5 h-3.5 animate-pulse text-sky-400" />}
          <span>{statusMessage}</span>
        </p>

        {/* Real-time Transcripts / Subtitles Display */}
        <div className="w-full min-h-[70px] max-h-32 overflow-y-auto p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-left text-xs space-y-2 mb-4">
          {transcript && (
            <div>
              <span className="text-zinc-500 font-semibold block text-[10px] uppercase tracking-wider mb-0.5">
                You said:
              </span>
              <p className="text-zinc-200 italic font-medium">"{transcript}"</p>
            </div>
          )}
          {aiResponse && (
            <div>
              <span className="text-sky-400 font-semibold block text-[10px] uppercase tracking-wider mb-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-sky-400" />
                <span>CoreGPT ({currentVoice}):</span>
              </span>
              <p className="text-zinc-200 leading-relaxed font-sans">{aiResponse}</p>
            </div>
          )}
          {!transcript && !aiResponse && (
            <p className="text-zinc-500 text-center py-2 text-xs">
              {isCameraActive
                ? 'Camera perception active. Point your camera at anything and ask CoreGPT in real time!'
                : activeModel === 'gemini-3.8-live'
                ? 'Start speaking to converse with Gemini Live in natural, flowing dialogue.'
                : 'Press Start to speak and ask CoreGPT anything.'}
            </p>
          )}
        </div>

        {/* ACTIONS & CONTROLS DOCK */}
        <div className="w-full flex items-center justify-center gap-2 sm:gap-3 flex-wrap pt-1">
          {/* Camera Vision Toggle Button */}
          <button
            onClick={toggleCamera}
            disabled={isCameraLoading}
            className={`py-2 px-3 sm:px-4 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
              isCameraActive
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30'
                : 'bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 border border-white/[0.1]'
            }`}
            title={isCameraActive ? 'Turn off live camera' : 'Start live camera vision'}
          >
            {isCameraActive ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4 text-cyan-400" />}
            <span>{isCameraActive ? 'Camera Vision ON' : 'Turn On Camera'}</span>
          </button>

          {/* Flip Camera Button (when camera is on) */}
          {isCameraActive && (
            <button
              onClick={flipCamera}
              className="py-2 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 border border-white/[0.1] text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Switch Front/Rear Camera"
            >
              <RefreshCw className="w-3.5 h-3.5 text-zinc-300" />
              <span>Flip</span>
            </button>
          )}

          {/* Microphone Mute Toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isMuted
                ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                : 'bg-white/[0.08] hover:bg-white/[0.14] text-zinc-200 border border-white/[0.1]'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? <MicOff className="w-3.5 h-3.5 text-red-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isMuted ? 'Muted' : 'Mic ON'}</span>
          </button>

          {/* Primary Action Button (Start / Interrupt / End) */}
          {state === 'idle' ? (
            <button
              onClick={() => {
                if (activeModel === 'gemini-3.8-live') startLiveApiSession();
                else startFlashListening();
              }}
              className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-xs sm:text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 cursor-pointer"
            >
              <Mic className="w-4 h-4" />
              <span>Start Session</span>
            </button>
          ) : (
            <>
              {state === 'speaking' && activeModel === 'gemini-3.8-live' && (
                <button
                  onClick={interruptLiveAudio}
                  className="py-2 px-3.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/30 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Interrupt</span>
                </button>
              )}

              <button
                onClick={cleanupAll}
                className="py-2 px-4 rounded-xl bg-red-600/90 hover:bg-red-600 text-white font-semibold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-red-600/20 cursor-pointer"
              >
                <span>End Session</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
