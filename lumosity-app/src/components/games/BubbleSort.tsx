import { useState, useEffect } from 'react';
import './BubbleSort.css';

interface BubbleSortProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

export function BubbleSort({ onBack }: BubbleSortProps) {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [numbers, setNumbers] = useState<number[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [targetMoves, setTargetMoves] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    generateNumbers();
  }, [level]);

  const generateNumbers = () => {
    const count = 5 + Math.floor(level / 2);
    const nums = Array.from({ length: count }, (_, i) => i + 1);

    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }

    setNumbers(nums);
    setSelectedIndices([]);
    setMoves(0);
    setShowSuccess(false);

    const sortedNums = [...nums];
    let swaps = 0;
    for (let i = 0; i < sortedNums.length - 1; i++) {
      for (let j = 0; j < sortedNums.length - i - 1; j++) {
        if (sortedNums[j] > sortedNums[j + 1]) {
          [sortedNums[j], sortedNums[j + 1]] = [sortedNums[j + 1], sortedNums[j]];
          swaps++;
        }
      }
    }
    setTargetMoves(swaps);
  };

  const handleNumberClick = (index: number) => {
    if (selectedIndices.includes(index)) {
      setSelectedIndices(selectedIndices.filter(i => i !== index));
      return;
    }

    const newSelected = [...selectedIndices, index];

    if (newSelected.length === 2) {
      const [i1, i2] = newSelected.sort((a, b) => a - b);

      if (i2 === i1 + 1) {
        const newNumbers = [...numbers];
        [newNumbers[i1], newNumbers[i2]] = [newNumbers[i2], newNumbers[i1]];
        setNumbers(newNumbers);
        setMoves(moves + 1);

        if (isSorted(newNumbers)) {
          const efficiency = Math.max(0, 100 - ((moves + 1 - targetMoves) * 10));
          const points = level * 50 + efficiency;
          setScore(score + points);
          setShowSuccess(true);

          setTimeout(() => {
            setLevel(level + 1);
          }, 2000);
        }
      }

      setSelectedIndices([]);
    } else {
      setSelectedIndices(newSelected);
    }
  };

  const isSorted = (arr: number[]) => {
    for (let i = 0; i < arr.length - 1; i++) {
      if (arr[i] > arr[i + 1]) return false;
    }
    return true;
  };

  const getNumberColor = (num: number, index: number) => {
    if (selectedIndices.includes(index)) {
      return 'rgba(0,255,159,0.3)';
    }
    const hue = (num / (numbers.length + 1)) * 120;
    return `hsl(${hue}, 70%, 50%)`;
  };

  return (
    <div className="bs-container">
      <div className="bs-content">
        <div className="bs-header">
          <button className="bs-back-btn" onClick={onBack}>← Back</button>
          <h1 className="bs-title">📊 Bubble Sort</h1>
        </div>

        <div className="bs-stats">
          <div className="bs-stat-card">Level: {level}</div>
          <div className="bs-stat-card">Score: {score}</div>
          <div className="bs-stat-card">Moves: {moves}</div>
          <div className="bs-stat-card">Target: {targetMoves}</div>
        </div>

        <div className="bs-game-area">
          <div className="bs-instructions">
            Click two adjacent numbers to swap them. Sort from lowest to highest!
          </div>

          <div className="bs-visualization">
            {numbers.map((num, index) => (
              <div
                key={index}
                className={`bs-number-bar ${selectedIndices.includes(index) ? 'bs-number-bar-selected' : ''}`}
                onClick={() => handleNumberClick(index)}
                style={{
                  width: `${Math.max(60, 400 / numbers.length)}px`,
                  height: `${num * (250 / numbers.length)}px`,
                  background: selectedIndices.includes(index) ? undefined : getNumberColor(num, index)
                }}
                onMouseEnter={(e) => {
                  if (!selectedIndices.includes(index)) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.filter = 'brightness(1.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.filter = 'brightness(1)';
                }}
              >
                {num}
              </div>
            ))}
          </div>

          {showSuccess && (
            <div className="bs-success-message">
              Perfect! Sorted in {moves} moves! 🎉
            </div>
          )}
        </div>

        <div className="bs-footer">
          <p>💡 Tip: Only adjacent numbers can be swapped</p>
          <p>Try to match or beat the target number of moves!</p>
        </div>
      </div>
    </div>
  );
}


