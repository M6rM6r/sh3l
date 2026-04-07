import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations
const enTranslations = {
  common: {
    appName: 'Ygy Brain Training',
    tagline: 'Enhance Your Cognitive Abilities',
    start: 'Start Training',
    dashboard: 'Dashboard',
    analytics: 'Analytics',
    games: 'Games',
    profile: 'Profile',
    settings: 'Settings',
    language: 'Language',
    english: 'English',
    arabic: 'Arabic',
  },
  games: {
    memory: 'Memory Match',
    focus: 'Focus Challenge',
    language: 'Language Quiz',
    logic: 'Logic Puzzle',
    math: 'Math Challenge',
    speed: 'Speed Match',
    attention: 'Attention Game',
    voiceMath: 'Voice Math',
    voiceSpelling: 'Voice Spelling',
  },
  cognitiveAreas: {
    memory: 'Memory',
    attention: 'Attention',
    speed: 'Speed',
    flexibility: 'Flexibility',
    problemSolving: 'Problem Solving',
  },
};

// Arabic translations
const arTranslations = {
  common: {
    appName: 'ياجي - تدريب الدماغ',
    tagline: 'طور قدراتك الإدراكية',
    start: 'ابدأ التدريب',
    dashboard: 'لوحة التحكم',
    analytics: 'التحليلات',
    games: 'الألعاب',
    profile: 'الملف الشخصي',
    settings: 'الإعدادات',
    language: 'اللغة',
    english: 'الإنجليزية',
    arabic: 'العربية',
  },
  games: {
    memory: 'مطابقة الذاكرة',
    focus: 'تحدي التركيز',
    language: 'اختبار اللغة',
    logic: 'لغز المنطق',
    math: 'تحدي الرياضيات',
    speed: 'مطابقة السرعة',
    attention: 'لعبة الانتباه',
    voiceMath: 'الرياضيات الصوتية',
    voiceSpelling: 'التهجئة الصوتية',
  },
  cognitiveAreas: {
    memory: 'الذاكرة',
    attention: 'الانتباه',
    speed: 'السرعة',
    flexibility: 'المرونة',
    problemSolving: 'حل المشكلات',
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      ar: { translation: arTranslations },
    },
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;


