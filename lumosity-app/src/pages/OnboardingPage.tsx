import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import type { RootState } from '../store/store';
import { updateCognitiveProfile } from '../store/slices/userSlice';
import { apiBaseUrl } from '../config/env';

const Container = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: linear-gradient(135deg, #0d0d1a 0%, #1a0533 50%, #0d1a33 100%);
`;

const Card = styled.div`
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 48px 40px;
  width: 100%;
  max-width: 520px;
`;

const ProgressBar = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 40px;
`;

const ProgressDot = styled.div<{ $active: boolean; $done: boolean }>`
  flex: 1;
  height: 4px;
  border-radius: 2px;
  background: ${({ $active, $done }) =>
    $done ? '#7c3aed' : $active ? 'linear-gradient(90deg, #7c3aed, #06b6d4)' : 'rgba(255,255,255,0.15)'};
  transition: background 0.3s;
`;

const StepTitle = styled.h2`
  font-size: 24px;
  color: #fff;
  margin: 0 0 8px;
`;

const StepSubtitle = styled.p`
  color: rgba(255, 255, 255, 0.55);
  font-size: 15px;
  margin: 0 0 32px;
`;

const OptionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 32px;
`;

const OptionCard = styled(motion.div)<{ $selected: boolean }>`
  padding: 18px 16px;
  border-radius: 14px;
  border: 2px solid ${({ $selected }) => ($selected ? '#7c3aed' : 'rgba(255,255,255,0.1)')};
  background: ${({ $selected }) =>
    $selected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)'};
  cursor: pointer;
  text-align: center;
  transition: border-color 0.2s, background 0.2s;

  .icon {
    font-size: 32px;
    margin-bottom: 8px;
  }

  .label {
    color: #fff;
    font-size: 15px;
    font-weight: 600;
  }

  .desc {
    color: rgba(255,255,255,0.45);
    font-size: 12px;
    margin-top: 4px;
  }
`;

const TimeOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 32px;
`;

const TimeOption = styled(motion.div)<{ $selected: boolean }>`
  padding: 16px 20px;
  border-radius: 14px;
  border: 2px solid ${({ $selected }) => ($selected ? '#7c3aed' : 'rgba(255,255,255,0.1)')};
  background: ${({ $selected }) =>
    $selected ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)'};
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: border-color 0.2s, background 0.2s;

  .minutes {
    font-size: 22px;
    font-weight: 700;
    color: #7c3aed;
    min-width: 40px;
  }

  .info {
    .label { color: #fff; font-size: 15px; font-weight: 600; }
    .hint { color: rgba(255,255,255,0.45); font-size: 12px; margin-top: 2px; }
  }
`;

const SummaryBox = styled.div`
  background: rgba(124, 58, 237, 0.1);
  border: 1px solid rgba(124, 58, 237, 0.3);
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 32px;

  h3 { color: #fff; font-size: 18px; margin: 0 0 16px; }

  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 10px;
    color: rgba(255,255,255,0.8);
    font-size: 15px;

    .key { color: rgba(255,255,255,0.45); width: 110px; flex-shrink: 0; }
  }
`;

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
`;

const PrimaryBtn = styled(motion.button)`
  flex: 1;
  padding: 15px;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
`;

const SecondaryBtn = styled(motion.button)`
  padding: 15px 20px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.2);
  background: transparent;
  color: rgba(255,255,255,0.6);
  font-size: 16px;
  cursor: pointer;
  font-family: inherit;
