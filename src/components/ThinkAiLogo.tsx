import React, { useState, useEffect } from 'react';

export interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;
  showText?: boolean;
  className?: string;
  variant?: 'full' | 'icon-only';
  customLogoUrl?: string | null;
  onClick?: () => void;
  clickable?: boolean;
}

const DEFAULT_COREGPT_LOGO = '/coregpt-logo.png';

export const CoreGptLogo: React.FC<LogoProps> = ({
  size = 'md',
  showText = false,
  className = '',
  customLogoUrl,
  onClick,
  clickable = false,
}) => {
  const [activeLogo, setActiveLogo] = useState<string>(() => {
    if (customLogoUrl) return customLogoUrl;
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('coregpt_custom_logo') || localStorage.getItem('think_ai_custom_logo');
      if (stored) return stored;
    }
    return DEFAULT_COREGPT_LOGO;
  });

  useEffect(() => {
    if (customLogoUrl) {
      setActiveLogo(customLogoUrl);
      return;
    }

    const syncLogo = () => {
      const stored = localStorage.getItem('coregpt_custom_logo') || localStorage.getItem('think_ai_custom_logo');
      setActiveLogo(stored || DEFAULT_COREGPT_LOGO);
    };

    window.addEventListener('coregpt_logo_change', syncLogo);
    window.addEventListener('think_ai_logo_change', syncLogo);
    window.addEventListener('storage', syncLogo);
    return () => {
      window.removeEventListener('coregpt_logo_change', syncLogo);
      window.removeEventListener('think_ai_logo_change', syncLogo);
      window.removeEventListener('storage', syncLogo);
    };
  }, [customLogoUrl]);

  let pixelSize = 36;
  if (typeof size === 'number') {
    pixelSize = size;
  } else {
    switch (size) {
      case 'xs':
        pixelSize = 20;
        break;
      case 'sm':
        pixelSize = 28;
        break;
      case 'md':
        pixelSize = 36;
        break;
      case 'lg':
        pixelSize = 52;
        break;
      case 'xl':
        pixelSize = 72;
        break;
    }
  }

  const isClickable = clickable || !!onClick;

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={`inline-flex items-center gap-2.5 ${isClickable ? 'cursor-pointer select-none group' : ''} ${className}`}
      title={isClickable ? 'CoreGPT Logo' : 'CoreGPT'}
    >
      {/* Emblem container */}
      <div
        style={{ width: pixelSize, height: pixelSize }}
        className="relative shrink-0 flex items-center justify-center rounded-xl overflow-hidden bg-black border border-white/10 shadow-xs transition-transform duration-200 group-hover:scale-[1.03]"
      >
        <img
          src={activeLogo}
          alt="CoreGPT Logo"
          className={`w-full h-full select-none ${
            activeLogo === DEFAULT_COREGPT_LOGO && pixelSize <= 48
              ? 'object-cover object-[center_32%] scale-[1.28]'
              : 'object-contain'
          }`}
          onError={(e) => {
            // Fallback to default local asset if external storage path fails
            const target = e.currentTarget;
            if (target.src !== DEFAULT_COREGPT_LOGO) {
              target.src = DEFAULT_COREGPT_LOGO;
            }
          }}
        />
      </div>

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex items-center tracking-tight font-bold select-none text-black dark:text-white">
          <span className="text-base md:text-lg tracking-tight">Core</span>
          <span className="text-base md:text-lg font-light text-zinc-500 dark:text-zinc-400 ml-0.5">GPT</span>
        </div>
      )}
    </div>
  );
};

// Backwards-compatible alias so existing imports don't break
export const ThinkAiLogo = CoreGptLogo;
export default CoreGptLogo;
