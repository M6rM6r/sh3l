import { useNetworkStatus } from '../hooks/useNetworkStatus';

export function OfflineIndicator() {
  const { isOnline, justReconnected } = useNetworkStatus();

  if (isOnline && !justReconnected) return null;

  return (
    <div
      aria-live="polite"
      style={{
        position:     'fixed',
        bottom:       24,
        left:         '50%',
        transform:    'translateX(-50%)',
        background:   isOnline ? '#22c55e' : '#ef4444',
        color:        '#fff',
        borderRadius: 10,
        padding:      '9px 22px',
        fontSize:     13,
        fontWeight:   800,
        display:      'flex',
        alignItems:   'center',
        gap:          8,
        zIndex:       9999,
        boxShadow:    '0 4px 24px rgba(0,0,0,0.45)',
        transition:   'background 0.3s',
        pointerEvents:'none',
        letterSpacing: '0.3px',
      }}
    >
      <span>{isOnline ? '✅' : '📡'}</span>
      {isOnline ? 'Back online — syncing…' : 'Offline — progress saves locally'}
    </div>
  );
}


