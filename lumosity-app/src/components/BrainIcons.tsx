import React from 'react';

interface BrainIconProps {
  size?: number;
  className?: string;
  animated?: boolean;
}

export const BrainIcon: React.FC<BrainIconProps> = ({
  size = 24,
  className = '',
  animated = false
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'brain-pulse' : ''}`}
    >
      {/* Brain outline */}
      <path
        d="M12 2C8.13 2 5 5.13 5 9c0 1.74.58 3.35 1.56 4.65L7 15.5c.55.55 1.45.55 2 0l.44-.44c.55-.55.55-1.45 0-2l-.94-.94c.33-.67.52-1.41.52-2.12 0-2.76 2.24-5 5-5s5 2.24 5 5c0 .71-.19 1.45-.52 2.12l.94.94c.55.55 1.45.55 2 0l.44.44c.55.55 1.45.55 2 0l1.44-1.85C18.42 12.35 19 10.74 19 9c0-3.87-3.13-7-7-7z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Neural connections */}
      <path
        d="M9 9c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M7 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M17 12c0-1.1.9-2 2-2s2 .9 2 2-.9 2-2 2-2-.9-2-2z"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
      />
      {/* Connection lines */}
      <path
        d="M11 11l-2 1M13 11l2 1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
};

export const BrainWavesIcon: React.FC<BrainIconProps> = ({
  size = 24,
  className = '',
  animated = false
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'wave-animation' : ''}`}
    >
      {/* Brain waves */}
      <path
        d="M2 12c2-2 4-1 6 0s4 1 6 0 4-1 6 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M2 16c2-1 4-0.5 6 0s4 0.5 6 0 4-0.5 6 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
      <path
        d="M2 8c2-1 4-0.5 6 0s4 0.5 6 0 4-0.5 6 0"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity="0.7"
      />
    </svg>
  );
};

export const CognitiveIcon: React.FC<BrainIconProps> = ({
  size = 24,
  className = '',
  animated = false
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'cognitive-glow' : ''}`}
    >
      {/* Cognitive network */}
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 4v16M4 12h16" stroke="currentColor" strokeWidth="1" />
      <circle cx="8" cy="8" r="1.5" fill="currentColor" />
      <circle cx="16" cy="8" r="1.5" fill="currentColor" />
      <circle cx="8" cy="16" r="1.5" fill="currentColor" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" />
      {/* Connection lines */}
      <path d="M8 8l4 4M16 8l-4 4M8 16l4-4M16 16l-4-4" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
};

export const MemoryIcon: React.FC<BrainIconProps> = ({
  size = 24,
  className = '',
  animated = false
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'memory-flash' : ''}`}
    >
      {/* Memory chip */}
      <rect x="4" y="6" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
      <rect x="6" y="8" width="12" height="8" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
      {/* Memory cells */}
      <rect x="7" y="9" width="2" height="2" fill="currentColor" />
      <rect x="10" y="9" width="2" height="2" fill="currentColor" />
      <rect x="13" y="9" width="2" height="2" fill="currentColor" />
      <rect x="16" y="9" width="2" height="2" fill="currentColor" />
      <rect x="7" y="12" width="2" height="2" fill="currentColor" />
      <rect x="10" y="12" width="2" height="2" fill="currentColor" />
      <rect x="13" y="12" width="2" height="2" fill="currentColor" />
      <rect x="16" y="12" width="2" height="2" fill="currentColor" />
    </svg>
  );
};

export const FocusIcon: React.FC<BrainIconProps> = ({
  size = 24,
  className = '',
  animated = false
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'focus-target' : ''}`}
    >
      {/* Target rings */}
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1" fill="currentColor" />
      {/* Crosshairs */}
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
};

export const SpeedIcon: React.FC<BrainIconProps> = ({
  size = 24,
  className = '',
  animated = false
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animated ? 'speed-dash' : ''}`}
    >
      {/* Speedometer */}
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <path d="M12 4v8l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      {/* Speed lines */}
      <path d="M8 6l1 1M16 6l-1 1M6 12h2M16 12h2" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
};

