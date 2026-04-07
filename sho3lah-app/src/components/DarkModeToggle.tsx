import React, { useState, useEffect } from 'react';
import styled from 'styled-components';

const ToggleBtn = styled.button<{ $dark: boolean }>`
  background: ${p => p.$dark ? 'rgba(255,215,0,0.15)' : 'rgba(255,255,255,0.15)'};
  border: 1px solid ${p => p.$dark ? '#ffd700' : 'rgba(255,255,255,0.3)'};
  border-radius: 20px;
  padding: 6px 14px;
  color: ${p => p.$dark ? '#ffd700' : '#fff'};
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.3s;
  &:hover { opacity: 0.85; }
`;

const STORAGE_KEY = 'sho3lah-dark-mode';

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
      {dark ? '🌙' : '☀️'} {dark ? 'مظلم' : 'فاتح'}
    </ToggleBtn>
  );
};

export default DarkModeToggle;
