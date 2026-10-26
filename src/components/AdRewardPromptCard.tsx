import React from 'react';
import { Gift, Sparkles, Play, ShieldAlert, ArrowRight } from 'lucide-react';

export interface AdRewardPromptCardProps {
  type: 'text' | 'image' | 'video';
  onWatchAd: () => void;
  isAdmin?: boolean;
  className?: string;
}

export const AdRewardPromptCard: React.FC<AdRewardPromptCardProps> = ({
  type,
  onWatchAd,
  isAdmin = false,
  className = '',
}) => {
  // Never show ad cards for administrators
  if (isAdmin) return null;

  const getDetails = () => {
    switch (type) {
      case 'image':
        return {
          title: 'Daily Image Limit Reached',
          description: 'Your standard daily image quota is complete. Watch 1 short Unity sponsor ad to unlock +2 image generations immediately.',
          badge: '+2 Image Credits',
          cta: 'Watch 1 Ad for +2 Images',
        };
      case 'video':
        return {
          title: 'Daily Video Generation Limit Reached',
          description: 'You have reached today\'s video synthesis allowance. Watch 1 Unity sponsor ad to unlock +2 video generations immediately.',
          badge: '+2 Video Credits',
          cta: 'Watch 1 Ad for +2 Videos',
        };
      case 'text':
      default:
        return {
          title: 'Daily Message Limit Reached',
          description: 'You have used all standard conversation credits for today. Watch 1 short Unity sponsor ad to get +2 message credits right now.',
          badge: '+2 Chat Credits',
          cta: 'Watch 1 Ad for +2 Messages',
        };
    }
  };

  const details = getDetails();

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-zinc-900/90 to-zinc-950 p-4 sm:p-5 text-white shadow-xl ${className}`}
    >
      {/* Decorative accent element */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-emerald-500/15 blur-2xl pointer-events-none" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Gift className="w-3 h-3" />
              <span>{details.badge}</span>
            </span>
            <span className="text-[11px] font-mono text-zinc-400">
              Unity Ads · ID: 800411610
            </span>
          </div>

          <h3 className="text-sm sm:text-base font-bold text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <span>{details.title}</span>
          </h3>

          <p className="text-xs text-zinc-300 leading-relaxed">
            {details.description}
          </p>
        </div>

        <div className="shrink-0">
          <button
            type="button"
            onClick={onWatchAd}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-emerald-500/25 active:scale-95 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{details.cta}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
