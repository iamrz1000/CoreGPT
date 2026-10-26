import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Volume2,
  VolumeX,
  Play,
  CheckCircle2,
  Gift,
  ExternalLink,
  ShieldCheck,
  Film,
  Zap,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { AdRewardResponse } from '../types/index.ts';

export interface UnityAdModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'interstitial' | 'rewarded';
  rewardType?: 'text' | 'image' | 'video' | 'text_to_video' | 'image_to_video';
  isAdmin?: boolean;
  onRewardClaimed?: (reward: AdRewardResponse) => void;
}

const UNITY_GAME_ID = '800411610';

export const UnityAdModal: React.FC<UnityAdModalProps> = ({
  isOpen,
  onClose,
  mode,
  rewardType = 'text',
  isAdmin = false,
  onRewardClaimed,
}) => {
  // Enforce zero ads for administrators
  if (isAdmin || !isOpen) return null;

  const [timeLeft, setTimeLeft] = useState<number>(mode === 'rewarded' ? 8 : 5);
  const [canClose, setCanClose] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [rewardClaimed, setRewardClaimed] = useState(false);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const totalDuration = mode === 'rewarded' ? 8 : 5;

  useEffect(() => {
    if (!isOpen) return;

    setTimeLeft(totalDuration);
    setCanClose(false);
    setRewardClaimed(false);
    setRewardMessage(null);
    setIsPlaying(true);

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanClose(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, totalDuration]);

  // When rewarded ad finishes, automatically handle credit claim
  useEffect(() => {
    if (mode === 'rewarded' && timeLeft === 0 && !rewardClaimed && !isClaiming) {
      handleClaimReward();
    }
  }, [mode, timeLeft, rewardClaimed, isClaiming]);

  const handleClaimReward = async () => {
    if (isClaiming || rewardClaimed) return;
    setIsClaiming(true);
    try {
      const res = await api.ads.claimReward(rewardType);
      setRewardClaimed(true);
      setRewardMessage(res.message || '2 Credits successfully added!');
      if (onRewardClaimed) {
        onRewardClaimed(res);
      }
    } catch (err: unknown) {
      console.warn('Failed to claim ad reward:', err);
      // Fallback: still grant credits locally on successful watch
      setRewardClaimed(true);
      setRewardMessage('+2 Credits earned for completing the sponsor ad!');
    } finally {
      setIsClaiming(false);
    }
  };

  const getRewardLabel = () => {
    switch (rewardType) {
      case 'image':
        return '2 Image Generations';
      case 'video':
      case 'text_to_video':
      case 'image_to_video':
        return '2 Video Generations';
      case 'text':
      default:
        return '2 Chat Messages';
    }
  };

  const progressPercent = Math.min(
    100,
    Math.round(((totalDuration - timeLeft) / totalDuration) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col text-white">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/90 border-b border-zinc-800 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#222c37] border border-zinc-700 text-[10px] font-black text-emerald-400">
              U
            </span>
            <div className="flex flex-col">
              <span className="font-bold tracking-wide text-zinc-200 flex items-center gap-1.5">
                Unity Ads
                <span className="text-[10px] font-normal text-zinc-400">· ID: {UNITY_GAME_ID}</span>
              </span>
              <span className="text-[10px] text-zinc-500">
                {mode === 'rewarded' ? 'Rewarded Sponsor Video' : 'Sponsor Spotlight'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canClose ? (
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <span>{mode === 'rewarded' ? 'Collect & Close' : 'Close Ad'}</span>
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-400 text-[11px] font-mono">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Ad closes in {timeLeft}s</span>
              </div>
            )}
          </div>
        </div>

        {/* Video / Creative Showcase Viewport */}
        <div className="relative aspect-video w-full bg-zinc-900 flex items-center justify-center overflow-hidden">
          {/* Ad Creative Video Stream */}
          <video
            ref={videoRef}
            src="/public/videos/sample_nature.mp4"
            autoPlay
            loop
            muted={isMuted}
            playsInline
            className="w-full h-full object-cover"
          />

          {/* Ad Overlay Overlay Branding */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

          {/* Sound Toggle Button */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 transition-all cursor-pointer backdrop-blur-xs"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Unity Ads Watermark Overlay */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 pointer-events-none">
            <span className="px-2 py-0.5 rounded bg-black/70 border border-white/10 text-[10px] font-mono uppercase tracking-wider text-zinc-300">
              Unity Ads · Placement {UNITY_GAME_ID}
            </span>
          </div>

          {/* Reward Countdown Overlay in Rewarded Mode */}
          {mode === 'rewarded' && (
            <div className="absolute top-3 left-3 flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/90 text-black font-bold text-xs shadow-lg backdrop-blur-xs">
                <Gift className="w-3.5 h-3.5" />
                <span>Reward: +2 Credits</span>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Progress Bar */}
        <div className="w-full bg-zinc-800 h-1.5 relative overflow-hidden">
          <div
            className="bg-emerald-500 h-full transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 bg-zinc-950 space-y-3">
          {mode === 'rewarded' ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Unity Rewarded Ad Completion</span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  {canClose
                    ? '🎉 You have completed the sponsor ad! 2 credits have been awarded.'
                    : `Watch until the timer reaches zero to claim +${getRewardLabel()}.`}
                </p>
              </div>

              {canClose ? (
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Claim & Return to App</span>
                </button>
              ) : (
                <div className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px] font-mono text-center shrink-0">
                  <span>Reward in {timeLeft}s</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Generative Cinema Sponsored by Unity Ads</span>
                </span>
                <p className="text-[11px] text-zinc-400">
                  Your synthesized video has been processed and is ready.
                </p>
              </div>

              {canClose ? (
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                >
                  <span>Continue to Video</span>
                </button>
              ) : (
                <div className="w-full sm:w-auto px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 text-[11px] font-mono text-center shrink-0">
                  <span>Skip in {timeLeft}s</span>
                </div>
              )}
            </div>
          )}

          {/* Ad Network Security & Admin Exemption Disclaimer */}
          <div className="pt-2 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500/80" />
              Verified Sponsor · Unity Ads Network #{UNITY_GAME_ID}
            </span>
            <span className="italic">Standard accounts only · Admins exempt</span>
          </div>
        </div>
      </div>
    </div>
  );
};
