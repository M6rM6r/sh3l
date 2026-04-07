import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface ChessTacticsProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

type PieceType = 'king' | 'queen' | 'rook' | 'bishop' | 'knight' | 'pawn';
type PieceColor = 'white' | 'black';

interface ChessPiece {
  type: PieceType;
  color: PieceColor;
  x: number;
  y: number;
  id: string;
}

interface TacticPuzzle {
  id: string;
  name: string;
  setup: ChessPiece[];
  solution: string[]; // Array of moves in algebraic notation
  hint: string;
  difficulty: 'mate_in_1' | 'mate_in_2' | 'mate_in_3' | 'fork' | 'pin' | 'skewer' | 'discovered';
  description: string;
}

const PIECE_SYMBOLS: Record<PieceColor, Record<PieceType, string>> = {
  white: {
    king: '♔', queen: '♕', rook: '♖', bishop: '♗', knight: '♘', pawn: '♙'
  },
  black: {
    king: '♚', queen: '♛', rook: '♜', bishop: '♝', knight: '♞', pawn: '♟'
  }
};

const TACTIC_PUZZLES: TacticPuzzle[] = [
  {
    id: 'mate_in_1_1',
    name: 'Back Rank Mate',
    setup: [
      { type: 'king', color: 'black', x: 4, y: 0, id: 'bk1' },
      { type: 'rook', color: 'white', x: 0, y: 0, id: 'wr1' },
      { type: 'king', color: 'white', x: 4, y: 7, id: 'wk1' },
    ],
    solution: ['Ra8#'],
    hint: 'Use the rook to checkmate on the back rank',
    difficulty: 'mate_in_1',
    description: 'The black king is trapped on the back rank.'
  },
  {
    id: 'fork_1',
    name: 'Knight Fork',
    setup: [
      { type: 'king', color: 'black', x: 4, y: 0, id: 'bk1' },
      { type: 'queen', color: 'black', x: 3, y: 2, id: 'bq1' },
      { type: 'rook', color: 'black', x: 5, y: 2, id: 'br1' },
      { type: 'knight', color: 'white', x: 2, y: 4, id: 'wn1' },
      { type: 'king', color: 'white', x: 4, y: 7, id: 'wk1' },
    ],
    solution: ['Nd4+'],
    hint: 'The knight can attack both the king and queen simultaneously',
    difficulty: 'fork',
    description: 'Find the knight fork that wins the queen.'
  },
  {
    id: 'pin_1',
    name: 'Absolute Pin',
    setup: [
      { type: 'king', color: 'black', x: 4, y: 0, id: 'bk1' },
      { type: 'bishop', color: 'black', x: 4, y: 2, id: 'bb1' },
      { type: 'queen', color: 'black', x: 4, y: 3, id: 'bq1' },
      { type: 'queen', color: 'white', x: 4, y: 7, id: 'wq1' },
      { type: 'king', color: 'white', x: 0, y: 7, id: 'wk1' },
    ],
    solution: ['Qxg7#'],
    hint: 'The bishop is pinned to the king and cannot move',
    difficulty: 'pin',
    description: 'Exploit the absolute pin to deliver checkmate.'
  },
  {
    id: 'mate_in_2_1',
    name: 'Smothered Mate',
    setup: [
      { type: 'king', color: 'black', x: 7, y: 0, id: 'bk1' },
      { type: 'rook', color: 'black', x: 6, y: 0, id: 'br1' },
      { type: 'knight', color: 'black', x: 7, y: 1, id: 'bn1' },
      { type: 'pawn', color: 'black', x: 6, y: 1, id: 'bp1' },
      { type: 'knight', color: 'white', x: 5, y: 5, id: 'wn1' },
      { type: 'queen', color: 'white', x: 4, y: 6, id: 'wq1' },
      { type: 'king', color: 'white', x: 0, y: 7, id: 'wk1' },
    ],
    solution: ['Qf6+', 'Nxf6#'],
    hint: 'Sacrifice the queen to smother the king, then deliver mate',
    difficulty: 'mate_in_2',
    description: 'The king is surrounded by its own pieces.'
  },
  {
    id: 'skewer_1',
    name: 'Royal Skewer',
    setup: [
      { type: 'king', color: 'black', x: 4, y: 2, id: 'bk1' },
      { type: 'queen', color: 'black', x: 4, y: 3, id: 'bq1' },
      { type: 'rook', color: 'white', x: 4, y: 7, id: 'wr1' },
      { type: 'king', color: 'white', x: 0, y: 0, id: 'wk1' },
    ],
    solution: ['Re4+', 'Rxe3'],
    hint: 'Check the king, forcing it to move, then capture the queen',
    difficulty: 'skewer',
    description: 'The king and queen are aligned. Use the skewer tactic.'
  },
  {
    id: 'discovered_1',
    name: 'Discovered Check',
    setup: [
      { type: 'king', color: 'black', x: 4, y: 0, id: 'bk1' },
      { type: 'bishop', color: 'white', x: 0, y: 4, id: 'wb1' },
      { type: 'knight', color: 'white', x: 3, y: 4, id: 'wn1' },
      { type: 'king', color: 'white', x: 7, y: 7, id: 'wk1' },
    ],
    solution: ['Nf6+', 'Nxd7'],
    hint: 'Move the knight to uncover the bishop\'s attack',
    difficulty: 'discovered',
    description: 'Moving the knight reveals a check from the bishop.'
  },
];

