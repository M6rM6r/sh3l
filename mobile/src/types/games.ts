export interface GameConfig {
  id: string;
  name: string;
  description: string;
  icon: string;
  cognitiveArea: "memory" | "speed" | "attention" | "flexibility" | "problemSolving";
  difficulty: "easy" | "medium" | "hard";
  duration: number;
  component: string;
}

export const GAMES: GameConfig[] = [
  {
    id: "memory-matrix",
    name: "Memory Matrix",
    description: "Remember the pattern and recreate it",
    icon: "🔲",
    cognitiveArea: "memory",
    difficulty: "medium",
    duration: 60,
    component: "MemoryMatrixGame",
  },
  {
    id: "speed-match",
    name: "Speed Match",
    description: "Match symbols as fast as you can",
    icon: "⚡",
    cognitiveArea: "speed",
    difficulty: "easy",
    duration: 45,
    component: "SpeedMatchGame",
  },
  {
    id: "train-of-thought",
    name: "Train of Thought",
    description: "Guide trains to matching stations",
    icon: "🚂",
    cognitiveArea: "attention",
    difficulty: "medium",
    duration: 90,
    component: "TrainOfThoughtGame",
  },
  {
    id: "color-match",
    name: "Color Match",
    description: "Match word meaning or ink color",
    icon: "🎨",
    cognitiveArea: "flexibility",
    difficulty: "hard",
    duration: 60,
    component: "ColorMatchGame",
  },
  {
    id: "pattern-recall",
    name: "Pattern Recall",
    description: "Memorize and recreate tile patterns",
    icon: "🔷",
    cognitiveArea: "memory",
    difficulty: "medium",
    duration: 120,
    component: "PatternRecallGame",
  },
  {
    id: "chalkboard",
    name: "Chalkboard",
    description: "Solve math problems quickly",
    icon: "📝",
    cognitiveArea: "problemSolving",
    difficulty: "medium",
    duration: 90,
    component: "ChalkboardGame",
  },
  {
    id: "fish-food",
    name: "Fish Food",
    description: "Tap blue fish as fast as possible",
    icon: "🐟",
    cognitiveArea: "speed",
    difficulty: "easy",
    duration: 45,
    component: "FishFoodGame",
  },
  {
    id: "word-bubble",
    name: "Word Bubble",
    description: "Find words from scrambled letters",
    icon: "💬",
    cognitiveArea: "memory",
    difficulty: "medium",
    duration: 75,
    component: "WordBubbleGame",
  },
  {
    id: "lost-in-migration",
    name: "Lost in Migration",
    description: "Find birds flying target direction",
    icon: "🐦",
    cognitiveArea: "attention",
    difficulty: "medium",
    duration: 60,
    component: "LostInMigrationGame",
  },
  {
    id: "rotation-recall",
    name: "Rotation Recall",
    description: "Remember shape rotations",
    icon: "🔄",
    cognitiveArea: "memory",
    difficulty: "hard",
    duration: 90,
    component: "RotationRecallGame",
  },
];

export const COGNITIVE_AREAS = {
  memory: { label: "Memory", color: "#9c27b0", icon: "🧠" },
  speed: { label: "Speed", color: "#f57c00", icon: "⚡" },
  attention: { label: "Attention", color: "#1976d2", icon: "🎯" },
  flexibility: { label: "Flexibility", color: "#388e3c", icon: "🔄" },
  problemSolving: { label: "Problem Solving", color: "#7b1fa2", icon: "🧩" },
} as const;
