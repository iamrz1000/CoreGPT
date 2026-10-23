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
  PhoneOff,
  HelpCircle,
  FileText,
  Lightbulb,
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
  const [statusMessage, setStatusMessage] = useState('Tap Start to begin live session');
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
    } else {
      // Auto-start session for effortless, instant conversation
      startLiveApiSession();
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
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
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

      // Start 1 FPS capture loop for continuous Gemini Live scene perception
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

  const captureCurrentFrame = (): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      return lastFrameBase64Ref.current;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;
    const maxDim = 800;
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
    if (!ctx) return lastFrameBase64Ref.current;

    ctx.drawImage(video, 0, 0, targetW, targetH);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    const base64Data = dataUrl.split(',')[1];
    if (base64Data) {
      lastFrameBase64Ref.current = base64Data;
    }
    return base64Data || lastFrameBase64Ref.current;
  };

  const captureAndSendVideoFrame = () => {
    const base64Data = captureCurrentFrame();
    if (!base64Data) return;

    setVisionFramesSent((prev) => prev + 1);

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

  // Instant visual query when user taps an Astra quick-action chip
  const handleQuickVisionPrompt = (promptText: string) => {
    const frame = captureCurrentFrame();
    if (!frame && isCameraActive) {
      setStatusMessage('Focusing camera on scene...');
      return;
    }

    setSnapshotEffect(true);
    setTimeout(() => setSnapshotEffect(false), 220);

    setState('thinking');
    setAiResponse('');
    setTranscript(promptText);
    setStatusMessage(`Analyzing visual scene: "${promptText}"...`);

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'vision_query',
          prompt: promptText,
          image: frame,
        })
      );
    } else {
      handleProcessFlashQuestion(promptText);
    }
  };

  // Start Gemini 3.8 Live API real-time session
  const startLiveApiSession = async (voiceOverride?: string) => {
    stopLiveSession();
    cleanupFallback();
    stopAudioAnalysis();
    setState('connecting');
    const activeVoice = voiceOverride || currentVoice;
    setStatusMessage(`Connecting to Gemini 3.8 Live with ${activeVoice} voice...`);

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
            setStatusMessage(
              isCameraActive
                ? `Gemini Live Vision Active · Listening (${msg.voice || activeVoice} voice)`
                : `Gemini Live Ready (${msg.voice || activeVoice} voice) · Speak naturally`
            );
          }

          // Handle incoming live model audio chunks (24kHz PCM)
          if (msg.type === 'audio' && msg.audio && audioContextRef.current) {
            setState('speaking');
            playLiveAudioChunk(msg.audio);
          }

          // Handle synthesized WAV audio from vision queries or TTS fallback
          if (msg.type === 'audio_wav' && msg.audio) {
            setState('speaking');
            if (msg.text) {
              setAiResponse(msg.text);
            }
            playWavAudio(msg.audio);
          }

          // Handle incoming text transcription
          if (msg.type === 'text' && msg.text) {
            setAiResponse((prev) => prev + msg.text);
          }

          // Handle model interruption
          if (msg.type === 'interrupted') {
            interruptLiveAudio();
            setStatusMessage('Listening to you... Speak anytime');
            setState('listening');
          }

          // Handle fallback signal from server
          if (msg.type === 'fallback') {
            setStatusMessage('Live session active in ultra-fast voice pipeline.');
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
              ? 'Gemini Live Vision active · Listening to you...'
              : 'Listening to your voice · Speak anytime'
          );
        }
      };
    } catch (e) {
      console.warn('Audio chunk decode failed:', e);
    }
  };

  // Play WAV audio buffer
  const playWavAudio = (base64Wav: string) => {
    try {
      if (fallbackAudioRef.current) {
        fallbackAudioRef.current.pause();
      }
      const audioUrl = `data:audio/wav;base64,${base64Wav}`;
      const audio = new Audio(audioUrl);
      fallbackAudioRef.current = audio;

      audio.onended = () => {
        setState('listening');
        setStatusMessage(
          isCameraActive
            ? 'Gemini Live Vision active · Listening to you...'
            : 'Listening to your voice · Speak anytime'
        );
      };

      audio.onerror = () => {
        setState('listening');
      };

      audio.play().catch(console.warn);
    } catch (e) {
      console.warn('Failed to play WAV audio:', e);
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
    if (fallbackAudioRef.current) {
      try {
        fallbackAudioRef.current.pause();
      } catch {}
      fallbackAudioRef.current = null;
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
        setStatusMessage('Listening with Gemini Flash... Speak now');
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
          setStatusMessage('Microphone access is blocked. Please enable microphone permissions.');
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
            setStatusMessage('No speech detected. Tap Start to speak again.');
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
    setStatusMessage('Thinking with Gemini Flash...');

    try {
      const token = getAuthToken();
      let contextualMessage = userQuestion;
      if (isCameraActive && lastFrameBase64Ref.current) {
        contextualMessage += `\n[Camera Vision Snapshot attached: user is pointing camera at this item]`;
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

      playWavAudio(res.audioBase64);
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
    if (activeModel === 'gemini-3.8-live') {
      startLiveApiSession(v);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl p-2 sm:p-4 md:p-6 animate-in fade-in duration-200">
      {/* Hidden canvas for video frame sampling */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Gemini Live Frame Container */}
      <div className="relative w-full max-w-4xl h-[92vh] sm:h-[86vh] bg-[#090a10] border border-white/[0.12] rounded-[32px] sm:rounded-[38px] text-white shadow-2xl shadow-blue-500/10 flex flex-col overflow-hidden">
        
        {/* TOP FLOATING GLASS HEADER */}
        <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between p-4 sm:p-5 bg-gradient-to-b from-black/80 via-black/40 to-transparent pointer-events-auto">
          {/* Brand & Live status badge */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <ThinkAiLogo size={36} />
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm sm:text-base text-white tracking-tight">
                  CoreGPT Live
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
                  GEMINI 3.8 LIVE
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 mt-0.5">
                {isCameraActive ? (
                  <span className="text-cyan-300 font-medium flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Real-Time Camera Vision Active
                  </span>
                ) : (
                  <span>Real-Time Voice Perception</span>
                )}
              </p>
            </div>
          </div>

          {/* Right Header Actions: Voice Persona & Close */}
          <div className="flex items-center gap-2">
            {/* Voice Persona Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowVoicePicker(!showVoicePicker)}
                className="py-1.5 px-3 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xl transition-all cursor-pointer"
                title="Select Gemini Prebuilt Voice"
              >
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-zinc-200">{currentVoice}</span>
              </button>

              {showVoicePicker && (
                <div className="absolute right-0 top-full mt-2 w-60 rounded-2xl bg-[#14151f] border border-white/15 shadow-2xl p-2 z-40 space-y-1 text-left animate-in fade-in zoom-in-95">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    Gemini Live Voices
                  </div>
                  {GEMINI_PREBUILT_VOICES.map((v) => (
                    <button
                      key={v.id}
                      onClick={() => handleSelectVoice(v.id)}
                      className={`w-full p-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                        currentVoice === v.id
                          ? 'bg-blue-600 text-white font-semibold shadow-md'
                          : 'hover:bg-white/10 text-zinc-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{v.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-black/40 text-cyan-300 font-mono">
                          {v.tag}
                        </span>
                      </div>
                      <div className="text-[10px] opacity-75 truncate mt-0.5">{v.tone}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 sm:p-2.5 rounded-full bg-black/60 hover:bg-black/80 border border-white/15 text-zinc-300 hover:text-white backdrop-blur-xl transition-all cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          </div>
        </div>

        {/* HERO CANVAS: CAMERA VIEWFINDER OR GEMINI LIVE AURA */}
        <div className="relative flex-1 w-full h-full flex items-center justify-center overflow-hidden bg-black">
          {/* CAMERA FEED (When active) */}
          {isCameraActive ? (
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover select-none"
              />

              {/* Shutter Snapshot Flash Effect */}
              <div
                className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 z-20 ${
                  snapshotEffect ? 'opacity-35' : 'opacity-0'
                }`}
              />

              {/* Subtle Scanning Line Animation */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-40 animate-pulse pointer-events-none top-1/3" />

              {/* Google Gemini Live Targeting Reticles [   ] */}
              <div className="absolute inset-4 sm:inset-8 pointer-events-none border border-cyan-400/20 rounded-2xl sm:rounded-3xl">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-xl" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-xl" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-xl" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-xl" />
              </div>

              {/* Top HUD Perception Badge */}
              <div className="absolute top-20 left-4 sm:left-6 z-20 flex items-center gap-2">
                <div className="px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-xl border border-cyan-500/40 text-[11px] font-mono text-cyan-300 font-bold tracking-wider flex items-center gap-2 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>GEMINI VISION · ACTIVE</span>
                  <span className="text-zinc-500">|</span>
                  <span className="text-[10px] text-zinc-300">{visionFramesSent} frames analyzed</span>
                </div>
              </div>
            </div>
          ) : (
            /* GEMINI LIVE MULTI-COLORED FLUID AURA (When camera is OFF) */
            <div className="relative w-full h-full flex flex-col items-center justify-center select-none overflow-hidden">
              {/* Deep Ambient Background Glow */}
              <div
                className="absolute w-96 h-96 rounded-full blur-3xl opacity-30 pointer-events-none transition-transform duration-200"
                style={{
                  transform: `scale(${1 + audioLevel * 1.2})`,
                  background:
                    state === 'speaking'
                      ? 'radial-gradient(circle, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)'
                      : state === 'listening'
                      ? 'radial-gradient(circle, #06b6d4 0%, #10b981 50%, #3b82f6 100%)'
                      : state === 'thinking'
                      ? 'radial-gradient(circle, #ec4899 0%, #a855f7 50%, #6366f1 100%)'
                      : 'radial-gradient(circle, #2563eb 0%, #1e1b4b 70%, transparent 100%)',
                }}
              />

              {/* Layered Floating Fluid Aura Rings */}
              <div
                className="relative rounded-full flex items-center justify-center transition-all duration-150 cursor-pointer"
                onClick={() => {
                  if (state === 'idle') startLiveApiSession();
                  else if (state === 'speaking') interruptLiveAudio();
                }}
                title={state === 'speaking' ? 'Click to interrupt' : 'Live audio active'}
              >
                {/* Outer Breathing Halo */}
                <div
                  className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-cyan-400/20 blur-sm animate-spin-slow pointer-events-none"
                  style={{
                    transform: `scale(${1 + audioLevel * 0.8})`,
                    background:
                      'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(147, 51, 234, 0.1) 60%, transparent 70%)',
                  }}
                />

                {/* Core Aura Orb */}
                <div
                  className={`relative z-10 w-36 h-36 sm:w-44 sm:h-44 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all ${
                    state === 'listening'
                      ? 'bg-gradient-to-tr from-cyan-500 via-sky-600 to-emerald-400 shadow-cyan-500/40 border border-cyan-300/40'
                      : state === 'speaking'
                      ? 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 shadow-blue-500/50 border border-blue-400/50 scale-105'
                      : state === 'thinking'
                      ? 'bg-gradient-to-tr from-pink-500 via-purple-600 to-indigo-500 shadow-purple-500/40 border border-purple-400/40 animate-pulse'
                      : 'bg-zinc-900 border border-white/15 hover:bg-zinc-800'
                  }`}
                >
                  {state === 'listening' ? (
                    <Mic className="w-12 h-12 text-white animate-pulse" />
                  ) : state === 'speaking' ? (
                    <Volume2 className="w-12 h-12 text-white animate-bounce" />
                  ) : state === 'thinking' ? (
                    <Loader2 className="w-12 h-12 text-white animate-spin" />
                  ) : (
                    <div className="flex flex-col items-center">
                      <Mic className="w-10 h-10 text-zinc-300 mb-1" />
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                        Start
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Reactive Soundwave Frequency Spectrum Bars */}
              {state !== 'idle' && (
                <div className="flex items-center justify-center gap-1.5 mt-8 h-8 px-4 z-10">
                  {freqBars.map((bar, idx) => (
                    <div
                      key={idx}
                      className={`w-1.5 rounded-full transition-all duration-75 ${
                        state === 'speaking'
                          ? 'bg-gradient-to-t from-blue-500 via-cyan-400 to-sky-200'
                          : state === 'listening'
                          ? 'bg-gradient-to-t from-emerald-500 via-cyan-400 to-teal-200'
                          : 'bg-zinc-600'
                      }`}
                      style={{
                        height: `${Math.max(6, bar * 32)}px`,
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FLOATING SUBTITLES & TRANSCRIPTS BUBBLE (Gemini Style) */}
          <div className="absolute bottom-28 inset-x-3 sm:inset-x-8 z-30 pointer-events-none flex flex-col items-center">
            {/* Live Status Tag */}
            <div className="mb-2.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-xl border border-white/10 text-xs font-semibold text-cyan-300 flex items-center gap-2 shadow-lg pointer-events-auto">
              {state === 'connecting' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {state === 'speaking' && <Activity className="w-3.5 h-3.5 animate-pulse text-cyan-400" />}
              {state === 'thinking' && <Sparkles className="w-3.5 h-3.5 animate-spin text-purple-400" />}
              <span>{statusMessage}</span>
            </div>

            {/* Transcript / Spoken Output Bubble */}
            {(transcript || aiResponse) && (
              <div className="w-full max-w-xl max-h-28 overflow-y-auto p-3.5 sm:p-4 rounded-2xl bg-black/80 backdrop-blur-2xl border border-white/15 text-left text-xs sm:text-sm space-y-1.5 pointer-events-auto shadow-2xl">
                {transcript && (
                  <p className="text-zinc-400 italic font-medium flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold not-italic px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">
                      You
                    </span>
                    <span>"{transcript}"</span>
                  </p>
                )}
                {aiResponse && (
                  <p className="text-white font-normal leading-relaxed flex items-start gap-1.5">
                    <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300 shrink-0 mt-0.5">
                      Gemini
                    </span>
                    <span className="text-zinc-100">{aiResponse}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* FLOATING QUICK-ACTION SCENE CHIPS (Project Astra Style - When Camera is Active) */}
          {isCameraActive && (
            <div className="absolute bottom-20 inset-x-3 sm:inset-x-6 z-30 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => handleQuickVisionPrompt('What is this? Please explain clearly.')}
                className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-xl border border-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-all shrink-0 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                <span>What is this?</span>
              </button>

              <button
                onClick={() => handleQuickVisionPrompt('Read and transcribe any text visible here.')}
                className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-xl border border-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-all shrink-0 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Read text</span>
              </button>

              <button
                onClick={() => handleQuickVisionPrompt('Explain what you see in front of the camera.')}
                className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-xl border border-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-all shrink-0 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
              >
                <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                <span>Explain scene</span>
              </button>

              <button
                onClick={() => handleQuickVisionPrompt('Analyze this and give step-by-step helpful guidance.')}
                className="px-3 py-1.5 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-xl border border-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-all shrink-0 hover:scale-105 active:scale-95 shadow-lg cursor-pointer"
              >
                <Scan className="w-3.5 h-3.5 text-purple-400" />
                <span>Help me solve</span>
              </button>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="absolute top-20 inset-x-4 sm:inset-x-8 z-30 max-w-md mx-auto p-3 rounded-2xl bg-red-500/20 backdrop-blur-xl border border-red-500/40 text-xs text-red-200 flex items-center justify-between">
              <span>{cameraError}</span>
              <button onClick={() => setCameraError(null)} className="p-1 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM FLOATING CONTROLS DOCK (Iconic Gemini Live Glass Pill) */}
        <div className="absolute bottom-4 inset-x-0 z-30 flex items-center justify-center px-4 pointer-events-auto">
          <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-black/85 backdrop-blur-2xl border border-white/15 shadow-2xl">
            {/* Camera Toggle Button */}
            <button
              onClick={toggleCamera}
              disabled={isCameraLoading}
              className={`p-3 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                isCameraActive
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/30'
                  : 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white'
              }`}
              title={isCameraActive ? 'Turn off camera' : 'Turn on camera vision'}
            >
              {isCameraLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isCameraActive ? (
                <Camera className="w-5 h-5" />
              ) : (
                <CameraOff className="w-5 h-5" />
              )}
            </button>

            {/* Flip Camera Button (when camera is on) */}
            {isCameraActive && (
              <button
                onClick={flipCamera}
                disabled={isCameraLoading}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-all cursor-pointer flex items-center justify-center"
                title="Switch Front/Rear Camera"
              >
                <RefreshCw className={`w-5 h-5 ${isCameraLoading ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Microphone Mute Button */}
            <button
              onClick={() => setIsMuted(!isMuted)}
              className={`p-3 rounded-full transition-all cursor-pointer flex items-center justify-center ${
                isMuted
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Interrupt Speech Button (Active during speaking) */}
            {state === 'speaking' && (
              <button
                onClick={interruptLiveAudio}
                className="px-3.5 py-2.5 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-lg cursor-pointer"
                title="Interrupt Gemini speech"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">Interrupt</span>
              </button>
            )}

            {/* End Call Button (Red Circle) */}
            <button
              onClick={() => {
                cleanupAll();
                onClose();
              }}
              className="p-3 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/40 transition-all cursor-pointer flex items-center justify-center"
              title="End conversation"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
