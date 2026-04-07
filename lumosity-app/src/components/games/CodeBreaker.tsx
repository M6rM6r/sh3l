import { useState, useEffect } from 'react';
import './CodeBreaker.css';

interface CodeBreakerProps {
  onComplete: (score: number, level: number, duration: number) => void;
  onBack: () => void;
}

interface Guess {
  colors: string[];
  correct: number;
  wrongPosition: number;
}

const COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Green', hex: '#10b981' },
  { name: 'Yellow', hex: '#f59e0b' },
  { name: 'Purple', hex: '#a855f7' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Cyan', hex: '#06b6d4' },
  { name: 'Orange', hex: '#f97316' },
];

const COLOR_CLASS_MAP: Record<string, string> = {
  '#ef4444': 'color-red',
  '#3b82f6': 'color-blue',
  '#10b981': 'color-green',
  '#f59e0b': 'color-yellow',
  '#a855f7': 'color-purple',
  '#ec4899': 'color-pink',
  '#06b6d4': 'color-cyan',
  '#f97316': 'color-orange',
};

const getColorClass = (color: string) => COLOR_CLASS_MAP[color] ?? '';

export function CodeBreaker({ onComplete, onBack }: CodeBreakerProps) {
  const [secretCode, setSecretCode] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState<string[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [startTime] = useState(Date.now());
  const [codeLength, setCodeLength] = useState(4);
  const [maxGuesses] = useState(10);
  const [isWon, setIsWon] = useState(false);
  const [isLost, setIsLost] = useState(false);

  useEffect(() => {
    generateCode(level);
  }, [level]);

  const generateCode = (currentLevel: number) => {
    const length = Math.min(4 + Math.floor(currentLevel / 3), 6);
    setCodeLength(length);

    const code: string[] = [];
    for (let i = 0; i < length; i++) {
      const randomColor = COLORS[Math.floor(Math.random() * COLORS.length)];
      code.push(randomColor.hex);
    }

    setSecretCode(code);
    setCurrentGuess(Array(length).fill(''));
    setGuesses([]);
    setIsWon(false);
    setIsLost(false);
  };

  const handleColorSelect = (index: number, color: string) => {
    const newGuess = [...currentGuess];
    newGuess[index] = color;
    setCurrentGuess(newGuess);
  };

  const handleSubmitGuess = () => {
    if (currentGuess.some(c => c === '')) return;

    let correct = 0;
    let wrongPosition = 0;

    const secretCopy = [...secretCode];
    const guessCopy = [...currentGuess];

    for (let i = 0; i < codeLength; i++) {
      if (guessCopy[i] === secretCopy[i]) {
        correct++;
        secretCopy[i] = '';
        guessCopy[i] = '';
      }
    }

    for (let i = 0; i < codeLength; i++) {
      if (guessCopy[i] !== '') {
        const foundIndex = secretCopy.indexOf(guessCopy[i]);
        if (foundIndex !== -1) {
          wrongPosition++;
          secretCopy[foundIndex] = '';
        }
      }
    }

    const newGuess: Guess = {
      colors: [...currentGuess],
      correct,
      wrongPosition
    };

    const newGuesses = [...guesses, newGuess];
    setGuesses(newGuesses);

    if (correct === codeLength) {
      const attempts = newGuesses.length;
      const bonus = Math.max(0, (maxGuesses - attempts) * 50);
      const levelScore = 300 + bonus + (level * 100);
      setScore(score + levelScore);
      setIsWon(true);
    } else if (newGuesses.length >= maxGuesses) {
      setIsLost(true);
    } else {
      setCurrentGuess(Array(codeLength).fill(''));
    }
  };

  const handleNextLevel = () => {
    setLevel(level + 1);
  };

  const handleRetry = () => {
    generateCode(level);
  };

  const handleFinish = () => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    onComplete(score, level, duration);
  };

  return (
    <div className="code-breaker">
      <div className="code-breaker__header">
        <button
          onClick={onBack}
          type="button"
          className="code-breaker__back"
        >
          {'<'} BACK
        </button>
        <div className="code-breaker__stats">
          <div>[LEVEL: {level}]</div>
          <div>[SCORE: {score}]</div>
          <div>[ATTEMPTS: {guesses.length}/{maxGuesses}]</div>
        </div>
      </div>

      <h1 className="code-breaker__title">
        {'>'} CODE_BREAKER
      </h1>

      <p className="code-breaker__subtitle">
        [Crack the {codeLength}-color code]
      </p>

      <div className="code-breaker__board">
        <div className="code-breaker__guess-list">
          {guesses.map((guess, idx) => (
            <div key={idx} className="code-breaker__guess-row">
              <div className="code-breaker__guess-index">
                #{idx + 1}
              </div>
              <div className="code-breaker__peg-list">
                {guess.colors.map((color, cIdx) => (
                  <div key={cIdx} className={`code-breaker__peg ${getColorClass(color)}`} />
                ))}
              </div>
              <div className="code-breaker__feedback">
                <div className="code-breaker__feedback-value code-breaker__feedback-value--correct">
                  {guess.correct}
                </div>
                <div className="code-breaker__feedback-value code-breaker__feedback-value--position">
                  {guess.wrongPosition}
                </div>
              </div>
            </div>
          ))}
        </div>

        {!isWon && !isLost && (
          <>
            <div className="code-breaker__panel">
              <div className="code-breaker__section-label">
                [CURRENT GUESS]
              </div>
              <div className="code-breaker__current-guess">
                {currentGuess.map((color, idx) => (
                  <div
                    key={idx}
                    className={`code-breaker__current-slot ${color ? `code-breaker__current-slot--filled ${getColorClass(color)}` : ''}`.trim()}
                  />
                ))}
              </div>

              <div className="code-breaker__section-label">
                [SELECT COLORS]
              </div>
              <div className="code-breaker__palette">
                {COLORS.map((color) => (
                  <button
                    key={color.hex}
                    type="button"
                    aria-label={`Add ${color.name} to current guess`}
                    title={`Add ${color.name}`}
                    className={`code-breaker__color-button ${getColorClass(color.hex)}`}
                    onClick={() => {
                      const firstEmpty = currentGuess.indexOf('');
                      if (firstEmpty !== -1) {
                        handleColorSelect(firstEmpty, color.hex);
                      }
                    }}
                  />
                ))}
              </div>

              <div className="code-breaker__actions">
                <button
                  type="button"
                  onClick={() => setCurrentGuess(Array(codeLength).fill(''))}
                  className="code-breaker__action code-breaker__action--clear"
                >
                  [CLEAR]
                </button>
                <button
                  type="button"
                  onClick={handleSubmitGuess}
                  disabled={currentGuess.some(c => c === '')}
                  className="code-breaker__action code-breaker__action--submit"
                >
                  [SUBMIT GUESS]
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="code-breaker__legend">
        <div className="code-breaker__legend-title">[FEEDBACK KEY]</div>
        <div className="code-breaker__legend-items">
          <div className="code-breaker__legend-item">
            <div className="code-breaker__legend-box code-breaker__legend-box--correct" />
            <span>Correct color & position</span>
          </div>
          <div className="code-breaker__legend-item">
            <div className="code-breaker__legend-box code-breaker__legend-box--position" />
            <span>Correct color, wrong position</span>
          </div>
        </div>
      </div>

      {isWon && (
        <div className="code-breaker__modal code-breaker__modal--win">
          <h2 className="code-breaker__modal-title code-breaker__modal-title--win">
            [CODE CRACKED!]
          </h2>
          <p className="code-breaker__modal-text code-breaker__modal-text--win">
            Solved in {guesses.length} attempts
          </p>
          <div className="code-breaker__modal-actions">
            <button
              type="button"
              onClick={handleNextLevel}
              className="code-breaker__action code-breaker__action--primary"
            >
              [NEXT LEVEL]
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="code-breaker__action code-breaker__action--secondary"
            >
              [FINISH]
            </button>
          </div>
        </div>
      )}

      {isLost && (
        <div className="code-breaker__modal code-breaker__modal--lose">
          <h2 className="code-breaker__modal-title code-breaker__modal-title--lose">
            [FAILED]
          </h2>
          <p className="code-breaker__modal-text code-breaker__modal-text--lose">
            Out of attempts
          </p>
          <div className="code-breaker__secret-code">
            {secretCode.map((color, idx) => (
              <div key={idx} className={`code-breaker__secret-peg ${getColorClass(color)}`} />
            ))}
          </div>
          <div className="code-breaker__modal-actions">
            <button
              type="button"
              onClick={handleRetry}
              className="code-breaker__action code-breaker__action--danger"
            >
              [RETRY]
            </button>
            <button
              type="button"
              onClick={handleFinish}
              className="code-breaker__action code-breaker__action--ghost"
            >
              [FINISH]
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


