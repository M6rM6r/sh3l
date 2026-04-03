import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useGameStore } from "../../hooks/useGame";

const COLORS = [
  { name: "red", color: "#ef5350", word: "RED" },
  { name: "blue", color: "#1e88e5", word: "BLUE" },
  { name: "green", color: "#66bb6a", word: "GREEN" },
  { name: "yellow", color: "#ffca28", word: "YELLOW" },
  { name: "purple", color: "#ab47bc", word: "PURPLE" },
  { name: "orange", color: "#fb8c00", word: "ORANGE" },
];

const GAME_DURATION = 60;

export default function ColorMatchGame({ navigation }: any) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrial, setCurrentTrial] = useState(0);
  const [streak, setStreak] = useState(0);
  const [mode, setMode] = useState<"meaning" | "color">("meaning");
  
  const [wordObj, setWordObj] = useState(COLORS[0]);
  const [inkObj, setInkObj] = useState(COLORS[0]);
  
  const { endGame, updateScore } = useGameStore();

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setStreak(0);
    setCurrentTrial(0);
    setIsPlaying(true);
    generateTrial();
  };

  const generateTrial = () => {
    const randomWord = COLORS[Math.floor(Math.random() * COLORS.length)];
    const randomInk = COLORS[Math.floor(Math.random() * COLORS.length)];
    
    setWordObj(randomWord);
    setInkObj(randomInk);
    
    // Randomly decide if trial matches word or ink color
    const trialMode: "meaning" | "color" = Math.random() > 0.5 ? "meaning" : "color";
    setMode(trialMode);
    
    setCurrentTrial((prev) => prev + 1);
  };

  useEffect(() => {
    if (!isPlaying) return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleGameEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isPlaying]);

  const handleAnswer = (answerColor: typeof COLORS[0]) => {
    if (!isPlaying) return;

    const isCorrect = mode === "meaning" 
      ? answerColor.name === wordObj.name
      : answerColor.name === inkObj.name;

    if (isCorrect) {
      const points = 100 + streak * 10;
      setScore((s) => s + points);
      updateScore(points);
      setStreak((s) => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setStreak(0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    generateTrial();
  };

  const handleGameEnd = async () => {
    setIsPlaying(false);
    const accuracy = currentTrial > 0 ? (score / (currentTrial * 100)) * 100 : 0;
    await endGame(score, Math.min(accuracy, 100), GAME_DURATION);
    navigation.navigate("Dashboard");
  };

  if (!isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#0a1628", "#1a2744"]} style={styles.gradient}>
          <View style={styles.startScreen}>
            <Text style={styles.startIcon}>🎨</Text>
            <Text style={styles.startTitle}>Color Match</Text>
            <Text style={styles.startDesc}>
              Match the meaning of the word OR the color of the ink!{"\n\n"}
              Pay attention to the instruction at the top of the screen.
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <LinearGradient colors={["#fb8c00", "#f57c00"]} style={styles.startGradient}>
                <Text style={styles.startBtnText}>▶ Start Game</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={["#0a1628", "#1a2744"]} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGameEnd}>
            <Text style={styles.backBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Color Match</Text>
          <Text style={styles.score}>{score.toLocaleString()}</Text>
        </View>

        {/* Timer */}
        <View style={styles.timerContainer}>
          <View style={styles.timerBar}>
            <View style={[styles.timerFill, { width: `${(timeLeft / GAME_DURATION) * 100}%` }]} />
          </View>
          <Text style={styles.timerText}>{timeLeft}s</Text>
        </View>

        {/* Mode Indicator */}
        <View style={styles.modeContainer}>
          <Text style={styles.modeLabel}>
            {mode === "meaning" ? "Match the WORD" : "Match the COLOR"}
          </Text>
        </View>

        {/* Word Display */}
        <View style={styles.wordContainer}>
          <Text style={[styles.wordText, { color: inkObj.color }]}>
            {wordObj.word}
          </Text>
        </View>

        {/* Streak */}
        <View style={styles.streakContainer}>
          <Text style={styles.streakText}>
            {streak > 2 ? "🔥".repeat(Math.min(streak, 5)) : ""}
          </Text>
          <Text style={styles.streakValue}>Streak: {streak}x</Text>
        </View>

        {/* Color Options */}
        <View style={styles.optionsContainer}>
          {COLORS.map((color) => (
            <TouchableOpacity
              key={color.name}
              style={[styles.colorBtn, { backgroundColor: color.color }]}
              onPress={() => handleAnswer(color)}
            >
              <Text style={styles.colorBtnText}>{color.word}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gradient: { flex: 1 },
  startScreen: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  startIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  startTitle: {
    fontSize: 32,
    fontWeight: "800",
    color: "#fff",
    marginBottom: 16,
  },
  startDesc: {
    fontSize: 16,
    color: "#8b9bb4",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  startBtn: {
    borderRadius: 12,
    marginBottom: 20,
  },
  startGradient: {
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 12,
  },
  startBtnText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  backBtn: {
    padding: 12,
  },
  backText: {
    fontSize: 16,
    color: "#8b9bb4",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },
  backBtnText: {
    fontSize: 24,
    color: "#8b9bb4",
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  score: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4fc3f7",
    width: 100,
    textAlign: "right",
  },
  timerContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  timerBar: {
    height: 6,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 3,
    marginBottom: 8,
  },
  timerFill: {
    height: "100%",
    backgroundColor: "#fb8c00",
    borderRadius: 3,
  },
  timerText: {
    fontSize: 14,
    color: "#8b9bb4",
    textAlign: "center",
  },
  modeContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  modeLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fb8c00",
    backgroundColor: "rgba(251, 140, 0, 0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  wordContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 40,
  },
  wordText: {
    fontSize: 48,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  streakContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  streakText: {
    fontSize: 24,
    marginBottom: 4,
  },
  streakValue: {
    fontSize: 16,
    color: "#fb8c00",
    fontWeight: "700",
  },
  optionsContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 12,
  },
  colorBtn: {
    width: 100,
    height: 60,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  colorBtnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
