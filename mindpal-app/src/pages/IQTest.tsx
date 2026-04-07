import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

/* ─── Styles ─────────────────────────────────────────────── */
const Container = styled.div`padding: 24px; max-width: 640px; margin: 0 auto; text-align: center;`;
const Title = styled.h1`font-size: 30px; color: #a78bfa; margin-bottom: 8px;`;
const Subtitle = styled.p`color: rgba(255,255,255,0.5); font-size: 15px; margin-bottom: 32px; line-height: 1.5;`;

const IQCircle = styled(motion.div)`
  width: 190px; height: 190px; border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  margin: 0 auto 36px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 20px 60px rgba(99,102,241,0.4);
  .score { font-size: 52px; font-weight: 800; color: #fff; }
  .label { font-size: 15px; color: rgba(255,255,255,0.8); }
`;

const StartBtn = styled.button`
  padding: 14px 38px; border-radius: 28px; border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-size: 17px; font-weight: 600; cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover { transform: translateY(-3px); box-shadow: 0 10px 28px rgba(99,102,241,0.4); }
`;
const ResetBtn = styled.button`
  padding: 10px 24px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2);
  background: transparent; color: rgba(255,255,255,0.7); font-size: 14px; cursor: pointer;
  margin-top: 14px; display: block; margin-inline: auto;
  &:hover { background: rgba(255,255,255,0.08); }
`;

const Features = styled.div`display: grid; grid-template-columns: repeat(2,1fr); gap: 14px; margin-top: 36px;`;
const Feature = styled.div`
  background: rgba(255,255,255,0.06); border-radius: 14px; padding: 18px;
  .icon { font-size: 28px; margin-bottom: 8px; }
  .label { font-size: 13px; color: rgba(255,255,255,0.6); }
`;

/* ─── Quiz ───────────────────────────────────────────────── */
const QuizBox = styled.div`
  background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
  border-radius: 18px; padding: 28px;
`;
const QNum = styled.div`font-size: 12px; color: rgba(255,255,255,0.45); margin-bottom: 14px;`;
const QText = styled.div`font-size: 18px; color: #fff; font-weight: 600; margin-bottom: 24px; line-height: 1.5;`;
const Choices = styled.div`display: flex; flex-direction: column; gap: 10px;`;
const Choice = styled.button<{ $selected?: boolean; $correct?: boolean; $wrong?: boolean }>`
  padding: 12px 18px; border-radius: 12px; cursor: pointer; font-size: 15px;
  border: 1px solid ${p =>
    p.$correct ? '#22c55e' : p.$wrong ? '#ef4444' : p.$selected ? '#6366f1' : 'rgba(255,255,255,0.2)'};
  background: ${p =>
    p.$correct ? 'rgba(34,197,94,0.18)' : p.$wrong ? 'rgba(239,68,68,0.15)' :
    p.$selected ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'};
  color: #fff; transition: all 0.2s; text-align: left;
`;
const Progress = styled.div`
  background: rgba(255,255,255,0.1); border-radius: 6px; height: 6px; margin-bottom: 20px;
`;
const ProgressBar = styled.div<{ $pct: number }>`
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  height: 6px; border-radius: 6px; width: ${p => p.$pct}%; transition: width 0.4s;
`;
const NextBtn = styled.button`
  margin-top: 18px; padding: 12px 30px; border-radius: 24px; border: none;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
`;

/* ─── Data ───────────────────────────────────────────────── */
const QUESTIONS = [
  { q: 'Which number comes next? 2, 4, 8, 16, __', choices: ['20', '32', '24', '18'], answer: 1 },
  { q: 'If RED is coded as 27, what is BLUE coded as?', choices: ['44', '40', '43', '42'], answer: 3 },
  { q: 'Which shape completes the pattern: △ ○ △ ○ △ __', choices: ['△', '○', '□', '◇'], answer: 1 },
  { q: 'A bat and ball cost $1.10. The bat costs $1 more than the ball. How much is the ball?', choices: ['$0.05', '$0.10', '$0.15', '$0.20'], answer: 0 },
  { q: '3 workers build 3 houses in 3 days. How long for 6 workers to build 6 houses?', choices: ['6 days', '3 days', '1 day', '9 days'], answer: 1 },
  { q: 'All roses are flowers. Some flowers fade quickly. Therefore:', choices: ['All roses fade quickly', 'Some roses may fade quickly', 'No roses fade', 'Roses never fade'], answer: 1 },
  { q: 'What is 15% of 240?', choices: ['36', '32', '40', '30'], answer: 0 },
  { q: 'Which word is the odd one out? Eagle, Hawk, Salmon, Falcon', choices: ['Eagle', 'Hawk', 'Salmon', 'Falcon'], answer: 2 },
  { q: 'If 5 cats catch 5 mice in 5 minutes, how many cats to catch 100 mice in 100 minutes?', choices: ['100', '20', '5', '50'], answer: 2 },
  { q: 'Mirror: Reflection :: Poem: __', choices: ['Rhyme', 'Words', 'Expression', 'Sound'], answer: 2 },
];

