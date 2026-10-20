import React, { useState, useRef } from 'react';
import { marked } from 'marked';
import { Message } from '../types/index.ts';
import { api } from '../services/api.ts';
import { CoreGptLogo } from './ThinkAiLogo.tsx';
import {
  Sparkles,
  Copy,
  Check,
  Volume2,
  VolumeX,
  RotateCcw,
  Edit3,
  Loader2,
  Download,
  Maximize2,
  X,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

interface ChatMessageProps {
  message: Message;
  isStreaming?: boolean;
  onRegenerate?: () => void;
  onEditPrompt?: (newPrompt: string) => void;
  userDisplayName?: string;
  voiceName?: string;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  isStreaming,
  onRegenerate,
  onEditPrompt,
  voiceName = 'Kore',
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(message.content);
  const [showLightbox, setShowLightbox] = useState(false);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isUser = message.role === 'user';

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlayTTS = async () => {
    if (isPlayingAudio && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
      return;
    }

    if (audioRef.current && audioRef.current.src) {
      audioRef.current.play();
      setIsPlayingAudio(true);
      return;
    }

    setAudioLoading(true);
    try {
      const res = await api.voice.tts({
        text: message.content,
        voice: voiceName,
      });

      const audioUrl = `data:audio/wav;base64,${res.audioBase64}`;
      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => {
        setIsPlayingAudio(false);
        setAudioLoading(false);
      };

      await audio.play();
      setIsPlayingAudio(true);
    } catch (err) {
      console.warn('Speech playback failed:', err);
    } finally {
      setAudioLoading(false);
    }
  };

  const handleSaveEdit = () => {
    if (editedText.trim() && editedText !== message.content && onEditPrompt) {
      onEditPrompt(editedText.trim());
    }
    setIsEditing(false);
  };

  const handleDownloadImage = () => {
    if (!message.image_url) return;
    const a = document.createElement('a');
    a.href = message.image_url;
    a.download = `coregpt-image-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const renderMarkdown = (content: string) => {
    try {
      const cleaned = message.image_url
        ? content.replace(/!\[.*?\]\(.*?\)/g, '').trim()
        : content;
      return { __html: marked.parse(cleaned, { gfm: true, breaks: true }) as string };
    } catch {
      return { __html: content };
    }
  };

  // ChatGPT-style User Message: Right-aligned pill bubble
  if (isUser) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 py-2 flex justify-end group">
        {isEditing ? (
          <div className="w-full max-w-xl space-y-2 bg-[#f4f4f4] dark:bg-[#2f2f2f] p-4 rounded-2xl border border-zinc-200 dark:border-white/10">
            <textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="w-full p-2.5 text-sm rounded-xl border border-zinc-300 dark:border-white/20 bg-white dark:bg-[#212121] text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400"
              rows={3}
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity"
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="relative flex items-center gap-2 max-w-[85%] sm:max-w-[75%]">
            {onEditPrompt && (
              <button
                onClick={() => setIsEditing(true)}
                className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-zinc-200/70 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-all shrink-0"
                title="Edit message"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="bg-[#f4f4f4] dark:bg-[#2f2f2f] text-zinc-900 dark:text-zinc-100 rounded-[22px] px-4.5 py-2.5 text-sm leading-relaxed font-normal shadow-2xs break-words">
              {message.content}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ChatGPT-style Assistant Message: Left-aligned with CoreGPT Avatar and Actions
  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-4 flex items-start gap-4 group">
      {/* CoreGPT Avatar (Black & White OpenAI-style Emblem) */}
      <div className="shrink-0 pt-0.5">
        <CoreGptLogo size={30} />
      </div>

      {/* Message Body & Actions */}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-semibold text-zinc-900 dark:text-white">
            CoreGPT
          </span>
          {message.model && (
            <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
              · {message.model}
            </span>
          )}
        </div>

        {/* Generated Image Showcase Card if any */}
        {message.image_url && (
          <div className="my-3 max-w-lg rounded-2xl overflow-hidden border border-zinc-200 dark:border-white/10 bg-white dark:bg-[#171717] shadow-sm group/img relative">
            <div className="relative overflow-hidden bg-black/10">
              <img
                src={message.image_url}
                alt="Generated with CoreGPT"
                className="w-full h-auto object-cover max-h-[440px] cursor-pointer transition-transform duration-300 group-hover/img:scale-[1.01]"
                referrerPolicy="no-referrer"
                onClick={() => setShowLightbox(true)}
              />
              <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 opacity-0 group-hover/img:opacity-100 transition-opacity bg-black/75 backdrop-blur-md px-2 py-1 rounded-lg text-white text-xs">
                <button
                  onClick={handleDownloadImage}
                  className="hover:text-zinc-200 p-0.5 transition-colors"
                  title="Download image"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowLightbox(true)}
                  className="hover:text-zinc-200 p-0.5 transition-colors"
                  title="Zoom full resolution"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] text-zinc-200 font-medium">
                <Sparkles className="w-3 h-3 text-zinc-300" />
                <span>CoreGPT Visual Synthesis</span>
              </div>
            </div>
          </div>
        )}

        {/* Prose Markdown Content */}
        <div className="text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
          <div
            className="prose-chat"
            dangerouslySetInnerHTML={renderMarkdown(message.content)}
          />

          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-zinc-900 dark:bg-white animate-pulse align-middle rounded-xs" />
          )}
        </div>

        {/* ChatGPT Bottom Action Toolbar: Copy, Voice, Like, Dislike, Regenerate */}
        <div className="flex items-center gap-1 pt-1 opacity-70 group-hover:opacity-100 transition-opacity text-zinc-400 dark:text-zinc-500">
          <button
            onClick={handleCopy}
            className="p-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
            title="Copy response"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>

          <button
            onClick={handlePlayTTS}
            disabled={audioLoading}
            className="p-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            title={isPlayingAudio ? 'Stop speaking' : 'Read aloud with CoreGPT Voice'}
          >
            {audioLoading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-500" />
            ) : isPlayingAudio ? (
              <VolumeX className="w-3.5 h-3.5 text-zinc-800 dark:text-zinc-200 animate-pulse" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Feedback Thumbs */}
          <button
            onClick={() => setFeedback(feedback === 'up' ? null : 'up')}
            className={`p-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors ${
              feedback === 'up' ? 'text-emerald-500 font-bold' : ''
            }`}
            title="Good response"
          >
            <ThumbsUp className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setFeedback(feedback === 'down' ? null : 'down')}
            className={`p-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors ${
              feedback === 'down' ? 'text-red-500 font-bold' : ''
            }`}
            title="Poor response"
          >
            <ThumbsDown className="w-3.5 h-3.5" />
          </button>

          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-1.5 rounded-lg hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/10 transition-colors"
              title="Regenerate response"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Lightbox Modal for zoom */}
      {showLightbox && message.image_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
          onClick={() => setShowLightbox(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute -top-10 right-0 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={message.image_url}
              alt="Generated visual full size"
              className="max-h-[78vh] w-auto rounded-xl object-contain shadow-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleDownloadImage}
                className="py-1.5 px-3 rounded-lg bg-white text-black dark:bg-white dark:text-black hover:opacity-90 text-xs font-semibold flex items-center gap-1.5 shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Ultra HD Image</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
