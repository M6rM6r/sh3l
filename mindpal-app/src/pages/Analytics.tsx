import styled from 'styled-components';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const Container = styled.div`padding: 24px; max-width: 800px; margin: 0 auto;`;
const Title = styled.h1`font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 24px; text-align: center;`;
const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 32px;`;

const StatCard = styled.div`
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
`;
const StatValue = styled.div`font-size: 2.2rem; font-weight: 800; color: #fff;`;
const StatLabel = styled.div`color: rgba(255,255,255,0.6); font-size: 13px; margin-top: 4px;`;

const SectionTitle = styled.h2`font-size: 18px; font-weight: 600; color: #fff; margin-bottom: 14px;`;
const BarRow = styled.div`margin-bottom: 12px;`;
const BarLabel = styled.div`display: flex; justify-content: space-between; color: rgba(255,255,255,0.7); font-size: 13px; margin-bottom: 5px;`;
const BarBg = styled.div`background: rgba(255,255,255,0.1); border-radius: 8px; height: 10px;`;
const BarFill = styled.div<{ $pct: number; $color: string }>`
  background: ${p => p.$color};
  border-radius: 8px;
  height: 10px;
  width: ${p => p.$pct}%;
  transition: width 0.6s ease;
`;

const AREA_COLORS: Record<string, string> = {
  memory: '#6366f1',
  language: '#ec4899',
  focus: '#f59e0b',
  math: '#22c55e',
  logic: '#06b6d4',
};

const Analytics = () => {
  const { games } = useSelector((state: RootState) => state.game);
  const { profile, dailyProgress } = useSelector((state: RootState) => state.user);

  const totalPlays = games.reduce((s, g) => s + g.timesPlayed, 0);
  const totalScore = games.reduce((s, g) => s + g.highScore, 0);
  const maxScore = Math.max(...games.map(g => g.highScore), 1);

  return (
    <Container>
      <Title>📊 Analytics</Title>

      <Grid>
        <StatCard>
          <StatValue>{totalPlays}</StatValue>
          <StatLabel>Total Sessions</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{totalScore.toLocaleString()}</StatValue>
          <StatLabel>All-Time Score</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{profile.streak}</StatValue>
          <StatLabel>Day Streak 🔥</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{dailyProgress.xpEarned}</StatValue>
          <StatLabel>XP Today</StatLabel>
        </StatCard>
      </Grid>

      <SectionTitle>Game High Scores</SectionTitle>
      {games.map(g => (
        <BarRow key={g.id}>
          <BarLabel>
            <span>{g.icon} {g.name}</span>
            <span>{g.highScore.toLocaleString()}</span>
          </BarLabel>
          <BarBg>
            <BarFill $pct={(g.highScore / maxScore) * 100} $color={AREA_COLORS[g.id] ?? '#6366f1'} />
          </BarBg>
        </BarRow>
      ))}

      <SectionTitle style={{ marginTop: 28 }}>Cognitive Profile</SectionTitle>
      {Object.entries(profile.cognitiveProfile).map(([k, v]) => (
        <BarRow key={k}>
          <BarLabel><span style={{ textTransform: 'capitalize' }}>{k}</span><span>{v}%</span></BarLabel>
          <BarBg>
            <BarFill $pct={v} $color={AREA_COLORS[k] ?? '#6366f1'} />
          </BarBg>
        </BarRow>
      ))}
    </Container>
  );
};

export default Analytics;
