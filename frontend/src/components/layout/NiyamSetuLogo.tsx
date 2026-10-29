import React from 'react';

interface NiyamSetuLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

export const NiyamSetuLogo: React.FC<NiyamSetuLogoProps> = ({
  size = 28,
  className = '',
  showText = false,
}) => {
  return (
    <div
      className={`niyamsetu-brand-container ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.625rem' }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        {/* Shield outline */}
        <path
          d="M16 3L5 7.5V14.5C5 21.2 9.7 27.4 16 29C22.3 27.4 27 21.2 27 14.5V7.5L16 3Z"
          fill="url(#niyamsetu-grad-bg)"
          stroke="url(#niyamsetu-grad-stroke)"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />

        {/* Arch Bridge ('Setu') motif spanning across */}
        <path
          d="M9 19.5C11 16.5 13.2 15 16 15C18.8 15 21 16.5 23 19.5"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Bridge pillars */}
        <path
          d="M12.5 17.5V22.5M16 15.5V23.5M19.5 17.5V22.5"
          stroke="#FFFFFF"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />

        {/* Central Compliance Check Star */}
        <circle cx="16" cy="10.5" r="2.2" fill="#60A5FA" />
        <path
          d="M14.8 10.5L15.6 11.3L17.2 9.7"
          stroke="#FFFFFF"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <defs>
          <linearGradient
            id="niyamsetu-grad-bg"
            x1="5"
            y1="3"
            x2="27"
            y2="29"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#1E3A8A" />
            <stop offset="1" stopColor="#0F172A" />
          </linearGradient>
          <linearGradient
            id="niyamsetu-grad-stroke"
            x1="16"
            y1="3"
            x2="16"
            y2="29"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
        </defs>
      </svg>

      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span
            style={{
              fontSize: '1.125rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-main, #0f172a)',
            }}
          >
            NiyamSetu
          </span>
          <span
            style={{
              fontSize: '0.6875rem',
              fontWeight: 500,
              color: 'var(--color-text-muted, #64748b)',
              letterSpacing: '0.01em',
            }}
          >
            Approval &amp; Compliance Management System
          </span>
        </div>
      )}
    </div>
  );
};
