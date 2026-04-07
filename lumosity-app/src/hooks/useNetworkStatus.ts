import { useState, useEffect, useCallback } from 'react';

export interface NetworkStatus {
  isOnline: boolean;
  /** true for one render cycle after returning online */
  justReconnected: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [isOnline, setIsOnline]           = useState(navigator.onLine);
  const [justReconnected, setJustRecon]   = useState(false);

  const handleOnline = useCallback(() => {
    setIsOnline(true);
    setJustRecon(true);

    // Trigger background sync if SW + SyncManager available
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(sw => ('sync' in sw ? (sw as ServiceWorkerRegistration & { sync: { register(tag: string): Promise<void> } }).sync.register('ygy-game-sync') : Promise.resolve()))
        .catch(() => undefined);
    }

    // Clear the justReconnected flag after 3 seconds
    const t = setTimeout(() => setJustRecon(false), 3000);
    return () => clearTimeout(t);
  }, []);

  const handleOffline = useCallback(() => {
    setIsOnline(false);
    setJustRecon(false);
  }, []);

  useEffect(() => {
    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOnline, justReconnected };
}
