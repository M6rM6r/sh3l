import styled from 'styled-components';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const Container = styled.div`padding: 20px; max-width: 800px; margin: 0 auto;`;
const Title = styled.h1`font-size: 28px; color: #ffd700; margin-bottom: 24px; text-align: center;`;
const Grid = styled.div`display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 32px;`;
const Card = styled.div`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
`;
const CardValue = styled.div`font-size: 2.5rem; font-weight: 700; color: #ffd700;`;
const CardLabel = styled.div`color: #a0a0a0; font-size: 14px; margin-top: 4px;`;

const SectionTitle = styled.h2`font-size: 18px; color: #fff; margin-bottom: 12px;`;
const BarRow = styled.div`margin-bottom: 10px;`;
const BarLabel = styled.div`display: flex; justify-content: space-between; color: #a0a0a0; font-size: 13px; margin-bottom: 4px;`;
const BarBg = styled.div`background: rgba(255,255,255,0.1); border-radius: 6px; height: 10px;`;
const BarFill = styled.div<{ $pct: number; $color: string }>`
  background: ${p => p.$color};
  border-radius: 6px;
  height: 10px;
  width: ${p => p.$pct}%;
  transition: width 0.6s ease;
`;

const Analytics = () => {
  const { games } = useSelector((state: RootState) => state.game);

  const totalPlays = games.reduce((s, g) => s + g.timesPlayed, 0);
  const totalScore = games.reduce((s, g) => s + g.highScore, 0);
  const topGame = games.slice().sort((a, b) => b.highScore - a.highScore)[0];
  const maxScore = Math.max(...games.map(g => g.highScore), 1);

  const barColors = ['#ff6b35', '#ffd700', '#4ade80', '#60a5fa', '#a78bfa'];

  return (
    <Container>
      <Title>📊 تحليل الأداء</Title>

      <Grid>
        <Card>
          <CardValue>{totalPlays}</CardValue>
          <CardLabel>إجمالي الجلسات</CardLabel>
        </Card>
        <Card>
          <CardValue>{totalScore.toLocaleString()}</CardValue>
          <CardLabel>مجموع النقاط</CardLabel>
        </Card>
        <Card>
          <CardValue>{games.filter(g => g.timesPlayed > 0).length}</CardValue>
          <CardLabel>ألعاب جُرِّبت</CardLabel>
        </Card>
        <Card>
          <CardValue>{topGame?.name ?? '—'}</CardValue>
          <CardLabel>أفضل لعبة</CardLabel>
        </Card>
      </Grid>

      <SectionTitle>أعلى النقاط لكل لعبة</SectionTitle>
      {games.map((g, i) => (
        <BarRow key={g.id}>
          <BarLabel>
            <span>{g.name}</span>
            <span>{g.highScore.toLocaleString()}</span>
          </BarLabel>
          <BarBg>
            <BarFill $pct={(g.highScore / maxScore) * 100} $color={barColors[i % barColors.length]} />
          </BarBg>
        </BarRow>
      ))}
    </Container>
  );
};

export default Analytics;
