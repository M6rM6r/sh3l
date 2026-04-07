import { useState, useCallback } from 'react';
import styled from 'styled-components';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
  padding: 1rem;
`;

const Scrambled = styled.div`
  font-size: 2.4rem;
  font-weight: 700;
  letter-spacing: 0.55rem;
  color: #e0d7ff;
  text-shadow: 0 0 20px rgba(108,99,255,0.5);
`;

const Options = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  max-width: 420px;
  width: 100%;
`;

const Btn = styled.button<{ $state: 'idle' | 'correct' | 'wrong' }>`
  padding: 1rem 1.25rem;
  border: none;
  border-radius: 14px;
  background: ${p =>
    p.$state === 'correct' ? 'linear-gradient(135deg,#22c55e,#16a34a)' :
    p.$state === 'wrong'   ? 'linear-gradient(135deg,#ef4444,#dc2626)' :
    'rgba(255,255,255,0.1)'};
  color: white;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.25s, transform 0.15s;
  &:hover:not(:disabled) { transform: scale(1.03); background: rgba(108,99,255,0.3); }
  &:disabled { cursor: default; }
`;

const StatusRow = styled.div`
  font-size: 0.95rem;
  color: rgba(255,255,255,0.55);
  display: flex;
  gap: 1.5rem;
`;

interface Props { onComplete: (points: number) => void; }

const WORDS = [
  { scrambled: 'LEPHANTE', answer: 'ELEPHANT',  options: ['ELEPHANT',  'LEOPHANT', 'PANTHER',  'TELEPATH']  },
  { scrambled: 'ACDEMY',   answer: 'ACADEMY',   options: ['ACADEMY',   'DECAY',    'MEDICARE', 'ACEDIA']    },
  { scrambled: 'AINBOWR',  answer: 'RAINBOW',   options: ['RAINBOW',   'BROWNIE',  'WAINBOR',  'ARBITON']   },
  { scrambled: 'YZNAOLAE', answer: 'ANALYZE',   options: ['ANALYZE',   'LAZYONE',  'ZEALOT',   'NAIVELY']   },
  { scrambled: 'TINNOAVO', answer: 'INNOVATE',  options: ['INNOVATE',  'OVATION',  'NATIVEON', 'NOVATION']  },
  { scrambled: 'CBLRAA',   answer: 'RASCAL',    options: ['RASCAL',    'SCALAR',   'CRABBAL',  'ABRACAL']    },
  { scrambled: 'SPAEYL',   answer: 'PLEASE',    options: ['PLEASE',    'LEAPS',    'SLEEPY',   'PLANES']    },
  { scrambled: 'RTCHEAM',  answer: 'MARTECH',   options: ['MARTECH',   'MATCHER',  'REMATCH',  'CHARTER']   },
];

const TOTAL_ROUNDS = 5;

const WordUnscramble = ({ onComplete }: Props) => {
  const pickWord = useCallback(() => WORDS[Math.floor(Math.random() * WORDS.length)], []);

  const [wordDef, setWordDef] = useState(() => pickWord());
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [btnState, setBtnState] = useState<Record<string, 'idle' | 'correct' | 'wrong'>>({});

  const handleAnswer = (option: string) => {
    const correct = option === wordDef.answer;
    setBtnState({ [option]: correct ? 'correct' : 'wrong',
                  ...(correct ? {} : { [wordDef.answer]: 'correct' }) });

    setTimeout(() => {
      const nextScore = score + (correct ? 100 : 0);
      if (round >= TOTAL_ROUNDS) {
        onComplete(nextScore);
      } else {
        setScore(nextScore);
        setRound(r => r + 1);
        setWordDef(pickWord());
        setBtnState({});
      }
    }, 700);
  };

  return (
    <Wrapper>
      <StatusRow>
        <span>Round {round}/{TOTAL_ROUNDS}</span>
        <span>⭐ {score}</span>
      </StatusRow>
      <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.85rem' }}>Unscramble the word</div>
      <Scrambled>{wordDef.scrambled}</Scrambled>
      <Options>
        {wordDef.options.map(opt => (
          <Btn
            key={opt}
            $state={btnState[opt] ?? 'idle'}
            onClick={() => handleAnswer(opt)}
            disabled={Object.keys(btnState).length > 0}
          >
            {opt}
          </Btn>
        ))}
      </Options>
    </Wrapper>
  );
};

export default WordUnscramble;


