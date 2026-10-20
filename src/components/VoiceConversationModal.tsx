import React, { useState, useEffect, useRef } from 'react';
import { api, getAuthToken } from '../services/api.ts';
import {
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Loader2,
  Radio,
  Zap,
  Activity,
  RotateCcw,
} from 'lucide-react';
import { ThinkAiLogo } from './ThinkAiLogo.tsx';

interface VoiceConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  voiceName: string;
  selectedLanguage: string;
}

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

  // References for Live API WebSocket & AudioContext
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scheduledSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);

  // Fallback Web Speech Recognition
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const fallbackAudioRef = useRef<HTMLAudioElement | null>(null);

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
    cleanupFallback();
    setState('idle');
    setLiveConnected(false);
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

  // Start Gemini 3.8 Live API real-time session
  const startLiveApiSession = async () => {
    cleanupAll();
    setState('connecting');
    setStatusMessage('Connecting to Google Gemini 3.8 Live API...');

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

      // 2. Open WebSocket to backend Live API proxy
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('🎙️ [Live API Client]: WebSocket opened');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'ready') {
            setLiveConnected(true);
            setState('listening');
            setStatusMessage('Gemini 3.8 Live API Connected. Speak freely!');
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
            setStatusMessage('Live API fallback active. Ready for voice interaction.');
            setLiveConnected(true);
            setState('listening');
          }
        } catch (e) {
          console.warn('[Live API Client] Parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.warn('Live API WebSocket error, switching to Flash speech mode:', err);
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

      // Buffer size 2048 at 16kHz is ~128ms per chunk
      const processor = inputCtx.createScriptProcessor(2048, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (ws.readyState === WebSocket.OPEN) {
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
          setStatusMessage('Listening to your voice... Speak anytime');
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
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({
          message: userQuestion,
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
        voice: voiceName,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-[#0e0e12] border border-white/[0.09] rounded-2xl p-6 md:p-8 text-white shadow-2xl flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
          title="Close voice conversation"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Top Logo */}
        <div className="mb-3">
          <ThinkAiLogo size={44} />
        </div>

        {/* Model Mode Toggle Header */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-white/[0.08] mb-4 text-xs">
          <button
            type="button"
            onClick={() => {
              setActiveModel('gemini-3.8-live');
              cleanupAll();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeModel === 'gemini-3.8-live'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Gemini 3.8 Live API</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/20 text-sky-300 font-semibold">
              Duplex
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveModel('gemini-3.8-flash');
              cleanupAll();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeModel === 'gemini-3.8-flash'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Gemini 3.8 Flash</span>
          </button>
        </div>

        {/* Active Badge */}
        <div className="flex items-center gap-1.5 text-sky-400 text-xs font-mono uppercase tracking-wider mb-1">
          <span className="relative flex h-2 w-2">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                state !== 'idle' ? 'bg-sky-400' : 'bg-zinc-600'
              }`}
            ></span>
            <span
              className={`relative inline-flex rounded-full h-2 w-2 ${
                state !== 'idle' ? 'bg-blue-500' : 'bg-zinc-500'
              }`}
            ></span>
          </span>
          <span>
            {activeModel === 'gemini-3.8-live'
              ? 'Real-Time Live API Duplex Voice'
              : 'Conversational Voice Dialogue'}
          </span>
        </div>

        <h3 className="text-xl font-bold tracking-tight mb-2">
          CoreGPT Live Voice
        </h3>
        <p className="text-xs text-zinc-400 max-w-md mb-6 leading-relaxed">
          {activeModel === 'gemini-3.8-live'
            ? 'Speak continuously in real-time. Live API provides natural conversational voice, instant turn-taking, and interruption handling.'
            : 'Interactive turn-based speech powered by Gemini 3.8 Flash and custom voice profiles.'}
        </p>

        {/* Dynamic Visual Pulse Circle */}
        <div className="relative my-4 flex items-center justify-center">
          {/* Animated Glow Rings */}
          {state === 'listening' && (
            <>
              <div className="absolute w-48 h-48 rounded-full bg-blue-500/20 animate-ping" />
              <div className="absolute w-36 h-36 rounded-full bg-sky-500/30 animate-pulse" />
            </>
          )}

          {state === 'thinking' && (
            <div className="absolute w-44 h-44 rounded-full bg-cyan-500/20 animate-spin" />
          )}

          {state === 'speaking' && (
            <>
              <div className="absolute w-48 h-48 rounded-full bg-blue-500/25 animate-pulse duration-700" />
              <div className="absolute w-36 h-36 rounded-full bg-sky-500/30 animate-ping duration-1000" />
            </>
          )}

          {/* Central Button / Indicator */}
          <button
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
            className={`relative z-10 w-28 h-28 rounded-full flex items-center justify-center text-white shadow-2xl transition-all cursor-pointer ${
              state === 'listening'
                ? 'bg-blue-600 scale-105 ring-4 ring-blue-500/30'
                : state === 'thinking'
                ? 'bg-cyan-600 ring-4 ring-cyan-500/30'
                : state === 'speaking'
                ? 'bg-sky-600 ring-4 ring-sky-500/30'
                : 'bg-zinc-800 hover:bg-zinc-700 border border-white/[0.08]'
            }`}
          >
            {state === 'listening' ? (
              <Mic className="w-10 h-10 animate-pulse text-white" />
            ) : state === 'thinking' ? (
              <Loader2 className="w-10 h-10 animate-spin text-white" />
            ) : state === 'speaking' ? (
              <Volume2 className="w-10 h-10 animate-bounce text-white" />
            ) : (
              <Mic className="w-10 h-10 text-zinc-400 group-hover:text-white" />
            )}
          </button>
        </div>

        {/* Status Message */}
        <p className="text-sm font-medium text-sky-300 min-h-[24px] mb-4 flex items-center gap-2">
          {state === 'connecting' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {state === 'speaking' && <Activity className="w-3.5 h-3.5 animate-pulse text-sky-400" />}
          <span>{statusMessage}</span>
        </p>

        {/* Real-time Subtitles / Transcript */}
        <div className="w-full min-h-[90px] max-h-36 overflow-y-auto p-4 rounded-xl bg-zinc-900/90 border border-zinc-800/80 text-left text-xs space-y-2 mb-6">
          {transcript && (
            <div>
              <span className="text-zinc-500 font-semibold block mb-0.5">Spoken query:</span>
              <p className="text-zinc-200 italic">"{transcript}"</p>
            </div>
          )}
          {aiResponse && (
            <div>
              <span className="text-zinc-300 font-semibold block mb-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-zinc-300" />
                <span>CoreGPT:</span>
              </span>
              <p className="text-zinc-300 leading-relaxed">{aiResponse}</p>
            </div>
          )}
          {!transcript && !aiResponse && (
            <p className="text-zinc-500 text-center py-3">
              {activeModel === 'gemini-3.8-live'
                ? 'Press "Start Live Session" to talk continuously with CoreGPT in real time.'
                : 'Press "Start Speaking" to ask anything with CoreGPT voice.'}
            </p>
          )}
        </div>

        {/* Actions Toolbar */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {state === 'idle' ? (
            <button
              onClick={() => {
                if (activeModel === 'gemini-3.8-live') startLiveApiSession();
                else startFlashListening();
              }}
              className="py-2.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-500 font-semibold text-sm transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2"
            >
              <Mic className="w-4 h-4" />
              <span>
                {activeModel === 'gemini-3.8-live' ? 'Start Live Session' : 'Start Speaking'}
              </span>
            </button>
          ) : (
            <>
              {state === 'speaking' && activeModel === 'gemini-3.8-live' && (
                <button
                  onClick={interruptLiveAudio}
                  className="py-2.5 px-5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-all flex items-center gap-1.5 shadow-md shadow-amber-600/30"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Interrupt AI</span>
                </button>
              )}

              <button
                onClick={cleanupAll}
                className="py-2.5 px-5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm transition-all flex items-center gap-1.5 border border-white/[0.08]"
              >
                <MicOff className="w-4 h-4" />
                <span>End Session</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
