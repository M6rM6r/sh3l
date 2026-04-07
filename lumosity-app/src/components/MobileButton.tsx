import type { CSSProperties } from 'react';

interface MobileButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  style?: CSSProperties;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function MobileButton({ onClick, children, style, disabled, variant = 'primary' }: MobileButtonProps) {
  const baseStyle: CSSProperties = {
    padding: '14px 24px',
    border: 'none',
    borderRadius: '8px',
    fontSize: 'clamp(14px, 3vw, 18px)',
    fontWeight: 'bold',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s',
    fontFamily: 'inherit',
    minHeight: '48px',
    minWidth: '80px',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
    opacity: disabled ? 0.5 : 1,
    userSelect: 'none',
    ...style
  };

  const variantStyles: Record<string, CSSProperties> = {
    primary: {
      background: disabled ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #00ff9f 0%, #00cc7f 100%)',
      color: disabled ? '#666' : '#0a0a0f',
      boxShadow: disabled ? 'none' : '0 4px 20px rgba(0,255,159,0.3)'
    },
    secondary: {
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(0,255,159,0.3)',
      color: '#00ff9f'
    },
    danger: {
      background: 'rgba(255,0,0,0.2)',
      border: '1px solid rgba(255,0,0,0.5)',
      color: '#ff4444'
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...baseStyle, ...variantStyles[variant] }}
      onTouchStart={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(0.95)';
        }
      }}
      onTouchEnd={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'scale(1)';
        }
      }}
    >
      {children}
    </button>
  );
}


