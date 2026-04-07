import { Component } from 'react';
import type { CSSProperties } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallPromptState {
  deferredPrompt: BeforeInstallPromptEvent | null;
  visible: boolean;
}

const styles: Record<string, CSSProperties> = {
  banner: {
    position: 'fixed',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(420px, calc(100vw - 32px))',
    background: 'rgba(20, 10, 40, 0.92)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(108, 99, 255, 0.35)',
    borderRadius: 18,
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    zIndex: 9999,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
  },
  icon: {
    width: 48, height: 48, minWidth: 48, borderRadius: 12,
    background: 'linear-gradient(135deg, #6c63ff, #00d2ff)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24,
  },
  textBlock: { flex: 1, minWidth: 0 },
  title: { margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: '#fff' },
  sub: { margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.55)' },
  buttons: { display: 'flex', flexDirection: 'column', gap: 6 },
  installBtn: {
    background: 'linear-gradient(135deg, #6c63ff, #00d2ff)',
    color: '#fff', border: 'none', borderRadius: 10,
    padding: '7px 16px', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  dismissBtn: {
    background: 'transparent', color: 'rgba(255,255,255,0.4)',
    border: 'none', fontSize: 12, cursor: 'pointer', padding: 4, textAlign: 'center',
  },
};

export class InstallPrompt extends Component<Record<string, never>, InstallPromptState> {
  state: InstallPromptState = {
    deferredPrompt: null,
    visible: false,
  };

  private beforeInstallPromptHandler = (event: Event) => {
    event.preventDefault();
    this.setState({
      deferredPrompt: event as BeforeInstallPromptEvent,
      visible: true,
    });
  };

  componentDidMount() {
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    if (sessionStorage.getItem('ygy_install_dismissed')) return;
    window.addEventListener('beforeinstallprompt', this.beforeInstallPromptHandler);
  }

  componentWillUnmount() {
    window.removeEventListener('beforeinstallprompt', this.beforeInstallPromptHandler);
  }

  handleInstall = async () => {
    const { deferredPrompt } = this.state;
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      this.setState({ deferredPrompt: null, visible: false });
    }
  };

  handleDismiss = () => {
    sessionStorage.setItem('ygy_install_dismissed', '1');
    this.setState({ visible: false });
  };

  render() {
    if (!this.state.visible) return null;
    return (
      <div role="complementary" aria-label="Install app" style={styles.banner}>
        <div style={styles.icon}>🧠</div>
        <div style={styles.textBlock}>
          <p style={styles.title}>Install Ygy App</p>
          <p style={styles.sub}>Add to home screen for the best experience</p>
        </div>
        <div style={styles.buttons}>
          <button style={styles.installBtn} onClick={this.handleInstall}>Install</button>
          <button style={styles.dismissBtn} onClick={this.handleDismiss}>Not now</button>
        </div>
      </div>
    );
  }
}