/* ─── Component ──────────────────────────────────────────── */
type Phase = 'landing' | 'quiz' | 'result';

const IQTest = () => {
  const { profile } = useSelector((state: RootState) => state.user);
  const [phase, setPhase] = useState<Phase>('landing');
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [correct, setCorrect] = useState(0);

  // Estimate IQ from cognitive profile averages (80–140 range)
  const avgCognitive = Object.values(profile.cognitiveProfile).reduce((a, b) => a + b, 0) /
    Object.values(profile.cognitiveProfile).length;
  const estimatedIQ = Math.round(80 + avgCognitive * 0.6);

  const handleSelect = (idx: number) => {
    if (confirmed) return;
    setSelected(idx);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    if (selected === QUESTIONS[index].answer) setCorrect(c => c + 1);
    setConfirmed(true);
  };

  const handleNext = () => {
    if (index + 1 >= QUESTIONS.length) {
      setPhase('result');
    } else {
      setIndex(i => i + 1);
      setSelected(null);
      setConfirmed(false);
    }
  };

  const iqScore = Math.round(80 + (correct / QUESTIONS.length) * 60);

  const getLabel = (iq: number) => {
    if (iq >= 130) return 'Very Superior';
    if (iq >= 120) return 'Superior';
    if (iq >= 110) return 'High Average';
    if (iq >= 90) return 'Average';
    return 'Below Average';
  };

  if (phase === 'quiz') {
    const q = QUESTIONS[index];
    const pct = ((index) / QUESTIONS.length) * 100;
    return (
      <Container>
        <Title>🧠 IQ Test</Title>
        <Progress><ProgressBar $pct={pct} /></Progress>
        <QuizBox>
          <QNum>Question {index + 1} of {QUESTIONS.length}</QNum>
          <QText>{q.q}</QText>
          <Choices>
            {q.choices.map((c, i) => (
              <Choice
                key={i}
                $selected={selected === i && !confirmed}
                $correct={confirmed && i === q.answer}
                $wrong={confirmed && selected === i && i !== q.answer}
                onClick={() => handleSelect(i)}
              >
                {c}
              </Choice>
            ))}
          </Choices>
          {!confirmed
            ? <NextBtn onClick={handleConfirm} disabled={selected === null}>Confirm</NextBtn>
            : <NextBtn onClick={handleNext}>{index + 1 < QUESTIONS.length ? 'Next →' : 'See Results'}</NextBtn>
          }
        </QuizBox>
      </Container>
    );
  }

  if (phase === 'result') {
    return (
      <Container>
        <Title>Your IQ Score</Title>
        <IQCircle
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 180, damping: 18 }}
        >
          <span className="score">{iqScore}</span>
          <span className="label">IQ</span>
        </IQCircle>
        <Subtitle>
          <strong style={{ color: '#a78bfa' }}>{getLabel(iqScore)}</strong>
          <br />You answered {correct} out of {QUESTIONS.length} correctly.
        </Subtitle>
        <ResetBtn onClick={() => { setPhase('landing'); setIndex(0); setSelected(null); setConfirmed(false); setCorrect(0); }}>
          Retake Test
        </ResetBtn>
      </Container>
    );
  }

  return (
    <Container>
      <Title>🧠 IQ Test</Title>
      <Subtitle>
        Discover your cognitive intelligence quotient through scientific questions
        designed to assess memory, logic, focus, and reasoning.
      </Subtitle>

      <IQCircle
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <span className="score">{estimatedIQ}</span>
        <span className="label">Estimated IQ</span>
      </IQCircle>

      <StartBtn onClick={() => setPhase('quiz')}>Start Full Test</StartBtn>

      <Features>
        <Feature><div className="icon">🧠</div><div className="label">Memory</div></Feature>
        <Feature><div className="icon">⚡</div><div className="label">Processing Speed</div></Feature>
        <Feature><div className="icon">🎯</div><div className="label">Focus</div></Feature>
        <Feature><div className="icon">🔢</div><div className="label">Logic & Math</div></Feature>
      </Features>
    </Container>
  );
};

export default IQTest;
