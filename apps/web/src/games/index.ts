// Unified Games Index for Ygy Platform
// Combines games from Sho3lah (Arabic) and MindPal (English)

export { default as MemoryGame } from './MemoryGame';
export { default as FocusGame } from './FocusGame';
export { default as LanguageGame } from './LanguageGame';
export { default as LogicGame } from './LogicGame';
export { default as MathGame } from './MathGame';
export { default as SpeedGame } from './SpeedGame';
export { default as AttentionGame } from './AttentionGame';
export { default as VoiceMathGame } from './VoiceMathGame';
export { default as VoiceSpellingGame } from './VoiceSpellingGame';

// Game metadata for unified library
export const gamesMeta = {
  memory: {
    id: 'memory',
    name: 'Memory Match',
    nameAr: 'مطابقة الذاكرة',
    category: 'memory',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🧠',
  },
  focus: {
    id: 'focus',
    name: 'Focus Challenge',
    nameAr: 'تحدي التركيز',
    category: 'attention',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🎯',
  },
  language: {
    id: 'language',
    name: 'Language Quiz',
    nameAr: 'اختبار اللغة',
    category: 'language',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🗣️',
  },
  logic: {
    id: 'logic',
    name: 'Logic Puzzle',
    nameAr: 'لغز المنطق',
    category: 'problem_solving',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🧩',
  },
  math: {
    id: 'math',
    name: 'Math Challenge',
    nameAr: 'تحدي الرياضيات',
    category: 'problem_solving',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🔢',
  },
  speed: {
    id: 'speed',
    name: 'Speed Match',
    nameAr: 'مطابقة السرعة',
    category: 'speed',
    difficulty: [1, 2, 3, 4, 5],
    icon: '⚡',
  },
  attention: {
    id: 'attention',
    name: 'Attention Game',
    nameAr: 'لعبة الانتباه',
    category: 'attention',
    difficulty: [1, 2, 3, 4, 5],
    icon: '👁️',
  },
  voiceMath: {
    id: 'voiceMath',
    name: 'Voice Math',
    nameAr: 'الرياضيات الصوتية',
    category: 'problem_solving',
    difficulty: [1, 2, 3],
    icon: '🎤',
    requiresMic: true,
  },
  voiceSpelling: {
    id: 'voiceSpelling',
    name: 'Voice Spelling',
    nameAr: 'التهجئة الصوتية',
    category: 'language',
    difficulty: [1, 2, 3],
    icon: '🎙️',
    requiresMic: true,
  },
};

export type GameType = keyof typeof gamesMeta;


