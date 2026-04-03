import React from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setLanguage } from '../store/settingsSlice';

const SwitcherContainer = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
  display: flex;
  gap: 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
`;

const LangButton = styled.button<{ $active: boolean }>`
  background: ${props => props.$active ? 'rgba(255, 107, 53, 0.9)' : 'transparent'};
  color: ${props => props.$active ? 'white' : 'rgba(255, 255, 255, 0.7)'};
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: all 0.3s ease;
  
  &:hover {
    background: ${props => props.$active ? 'rgba(255, 107, 53, 1)' : 'rgba(255, 255, 255, 0.2)'};
    color: white;
  }
`;

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const currentLanguage = useAppSelector((state) => state.settings.language);

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    dispatch(setLanguage(lang));
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  return (
    <SwitcherContainer>
      <LangButton
        $active={currentLanguage === 'en'}
        onClick={() => handleLanguageChange('en')}
      >
        EN
      </LangButton>
      <LangButton
        $active={currentLanguage === 'ar'}
        onClick={() => handleLanguageChange('ar')}
      >
        عربي
      </LangButton>
    </SwitcherContainer>
  );
};

export default LanguageSwitcher;