const GAME_DURATION = 300; // 5 minutes per puzzle

const ChessTactics: React.FC<ChessTacticsProps> = memo(({
  onComplete,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'intro' | 'playing' | 'solved' | 'gameover'>('intro');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  
  const [currentPuzzle, setCurrentPuzzle] = useState<TacticPuzzle | null>(null);
  const [pieces, setPieces] = useState<ChessPiece[]>([]);
  const [selectedPiece, setSelectedPiece] = useState<ChessPiece | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [hintShown, setHintShown] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [puzzleIndex, setPuzzleIndex] = useState(0);

  const loadPuzzle = useCallback((index: number) => {
    const puzzle = TACTIC_PUZZLES[index % TACTIC_PUZZLES.length];
    setCurrentPuzzle(puzzle);
    setPieces([...puzzle.setup]);
    setMoveHistory([]);
    setHintShown(false);
    setFeedback(null);
    setSelectedPiece(null);
    setTimeLeft(GAME_DURATION);
  }, []);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setCorrect(0);
    setTotal(0);
    setLevel(1);
    setPuzzleIndex(0);
    loadPuzzle(0);
  };

  useEffect(() => {
    onScoreChange?.(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    onTimeChange?.(timeLeft);
  }, [timeLeft, onTimeChange]);

  useEffect(() => {
    if (gameState !== 'playing' || isPaused) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState, isPaused]);

  const getValidMoves = (piece: ChessPiece): { x: number; y: number }[] => {
    const moves: { x: number; y: number }[] = [];
    const { type, color, x, y } = piece;
    
    // Helper to check if square is empty or has enemy piece
    const canMove = (tx: number, ty: number) => {
      if (tx < 0 || tx > 7 || ty < 0 || ty > 7) return false;
      const target = pieces.find(p => p.x === tx && p.y === ty);
      return !target || target.color !== color;
    };
    
    // Helper to check if square is empty
    const isEmpty = (tx: number, ty: number) => {
      return !pieces.find(p => p.x === tx && p.y === ty);
    };
    
    switch (type) {
      case 'king':
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            if (canMove(x + dx, y + dy)) {
              moves.push({ x: x + dx, y: y + dy });
            }
          }
        }
        break;
        
      case 'queen':
        // Horizontal, vertical, and diagonal
        for (let i = 1; i < 8; i++) {
          // All 8 directions
          const dirs = [
            [i, 0], [-i, 0], [0, i], [0, -i],
            [i, i], [i, -i], [-i, i], [-i, -i]
          ];
          dirs.forEach(([dx, dy]) => {
            const tx = x + dx;
            const ty = y + dy;
            if (tx >= 0 && tx < 8 && ty >= 0 && ty < 8) {
              if (canMove(tx, ty)) {
                moves.push({ x: tx, y: ty });
              }
            }
          });
        }
        break;
        
      case 'rook':
        for (let i = 1; i < 8; i++) {
          [[i, 0], [-i, 0], [0, i], [0, -i]].forEach(([dx, dy]) => {
            const tx = x + dx;
            const ty = y + dy;
            if (canMove(tx, ty)) {
              moves.push({ x: tx, y: ty });
            }
          });
        }
        break;
        
      case 'bishop':
        for (let i = 1; i < 8; i++) {
          [[i, i], [i, -i], [-i, i], [-i, -i]].forEach(([dx, dy]) => {
            const tx = x + dx;
            const ty = y + dy;
            if (canMove(tx, ty)) {
              moves.push({ x: tx, y: ty });
            }
          });
        }
        break;
        
      case 'knight':
        const knightMoves = [
          [2, 1], [2, -1], [-2, 1], [-2, -1],
          [1, 2], [1, -2], [-1, 2], [-1, -2]
        ];
        knightMoves.forEach(([dx, dy]) => {
          if (canMove(x + dx, y + dy)) {
            moves.push({ x: x + dx, y: y + dy });
          }
        });
        break;
        
      case 'pawn':
        const direction = color === 'white' ? -1 : 1;
        // Forward move
        if (isEmpty(x, y + direction)) {
          moves.push({ x, y: y + direction });
        }
        // Captures
        [-1, 1].forEach(dx => {
          const target = pieces.find(p => p.x === x + dx && p.y === y + direction);
          if (target && target.color !== color) {
            moves.push({ x: x + dx, y: y + direction });
          }
        });
        break;
    }
    
    return moves;
  };

  const handleSquareClick = (x: number, y: number) => {
    if (gameState !== 'playing' || !currentPuzzle) return;
    
    const piece = pieces.find(p => p.x === x && p.y === y);
    
    if (selectedPiece) {
      // Try to move
      const validMoves = getValidMoves(selectedPiece);
      const isValid = validMoves.some(m => m.x === x && m.y === y);
      
      if (isValid) {
        // Execute move
        const newPieces = pieces.filter(p => !(p.x === x && p.y === y)); // Remove captured piece
        const movedPiece = { ...selectedPiece, x, y };
        const pieceIndex = newPieces.findIndex(p => p.id === selectedPiece.id);
        if (pieceIndex >= 0) {
          newPieces[pieceIndex] = movedPiece;
        } else {
          newPieces.push(movedPiece);
        }
        
        setPieces(newPieces);
        
        // Record move in algebraic notation
        const file = String.fromCharCode(97 + x);
        const rank = 8 - y;
        const pieceSymbol = selectedPiece.type === 'pawn' ? '' : 
                           selectedPiece.type.charAt(0).toUpperCase();
        const capture = piece ? 'x' : '';
        const moveNotation = `${pieceSymbol}${capture}${file}${rank}`;
        
        const newHistory = [...moveHistory, moveNotation];
        setMoveHistory(newHistory);
        setSelectedPiece(null);
        
        // Check if this matches the solution
        const expectedMove = currentPuzzle.solution[moveHistory.length];
        if (moveNotation === expectedMove) {
          audioManager.playCorrect();
          setFeedback('Correct!');
          
          if (newHistory.length === currentPuzzle.solution.length) {
            // Puzzle solved!
            setCorrect(c => c + 1);
            const timeBonus = Math.floor(timeLeft / 10);
            const hintPenalty = hintShown ? 15 : 0;
            setScore(s => s + 50 + timeBonus - hintPenalty);
            
            setTimeout(() => {
              if (puzzleIndex + 1 < TACTIC_PUZZLES.length) {
                setPuzzleIndex(p => p + 1);
                loadPuzzle(puzzleIndex + 1);
                setLevel(l => l + 1);
              } else {
                setGameState('solved');
              }
            }, 1500);
          }
        } else {
          audioManager.playWrong();
          setFeedback('Incorrect move. Try again!');
          setScore(s => Math.max(0, s - 5));
          
          // Reset position
          setTimeout(() => {
            setPieces([...currentPuzzle.setup]);
            setMoveHistory([]);
            setFeedback(null);
          }, 1000);
        }
        
        setTotal(t => t + 1);
      } else {
        setSelectedPiece(null);
      }
    } else if (piece && piece.color === 'white') {
      // Select piece
      setSelectedPiece(piece);
    }
  };

  const showHint = () => {
    if (currentPuzzle && !hintShown) {
      setHintShown(true);
      setFeedback(`Hint: ${currentPuzzle.hint}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getValidMoveIndicators = () => {
    if (!selectedPiece) return [];
    return getValidMoves(selectedPiece);
  };

  if (gameState === 'intro') {
    return (
      <div className="chess-tactics-intro" role="alert" aria-live="polite">
        <h2>♟️ Chess Tactics Trainer</h2>
        <p>INTJ Challenge: Pattern recognition and forced mates.</p>
        <div className="instructions">
          <h3>How to Play:</h3>
          <ul>
            <li>Each puzzle presents a tactical opportunity</li>
            <li>Find the correct sequence of moves</li>
            <li>Click a white piece, then click where to move it</li>
            <li>Puzzles include: forks, pins, skewers, and mates</li>
          </ul>
          <div className="tactics-types">
            <h4>Tactical Patterns:</h4>
            <div className="tactic-tags">
              <span className="tactic-tag">Fork</span>
              <span className="tactic-tag">Pin</span>
              <span className="tactic-tag">Skewer</span>
              <span className="tactic-tag">Discovered</span>
              <span className="tactic-tag">Mate in N</span>
            </div>
          </div>
        </div>
        <button className="start-button" onClick={startGame}>
          Start Training
        </button>
      </div>
    );
  }

  if (gameState === 'solved') {
    return (
      <div className="tactics-solved" role="alert" aria-live="polite">
        <h2>🎉 All Puzzles Completed!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Puzzles Solved: {correct} / {TACTIC_PUZZLES.length}</div>
        <div className="final-stats">Accuracy: {Math.round((correct / total) * 100)}%</div>
        <p className="intj-quote">"Chess is the gymnasium of the mind." - Blaise Pascal</p>
        <button onClick={startGame}>Train Again</button>
      </div>
    );
  }

  if (gameState === 'gameover') {
    return (
      <div className="game-over" role="alert" aria-live="polite">
        <h2>Time's Up</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Puzzles Solved: {correct}</div>
        <button onClick={startGame}>Try Again</button>
      </div>
    );
  }

  const validMoves = getValidMoveIndicators();

  return (
    <div className="chess-tactics" role="application" aria-label="Chess Tactics Trainer">
      <div className="game-stats-bar">
        <span>Score: {score}</span>
        <span>Puzzle: {puzzleIndex + 1} / {TACTIC_PUZZLES.length}</span>
        <span>Time: {formatTime(timeLeft)}</span>
      </div>

      {currentPuzzle && (
        <div className="puzzle-info">
          <h3>{currentPuzzle.name}</h3>
          <p className="puzzle-description">{currentPuzzle.description}</p>
          <span className={`difficulty-badge ${currentPuzzle.difficulty}`}>
            {currentPuzzle.difficulty.replace('_', ' ')}
          </span>
        </div>
      )}

      <div className="chess-board-container">
        <div className="chess-board">
          {Array.from({ length: 8 }, (_, row) => (
            <div key={row} className="board-row">
              {Array.from({ length: 8 }, (_, col) => {
                const isLight = (row + col) % 2 === 0;
                const piece = pieces.find(p => p.x === col && p.y === row);
                const isValidMove = validMoves.some(m => m.x === col && m.y === row);
                const isSelected = selectedPiece?.x === col && selectedPiece?.y === row;
                
                return (
                  <button
                    key={`${row}-${col}`}
                    className={`chess-square ${isLight ? 'light' : 'dark'} ${isSelected ? 'selected' : ''} ${isValidMove ? 'valid-move' : ''}`}
                    onClick={() => handleSquareClick(col, row)}
                    aria-label={`${String.fromCharCode(97 + col)}${8 - row} ${piece ? piece.color + ' ' + piece.type : 'empty'}`}
                  >
                    {piece && (
                      <span className={`chess-piece ${piece.color}`}>
                        {PIECE_SYMBOLS[piece.color][piece.type]}
                      </span>
                    )}
                    {isValidMove && <span className="move-indicator" />}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      <div className="tactics-controls">
        <button 
          className="hint-button" 
          onClick={showHint}
          disabled={hintShown}
        >
          {hintShown ? 'Hint Used' : 'Show Hint (-15 pts)'}
        </button>
        
        <button 
          className="reset-button"
          onClick={() => {
            if (currentPuzzle) {
              setPieces([...currentPuzzle.setup]);
              setMoveHistory([]);
              setSelectedPiece(null);
              setFeedback(null);
            }
          }}
        >
          Reset Position
        </button>
      </div>

      {feedback && (
        <div className={`tactics-feedback ${feedback.includes('Correct') ? 'correct' : 'wrong'}`} role="alert">
          {feedback}
        </div>
      )}

      {moveHistory.length > 0 && (
        <div className="move-history">
          <span>Moves: {moveHistory.join(', ')}</span>
        </div>
      )}
    </div>
  );
});

export default ChessTactics;
