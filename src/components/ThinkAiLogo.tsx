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

const DEFAULT_HYNEX_LOGO = '/hynex-logo.jpg';

export const HynexAiLogo: React.FC<LogoProps> = ({
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
      const stored =
        localStorage.getItem('hynex_custom_logo') ||
        localStorage.getItem('coregpt_custom_logo') ||
        localStorage.getItem('think_ai_custom_logo');
      if (stored && !stored.includes('coregpt-logo') && !stored.includes('think_ai')) return stored;
    }
    return DEFAULT_HYNEX_LOGO;
  });

  useEffect(() => {
    if (customLogoUrl) {
      setActiveLogo(customLogoUrl);
      return;
    }

    const syncLogo = () => {
      const stored =
        localStorage.getItem('hynex_custom_logo') ||
        localStorage.getItem('coregpt_custom_logo') ||
        localStorage.getItem('think_ai_custom_logo');
      if (stored && !stored.includes('coregpt-logo') && !stored.includes('think_ai')) {
        setActiveLogo(stored);
      } else {
        setActiveLogo(DEFAULT_HYNEX_LOGO);
      }
    };

    window.addEventListener('hynex_logo_change', syncLogo);
    window.addEventListener('coregpt_logo_change', syncLogo);
    window.addEventListener('think_ai_logo_change', syncLogo);
    window.addEventListener('storage', syncLogo);
    return () => {
      window.removeEventListener('hynex_logo_change', syncLogo);
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
      title={isClickable ? 'HYNEX AI Logo' : 'HYNEX AI'}
    >
      {/* Emblem container */}
      <div
        style={{ width: pixelSize, height: pixelSize }}
        className="relative shrink-0 flex items-center justify-center rounded-xl overflow-hidden bg-black border border-white/10 shadow-xs transition-transform duration-200 group-hover:scale-[1.03]"
      >
        <img
          src={activeLogo}
          alt="HYNEX AI Logo"
          className="w-full h-full select-none object-cover"
          onError={(e) => {
            const target = e.currentTarget;
            if (target.src !== DEFAULT_HYNEX_LOGO) {
              target.src = DEFAULT_HYNEX_LOGO;
            }
          }}
        />
      </div>

      {/* Brand Wordmark */}
      {showText && (
        <div className="flex items-center tracking-tight select-none">
          <span className="text-base md:text-lg font-black tracking-wider text-zinc-900 dark:text-white">
            HYNEX
          </span>
          <span className="text-base md:text-lg font-bold text-emerald-500 dark:text-emerald-400 ml-1">
            AI
          </span>
        </div>
      )}
    </div>
  );
};

// Aliases for seamless backwards compatibility
export const CoreGptLogo = HynexAiLogo;
export const ThinkAiLogo = HynexAiLogo;
export default HynexAiLogo;
