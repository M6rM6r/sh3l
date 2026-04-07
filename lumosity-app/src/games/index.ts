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

// Spatial Reasoning Games (New)
export { default as MentalRotation3D } from '../components/games/MentalRotation3D';
export { default as MapNavigator } from '../components/games/MapNavigator';
export { default as PerspectiveShift } from '../components/games/PerspectiveShift';

// Executive Function Games (New)
export { default as DualNBack } from '../components/games/DualNBack';
export { default as StroopChallenge } from '../components/games/StroopChallenge';
export { default as TaskSwitcher } from '../components/games/TaskSwitcher';
export { default as TowerPlanner } from '../components/games/TowerPlanner';

// INTJ Strategic Games (New)
export { default as LogicGridPuzzle } from '../components/games/LogicGridPuzzle';
export { default as ChessTactics } from '../components/games/ChessTactics';
export { default as PatternSequence } from '../components/games/PatternSequence';
export { default as ResourceManagement } from '../components/games/ResourceManagement';
export { default as DeductionChain } from '../components/games/DeductionChain';

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
  mentalRotation3D: {
    id: 'mentalRotation3D',
    name: 'Mental Rotation 3D',
    nameAr: 'التدوير الذهني ثلاثي الأبعاد',
    category: 'spatial',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🔄',
    description: 'Mentally rotate 3D objects to match targets',
  },
  mapNavigator: {
    id: 'mapNavigator',
    name: 'Map Navigator',
    nameAr: 'ملاح الخريطة',
    category: 'spatial',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🗺️',
    description: 'Memorize and navigate routes on city maps',
  },
  perspectiveShift: {
    id: 'perspectiveShift',
    name: 'Perspective Shift',
    nameAr: 'تغيير المنظور',
    category: 'spatial',
    difficulty: [1, 2, 3, 4, 5],
    icon: '👁️',
    description: 'Identify how scenes look from different angles',
  },
  dualNBack: {
    id: 'dualNBack',
    name: 'Dual N-Back',
    nameAr: 'التدريب المزدوج N-Back',
    category: 'executive',
    difficulty: [1, 2, 3, 4, 5, 6],
    icon: '🧠',
    description: 'Gold standard working memory training with visual and auditory stimuli',
  },
  stroopChallenge: {
    id: 'stroopChallenge',
    name: 'Stroop Challenge',
    nameAr: 'تحدي ستروب',
    category: 'executive',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🎨',
    description: 'Color-word interference test for cognitive flexibility',
  },
  taskSwitcher: {
    id: 'taskSwitcher',
    name: 'Task Switcher',
    nameAr: 'مبدل المهام',
    category: 'executive',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🔄',
    description: 'Rapid task switching to measure cognitive flexibility',
  },
  towerPlanner: {
    id: 'towerPlanner',
    name: 'Tower Planner',
    nameAr: 'مخطط البرج',
    category: 'executive',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🏗️',
    description: 'Extended Tower of Hanoi with planning phase',
  },
  // INTJ Strategic Games
  logicGridPuzzle: {
    id: 'logicGridPuzzle',
    name: 'Logic Grid Puzzle',
    nameAr: 'لغز الشبكة المنطقية',
    category: 'logic',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🧩',
    description: 'Pure deductive reasoning with elimination grids - INTJ specialty',
  },
  chessTactics: {
    id: 'chessTactics',
    name: 'Chess Tactics',
    nameAr: 'تكتيكات الشطرنج',
    category: 'strategy',
    difficulty: [1, 2, 3, 4, 5],
    icon: '♟️',
    description: 'Forks, pins, skewers, and forced mates - strategic pattern recognition',
  },
  patternSequence: {
    id: 'patternSequence',
    name: 'Pattern Sequence',
    nameAr: 'تسلسل الأنماط',
    category: 'abstract',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🔮',
    description: 'Abstract pattern recognition and extrapolation across multiple domains',
  },
  resourceManagement: {
    id: 'resourceManagement',
    name: 'Resource Management',
    nameAr: 'إدارة الموارد',
    category: 'strategy',
    difficulty: [1, 2, 3, 4, 5],
    icon: '🏭',
    description: 'Systems thinking and optimization under constraints',
  },
  deductionChain: {
    id: 'deductionChain',
    name: 'Deduction Chain',
    nameAr: 'سلسلة الاستدلال',
    category: 'logic',
    difficulty: [2, 3, 4, 5],
    icon: '⛓️',
    description: 'Multi-step logical inference - Knights & Knaves, Einstein riddles, cryptarithms',
  },
};

export type GameType = keyof typeof gamesMeta;


