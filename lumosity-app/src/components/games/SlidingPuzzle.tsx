import { useState, useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';

const pop = keyframes`from{transform:scale(1.12)}to{transform:scale(1)}`;

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 1rem;
`;

const Title = styled.div`
  font-size: 1rem;
  color: #a5b4fc;
`;

const Puzzle = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  padding: 14px;
  background: rgba(255,255,255,0.06);
  border-radius: 18px;
  border: 1px solid rgba(108,99,255,0.25);
`;

const Tile = styled.button<{ $empty: boolean; $popped: boolean }>`
  width: 80px;
  height: 80px;
  border: none;
  border-radius: 12px;
  background: ${p => p.$empty
    ? 'transparent'
    : 'linear-gradient(135deg,#6c63ff,#00d2ff)'};
  color: white;
  font-size: 1.8rem;
  font-weight: 700;
  cursor: ${p => p.$empty ? 'default' : 'pointer'};
  transition: background 0.2s;
  animation: ${p => p.$popped ? pop : 'none'} 0.2s ease;

  &:hover:not(:disabled) { filter: brightness(1.15); }
`;

const Stats = styled.div`
  display: flex;
  gap: 2rem;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.5);
`;

const WinMsg = styled.div`
  font-size: 1.4rem;
  color: #22c55e;
  font-weight: 700;
`;

interface Props { onComplete: (points: number) => void; }

const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0];

const isSolvable = (tiles: number[]) => {
  let inv = 0;
  const arr = tiles.filter(t => t !== 0);
  for (let i = 0; i < arr.length; i++)
    for (let j = i + 1; j < arr.length; j++)
      if (arr[i] > arr[j]) inv++;
  return inv % 2 === 0;
};

const makeShuffle = () => {
  let arr: number[];
  do {
    arr = [...GOAL].sort(() => Math.random() - 0.5);
  } while (!isSolvable(arr) || arr.join() === GOAL.join());
  return arr;
};

const adjacent = (i: number, empty: number) => {
  const r = Math.floor(i / 3), c = i % 3;
  const er = Math.floor(empty / 3), ec = empty % 3;
  return Math.abs(r - er) + Math.abs(c - ec) === 1;
};

const SlidingPuzzle = ({ onComplete }: Props) => {
  const [tiles, setTiles] = useState(() => makeShuffle());
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [solved, setSolved] = useState(false);
  const [lastPopped, setLastPopped] = useState<number | null>(null);

  useEffect(() => {
    if (solved) return;
    const id = setInterval(() => setTime(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [solved]);

  const handleClick = useCallback((idx: number) => {
    if (solved) return;
    const emptyIdx = tiles.indexOf(0);
    if (!adjacent(idx, emptyIdx)) return;

    setLastPopped(idx);
    setTimeout(() => setLastPopped(null), 200);

    const next = [...tiles];
    [next[idx], next[emptyIdx]] = [next[emptyIdx], next[idx]];
    setTiles(next);
    setMoves(m => m + 1);

    if (next.join() === GOAL.join()) {
      setSolved(true);
      const score = Math.max(2000 - moves * 15 - time * 5, 100);
      onComplete(score);
    }
  }, [tiles, solved, moves, time, onComplete]);

  const reset = () => {
    setTiles(makeShuffle());
    setMoves(0);
    setTime(0);
    setSolved(false);
  };

  return (
    <Wrapper>
      <Title>Slide tiles to arrange 1 → 8</Title>
      <Puzzle>
        {tiles.map((tile, i) => (
          <Tile
            key={i}
            $empty={tile === 0}
            $popped={lastPopped === i}
            onClick={() => handleClick(i)}
            disabled={tile === 0}
          >
            {tile !== 0 ? tile : ''}
          </Tile>
        ))}
      </Puzzle>
      {solved
        ? <WinMsg>🎉 Solved!</WinMsg>
        : <Stats><span>Moves: {moves}</span><span>Time: {time}s</span></Stats>}
      {solved && (
        <button
          onClick={reset}
          style={{
            padding: '8px 22px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg,#6c63ff,#00d2ff)',
            color: 'white', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Play again
        </button>
      )}
    </Wrapper>
  );
};

export default SlidingPuzzle;


