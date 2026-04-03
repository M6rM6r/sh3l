import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English translations (from MindPal)
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
  dashboard: {
    welcome: 'Welcome back!',
    todaysGoal: "Today's Goal",
    gamesCompleted: 'Games Completed',
    currentStreak: 'Current Streak',
    totalScore: 'Total Score',
    iqScore: 'IQ Score',
    recommendedGames: 'Recommended for You',
    startSession: 'Start Training Session',
  },
  analytics: {
    title: 'Your Progress',
    weeklyProgress: 'Weekly Progress',
    cognitiveProfile: 'Cognitive Profile',
    skillGaps: 'Areas to Improve',
    improvementTrend: 'Improvement Trend',
    performanceByArea: 'Performance by Area',
  },
  onboarding: {
    step1: 'Welcome to Ygy',
    step2: 'Train Your Brain',
    step3: 'Track Progress',
    description1: 'Scientifically designed games to enhance your cognitive abilities',
    description2: 'Daily training sessions adapted to your skill level',
    description3: 'Detailed analytics to track your improvement over time',
    getStarted: 'Get Started',
  },
};

// Arabic translations (from Sho3lah)
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
  dashboard: {
    welcome: 'أهلاً بعودتك!',
    todaysGoal: 'هدف اليوم',
    gamesCompleted: 'الألعاب المكتملة',
    currentStreak: 'السلسلة الحالية',
    totalScore: 'النقاط الإجمالية',
    iqScore: 'نسبة الذكاء',
    recommendedGames: 'موصى بها لك',
    startSession: 'ابدأ جلسة التدريب',
  },
  analytics: {
    title: 'تقدمك',
    weeklyProgress: 'التقدم الأسبوعي',
    cognitiveProfile: 'الملف الإدراكي',
    skillGaps: 'مجالات للتحسين',
    improvementTrend: 'اتجاه التحسن',
    performanceByArea: 'الأداء حسب المجال',
  },
  onboarding: {
    step1: 'مرحباً بك في ياجي',
    step2: 'تدريب دماغك',
    step3: 'تتبع التقدم',
    description1: 'ألعاب مصممة علمياً لتعزيز قدراتك الإدراكية',
    description2: 'جلسات تدريب يومية متكيفة مع مستوى مهاراتك',
    description3: 'تحليلات مفصلة لتتبع تحسنك مع مرور الوقت',
    getStarted: 'ابدأ الآن',
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
