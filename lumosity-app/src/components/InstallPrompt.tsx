import { useState, useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

const slideUp = keyframes`
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);   opacity: 1; }
`;

const Banner = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: min(420px, calc(100vw - 32px));
  background: rgba(20, 10, 40, 0.92);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(108, 99, 255, 0.35);
  border-radius: 18px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  z-index: 9999;
  animation: ${slideUp} 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
`;

const Icon = styled.div`
  width: 48px;
  height: 48px;
  min-width: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #6c63ff, #00d2ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const TextBlock = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.p`
  margin: 0 0 2px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
`;

const Sub = styled.p`
  margin: 0;
  font-size: 12px;
  color: rgba(255,255,255,0.55);
`;

const Buttons = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`;

const InstallBtn = styled.button`
  background: linear-gradient(135deg, #6c63ff, #00d2ff);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 7px 16px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: opacity 0.2s;
  &:hover { opacity: 0.88; }
`;

const DismissBtn = styled.button`
  background: transparent;
  color: rgba(255,255,255,0.4);
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 4px;
  text-align: center;
  &:hover { color: rgba(255,255,255,0.7); }
`;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already installed or dismissed this session
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('ygy_install_dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    sessionStorage.setItem('ygy_install_dismissed', '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <Banner role="complementary" aria-label="Install app">
      <Icon>🧠</Icon>
      <TextBlock>
        <Title>Install Ygy App</Title>
        <Sub>Add to home screen for the best experience</Sub>
      </TextBlock>
      <Buttons>
        <InstallBtn onClick={handleInstall}>Install</InstallBtn>
        <DismissBtn onClick={handleDismiss}>Not now</DismissBtn>
      </Buttons>
    </Banner>
  );
}
