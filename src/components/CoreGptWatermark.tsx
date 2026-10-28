import React from 'react';

interface CoreGptWatermarkProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  theme?: 'dark' | 'glass';
}

/**
 * HYNEX AI Discreet Watermark
 * Subtle corner watermark on generated images and cinematic videos.
 */
export const CoreGptWatermark: React.FC<CoreGptWatermarkProps> = ({
  className = '',
  size = 'sm',
  theme = 'glass',
}) => {
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[10px] gap-1.5'
      : size === 'lg'
      ? 'px-3 py-1.5 text-xs gap-2'
      : 'px-2.5 py-1 text-[11px] gap-1.5';

  const iconSizes =
    size === 'sm' ? 'w-3.5 h-3.5' : size === 'lg' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <div
      className={`inline-flex items-center rounded-full select-none pointer-events-none transition-all shadow-lg ${
        theme === 'glass'
          ? 'bg-black/65 backdrop-blur-md border border-white/20 text-white/95'
          : 'bg-[#171717]/90 border border-zinc-700 text-white'
      } ${sizeClasses} ${className}`}
      aria-label="HYNEX AI Watermark"
    >
      <div
        className={`${iconSizes} rounded-full overflow-hidden flex items-center justify-center bg-black/80 shrink-0 border border-white/20`}
      >
        <img
          src="/hynex-logo.jpg"
          alt="HYNEX AI Logo"
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            target.style.display = 'none';
          }}
        />
      </div>
      <span className="font-extrabold tracking-wider text-white drop-shadow-xs flex items-center gap-1">
        <span>HYNEX</span>
        <span className="text-emerald-400 font-bold">AI</span>
      </span>
    </div>
  );
};
