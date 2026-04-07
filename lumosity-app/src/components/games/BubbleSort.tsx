import { useState, useEffect } from 'react';

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
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%)', padding: '20px' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
          <button onClick={onBack} style={{
            padding: '12px 24px',
            background: 'rgba(255,255,255,0.1)',
            border: '1px solid rgba(0,255,159,0.3)',
            borderRadius: '8px',
            color: '#00ff9f',
            cursor: 'pointer',
            fontSize: '16px'
          }}>← Back</button>
          <h1 style={{ color: '#00ff9f', margin: 0, fontSize: '32px', fontWeight: 'bold' }}>📊 Bubble Sort</h1>
        </div>

        <div style={{ display: 'flex', gap: '15px', marginBottom: '30px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <div style={{
            padding: '15px 25px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(0,255,159,0.3)',
            borderRadius: '12px',
            fontSize: '18px',
            color: '#fff'
          }}>Level: {level}</div>
          <div style={{
            padding: '15px 25px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(0,255,159,0.3)',
            borderRadius: '12px',
            fontSize: '18px',
            color: '#fff'
          }}>Score: {score}</div>
          <div style={{
            padding: '15px 25px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(0,255,159,0.3)',
            borderRadius: '12px',
            fontSize: '18px',
            color: '#fff'
          }}>Moves: {moves}</div>
          <div style={{
            padding: '15px 25px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(0,255,159,0.3)',
            borderRadius: '12px',
            fontSize: '18px',
            color: '#fff'
          }}>Target: {targetMoves}</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(0,255,159,0.3)',
          borderRadius: '16px',
          padding: '40px',
          marginBottom: '30px'
        }}>
          <div style={{
            marginBottom: '30px',
            textAlign: 'center',
            color: '#fff',
            fontSize: '18px'
          }}>
            Click two adjacent numbers to swap them. Sort from lowest to highest!
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-end',
            gap: '10px',
            minHeight: '300px',
            padding: '20px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px'
          }}>
            {numbers.map((num, index) => (
              <div
                key={index}
                onClick={() => handleNumberClick(index)}
                style={{
                  width: `${Math.max(60, 400 / numbers.length)}px`,
                  height: `${num * (250 / numbers.length)}px`,
                  background: selectedIndices.includes(index)
                    ? 'linear-gradient(135deg, #00ff9f, #00cc7f)'
                    : getNumberColor(num, index),
                  borderRadius: '8px 8px 0 0',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'center',
                  paddingTop: '10px',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#fff',
                  border: selectedIndices.includes(index) ? '3px solid #00ff9f' : '2px solid rgba(255,255,255,0.2)',
                  transition: 'all 0.3s',
                  boxShadow: selectedIndices.includes(index) ? '0 0 20px rgba(0,255,159,0.6)' : 'none'
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
            <div style={{
              marginTop: '30px',
              padding: '20px',
              background: 'rgba(0,255,159,0.2)',
              border: '1px solid #00ff9f',
              borderRadius: '12px',
              textAlign: 'center',
              color: '#00ff9f',
              fontSize: '24px',
              fontWeight: 'bold'
            }}>
              Perfect! Sorted in {moves} moves! 🎉
            </div>
          )}
        </div>

        <div style={{
          textAlign: 'center',
          color: '#999',
          fontSize: '16px',
          lineHeight: '1.6'
        }}>
          <p>💡 Tip: Only adjacent numbers can be swapped</p>
          <p>Try to match or beat the target number of moves!</p>
        </div>
      </div>
    </div>
  );
}