`;

const GOALS = [
  { id: 'memory', icon: '🧩', label: 'Memory', desc: 'Improve recall & retention' },
  { id: 'speed', icon: '⚡', label: 'Speed', desc: 'React faster under pressure' },
  { id: 'focus', icon: '🎯', label: 'Focus', desc: 'Stay sharp & attentive' },
  { id: 'logic', icon: '🔬', label: 'Logic', desc: 'Sharpen reasoning skills' },
  { id: 'language', icon: '📚', label: 'Language', desc: 'Expand vocabulary & fluency' },
  { id: 'overall', icon: '🏆', label: 'Overall', desc: 'Balanced brain training' },
];

const TIME_OPTIONS = [
  { minutes: 5, label: 'Quick session', hint: 'Perfect for busy days' },
  { minutes: 10, label: 'Standard session', hint: 'Recommended for steady progress' },
  { minutes: 20, label: 'Deep session', hint: 'Challenge yourself' },
  { minutes: 30, label: 'Marathon', hint: 'Maximum brain workout' },
];

const API_URL = apiBaseUrl || 'http://localhost:8000';

const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const username = useSelector((state: RootState) => state.user.username);
  const [step, setStep] = useState(0);
  const [goals, setGoals] = useState<string[]>([]);
  const [dailyMinutes, setDailyMinutes] = useState<number>(10);
  const [saving, setSaving] = useState(false);

  const toggleGoal = (id: string) => {
    setGoals(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id].slice(0, 3)
    );
  };

  const handleFinish = async () => {
    setSaving(true);

    // Seed cognitive profile based on selected goals
    const GOAL_MAP: Record<string, Partial<{ memory: number; speed: number; attention: number; flexibility: number; problemSolving: number }>> = {
      memory:   { memory: 70 },
      speed:    { speed: 70 },
      focus:    { attention: 70 },
      logic:    { flexibility: 70, problemSolving: 70 },
      language: { flexibility: 65 },
      overall:  { memory: 60, speed: 60, attention: 60, flexibility: 60, problemSolving: 60 },
    };
    const profileUpdate = goals.reduce((acc, g) => ({ ...acc, ...(GOAL_MAP[g] ?? {}) }), {} as Partial<{ memory: number; speed: number; attention: number; flexibility: number; problemSolving: number }>);
    if (Object.keys(profileUpdate).length > 0) {
      dispatch(updateCognitiveProfile(profileUpdate));
    }

    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch(`${API_URL}/api/goals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            goal_type: goals[0] ?? 'overall',
            target_value: dailyMinutes,
            target_date: new Date(Date.now() + 30 * 86400000).toISOString(),
          }),
        });
      }
    } catch (_) {
      // Non-critical, proceed anyway
    } finally {
      setSaving(false);
      localStorage.setItem('ygy_onboarded', 'true');
      navigate('/dashboard', { replace: true });
    }
  };

  const TOTAL_STEPS = 3;

  return (
    <Container>
      <Card>
        <ProgressBar>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <ProgressDot key={i} $active={i === step} $done={i < step} />
          ))}
        </ProgressBar>

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
            >
              <StepTitle>Hi{username ? `, ${username}` : ''}! 👋</StepTitle>
              <StepSubtitle>What are your brain training goals? Pick up to 3.</StepSubtitle>

              <OptionGrid>
                {GOALS.map(g => (
                  <OptionCard
                    key={g.id}
                    $selected={goals.includes(g.id)}
                    onClick={() => toggleGoal(g.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <div className="icon">{g.icon}</div>
                    <div className="label">{g.label}</div>
                    <div className="desc">{g.desc}</div>
                  </OptionCard>
                ))}
              </OptionGrid>

              <PrimaryBtn
                onClick={() => setStep(1)}
                disabled={goals.length === 0}
                whileHover={{ scale: goals.length > 0 ? 1.02 : 1 }}
                whileTap={{ scale: goals.length > 0 ? 0.98 : 1 }}
              >
                Continue →
              </PrimaryBtn>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
            >
              <StepTitle>Daily commitment</StepTitle>
              <StepSubtitle>How many minutes can you train each day?</StepSubtitle>

              <TimeOptions>
                {TIME_OPTIONS.map(t => (
                  <TimeOption
                    key={t.minutes}
                    $selected={dailyMinutes === t.minutes}
                    onClick={() => setDailyMinutes(t.minutes)}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <span className="minutes">{t.minutes}m</span>
                    <div className="info">
                      <div className="label">{t.label}</div>
                      <div className="hint">{t.hint}</div>
                    </div>
                  </TimeOption>
                ))}
              </TimeOptions>

              <ButtonRow>
                <SecondaryBtn onClick={() => setStep(0)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Back
                </SecondaryBtn>
                <PrimaryBtn onClick={() => setStep(2)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Continue →
                </PrimaryBtn>
              </ButtonRow>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -40, opacity: 0 }}
            >
              <StepTitle>You're all set! 🎉</StepTitle>
              <StepSubtitle>Here's your personalised training plan.</StepSubtitle>

              <SummaryBox>
                <h3>My Plan</h3>
                <div className="row">
                  <span className="key">Goals</span>
                  <span>{goals.map(g => GOALS.find(x => x.id === g)?.icon).join(' ')} {goals.join(', ')}</span>
                </div>
                <div className="row">
                  <span className="key">Daily time</span>
                  <span>{dailyMinutes} minutes / day</span>
                </div>
                <div className="row">
                  <span className="key">Starting level</span>
                  <span>Adaptive — adjusts as you play</span>
                </div>
                <div className="row">
                  <span className="key">Plan</span>
                  <span>Free (upgrade anytime)</span>
                </div>
              </SummaryBox>

              <ButtonRow>
                <SecondaryBtn onClick={() => setStep(1)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  Back
                </SecondaryBtn>
                <PrimaryBtn
                  onClick={handleFinish}
                  disabled={saving}
                  whileHover={{ scale: saving ? 1 : 1.02 }}
                  whileTap={{ scale: saving ? 1 : 0.98 }}
                >
                  {saving ? 'Saving…' : 'Start Training 🚀'}
                </PrimaryBtn>
              </ButtonRow>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </Container>
  );
};

export default OnboardingPage;


