import { createGlobalStyle } from 'styled-components';

// Dark Theme Only - enforced globally
export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  :root {
    --primary-gradient: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #ffd700 100%);
    --bg-dark: #1a1a2e;
    --bg-card: #16213e;
    --bg-light: #0f3460;
    --text-primary: #ffffff;
    --text-secondary: #a0a0a0;
    --accent-orange: #ff6b35;
    --accent-gold: #ffd700;
    --success: #4ade80;
    --error: #f87171;
    --warning: #fbbf24;
    --shadow-flame: 0 0 40px rgba(255, 107, 53, 0.3);
    --shadow-card: 0 8px 32px rgba(0, 0, 0, 0.3);
    --radius-sm: 8px;
    --radius-md: 16px;
    --radius-lg: 24px;
    --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  html {
    scroll-behavior: smooth;
    font-size: 16px;
  }

  body {
    font-family: 'Noto Sans Arabic', 'Tajawal', sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    min-height: 100vh;
    color: var(--text-primary);
    line-height: 1.6;
    overflow-x: hidden;
  }

  @keyframes flame {
    0%, 100% { transform: scale(1) rotate(-2deg); }
    50% { transform: scale(1.05) rotate(2deg); }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
`;
