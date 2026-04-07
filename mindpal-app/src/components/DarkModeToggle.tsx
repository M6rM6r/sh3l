import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ToggleBtn = styled.button<{ $dark: boolean }>`
  background: ${p => p.$dark ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.15)'};
  border: 1px solid ${p => p.$dark ? '#6366f1' : 'rgba(255,255,255,0.3)'};
  border-radius: 20px;
  padding: 6px 14px;
  color: #fff;
  cursor: pointer;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
  &:hover { opacity: 0.85; }
`;

const STORAGE_KEY = 'mindpal-dark-mode';

const DarkModeToggle: React.FC = () => {
  const [dark, setDark] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false'; } catch { return true; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    try { localStorage.setItem(STORAGE_KEY, String(dark)); } catch { /* noop */ }
  }, [dark]);

  return (
    <ToggleBtn $dark={dark} onClick={() => setDark(d => !d)} title="Toggle dark mode">
      {dark ? '🌙' : '☀️'} {dark ? 'Dark' : 'Light'}
    </ToggleBtn>
  );
};

export default DarkModeToggle;
