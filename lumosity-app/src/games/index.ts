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
export { default as VoiceMemoryGame } from './VoiceMemoryGame';
export { default as VoiceCommandGame } from './VoiceCommandGame';

// Brain Hub games (from brain-hub import)
export { BubbleSort } from '../components/games/BubbleSort';
export { CodeBreaker } from '../components/games/CodeBreaker';
export { ColorHarmony } from '../components/games/ColorHarmony';
export { LogicGrid } from '../components/games/LogicGrid';
export { MathMarathon } from '../components/games/MathMarathon';
export { MazeRunner } from '../components/games/MazeRunner';
export { MemoryMatch } from '../components/games/MemoryMatch';
export { NumberSequence } from '../components/games/NumberSequence';
export { PatternRecognition } from '../components/games/PatternRecognition';
export { PipeConnection } from '../components/games/PipeConnection';
export { QuickReflexes } from '../components/games/QuickReflexes';
export { RhythmBlocks } from '../components/games/RhythmBlocks';
export { ShapeShifter } from '../components/games/ShapeShifter';
export { TowerOfHanoi } from '../components/games/TowerOfHanoi';
export { WordScramble } from '../components/games/WordScramble';

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
  voiceMemory: {
    id: 'voiceMemory',
    name: 'Voice Memory',
    nameAr: 'الذاكرة الصوتية',
    category: 'memory',
    difficulty: [1, 2, 3, 4],
    icon: '🎧',
    requiresMic: true,
  },
  voiceCommand: {
    id: 'voiceCommand',
    name: 'Voice Commands',
    nameAr: 'الأوامر الصوتية',
    category: 'attention',
    difficulty: [1, 2, 3],
    icon: '🗣️',
    requiresMic: true,
  },
};

export type GameType = keyof typeof gamesMeta;
