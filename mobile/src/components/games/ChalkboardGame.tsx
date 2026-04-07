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

const GAME_DURATION = 90;
const OPERATIONS = ["+", "-", "*"];

interface Problem {
  num1: number;
  num2: number;
  operation: string;
  answer: number;
  options: number[];
}

export default function ChalkboardGame({ navigation }: any) {
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isPlaying, setIsPlaying] = useState(false);
  const [level, setLevel] = useState(1);
  const [currentProblem, setCurrentProblem] = useState<Problem | null>(null);
  const [streak, setStreak] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  
  const { endGame, updateScore } = useGameStore();

  const generateProblem = (lvl: number): Problem => {
    let num1: number, num2: number, operation: string, answer: number;
    
    // Difficulty scaling
    const maxNum = 10 + lvl * 5;
    
    operation = OPERATIONS[Math.floor(Math.random() * Math.min(lvl, OPERATIONS.length)];
    
    switch (operation) {
      case "+":
        num1 = Math.floor(Math.random() * maxNum) + 1;
        num2 = Math.floor(Math.random() * maxNum) + 1;
        answer = num1 + num2;
        break;
      case "-":
        num1 = Math.floor(Math.random() * maxNum) + 5;
        num2 = Math.floor(Math.random() * num1) + 1;
        answer = num1 - num2;
        break;
      case "*":
        num1 = Math.floor(Math.random() * (5 + lvl)) + 2;
        num2 = Math.floor(Math.random() * (5 + lvl)) + 2;
        answer = num1 * num2;
        break;
      default:
        num1 = 1;
        num2 = 1;
        answer = 2;
    }
    
    // Generate wrong options
    const options: number[] = [answer];
    while (options.length < 4) {
      const wrong = answer + Math.floor(Math.random() * 20) - 10;
      if (wrong !== answer && wrong > 0 && !options.includes(wrong)) {
        options.push(wrong);
      }
    }
    
    return {
      num1,
      num2,
      operation,
      answer,
      options: options.sort(() => Math.random() - 0.5),
    };
  };

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_DURATION);
    setLevel(1);
    setStreak(0);
    setCorrectCount(0);
    setWrongCount(0);
    setIsPlaying(true);
    setCurrentProblem(generateProblem(1));
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

  const handleAnswer = (selectedAnswer: number) => {
    if (!currentProblem || !isPlaying) return;

    const isCorrect = selectedAnswer === currentProblem.answer;
    
    if (isCorrect) {
      const points = 100 + streak * 10 + level * 20;
      setScore((s) => s + points);
      updateScore(points);
      setStreak((s) => s + 1);
      setCorrectCount((c) => c + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Level up every 5 correct answers
      if ((correctCount + 1) % 5 === 0) {
        setLevel((l) => l + 1);
      }
    } else {
      setStreak(0);
      setWrongCount((w) => w + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    // Generate new problem
    const newLevel = Math.floor((correctCount + (isCorrect ? 1 : 0)) / 5) + 1;
    setCurrentProblem(generateProblem(newLevel));
  };

  const handleGameEnd = async () => {
    setIsPlaying(false);
    const total = correctCount + wrongCount;
    const accuracy = total > 0 ? (correctCount / total) * 100 : 0;
    await endGame(score, accuracy, GAME_DURATION - timeLeft);
    navigation.navigate("Dashboard");
  };

  const getOperationSymbol = (op: string) => {
    switch (op) {
      case "+": return "+";
      case "-": return "−";
      case "*": return "×";
      default: return op;
    }
  };

  if (!isPlaying) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={["#0a1628", "#1a2744"]} style={styles.gradient}>
          <View style={styles.startScreen}>
            <Text style={styles.startIcon}>📝</Text>
            <Text style={styles.startTitle}>Chalkboard</Text>
            <Text style={styles.startDesc}>
              Solve math problems as fast as you can!{"\n\n"}
              Addition, subtraction, and multiplication. Speed and accuracy matter!
            </Text>
            <TouchableOpacity style={styles.startBtn} onPress={startGame}>
              <LinearGradient colors={["#e91e63", "#c2185b"]} style={styles.startGradient}>
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
          <Text style={styles.title}>Chalkboard</Text>
          <Text style={styles.score}>{score.toLocaleString()}</Text>
        </View>

        {/* Stats */}
        <View style={styles.stats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Level</Text>
            <Text style={styles.statValue}>{level}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Time</Text>
            <Text style={styles.statValue}>{timeLeft}s</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={styles.statValue}>{streak}x</Text>
          </View>
        </View>

        {/* Problem Display */}
        {currentProblem && (
          <View style={styles.problemContainer}>
            <View style={styles.chalkboard}>
              <Text style={styles.problemText}>
                {currentProblem.num1} {getOperationSymbol(currentProblem.operation)} {currentProblem.num2} = ?
              </Text>
            </View>
          </View>
        )}

        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Correct: {correctCount} | Wrong: {wrongCount}
          </Text>
        </View>

        {/* Answer Options */}
        <View style={styles.optionsContainer}>
          {currentProblem?.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionBtn}
              onPress={() => handleAnswer(option)}
            >
              <LinearGradient colors={["#e91e63", "#c2185b"]} style={styles.optionGradient}>
                <Text style={styles.optionText}>{option}</Text>
              </LinearGradient>
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
  stats: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 40,
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    color: "#8b9bb4",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#fff",
  },
  problemContainer: {
    alignItems: "center",
    marginVertical: 40,
  },
  chalkboard: {
    backgroundColor: "#2e4a3e",
    borderRadius: 16,
    padding: 40,
    minWidth: 280,
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#5d4037",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  problemText: {
    fontSize: 36,
    fontWeight: "700",
    color: "#fff",
    fontFamily: "monospace",
  },
  progressContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  progressText: {
    fontSize: 16,
    color: "#8b9bb4",
  },
  optionsContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    gap: 16,
  },
  optionBtn: {
    width: 120,
    height: 80,
    borderRadius: 12,
  },
  optionGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  optionText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
});


