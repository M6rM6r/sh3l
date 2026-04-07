import { useState, useEffect, useCallback, useRef } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [visible, setVisible] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('ygy_install_dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      deferredPrompt.current = null;
      setVisible(false);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem('ygy_install_dismissed', '1');
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div role="complementary" aria-label="Install app" className="install-banner">
      <div className="install-icon">🧠</div>
      <div className="install-text">
        <p className="install-title">Install Ygy App</p>
        <p className="install-sub">Add to home screen for the best experience</p>
      </div>
      <div className="install-buttons">
        <button className="install-btn" onClick={handleInstall}>Install</button>
        <button className="install-dismiss" onClick={handleDismiss}>Not now</button>
      </div>
    </div>
  );
}


