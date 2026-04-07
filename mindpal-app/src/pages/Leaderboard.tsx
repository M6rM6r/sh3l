import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const Container = styled.div`padding: 24px; max-width: 800px; margin: 0 auto;`;
const Header = styled.div`
  text-align: center; margin-bottom: 36px;
  h1 { font-size: 32px; color: #a78bfa; margin-bottom: 8px; }
  p { color: rgba(255,255,255,0.5); }
`;
const Tabs = styled.div`display: flex; gap: 12px; margin-bottom: 28px; justify-content: center;`;
const Tab = styled.button<{ $active: boolean }>`
  padding: 10px 22px; border-radius: 22px;
  border: 1px solid ${p => p.$active ? 'transparent' : 'rgba(255,255,255,0.2)'};
  background: ${p => p.$active ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.05)'};
  color: #fff; font-size: 14px; cursor: pointer; transition: all 0.25s;
`;
const List = styled.div`display: flex; flex-direction: column; gap: 10px;`;
const Item = styled(motion.div)<{ $rank: number; $isMe?: boolean }>`
  display: flex; align-items: center; gap: 18px;
  padding: 18px 20px;
  background: ${p => p.$isMe ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)'};
  border: 1px solid ${p => p.$isMe ? 'rgba(99,102,241,0.5)' : 'rgba(255,255,255,0.1)'};
  border-radius: 16px;
`;
const Rank = styled.div<{ $rank: number }>`
  width: 38px; height: 38px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-weight: 700; font-size: 16px; flex-shrink: 0;
  background: ${p =>
    p.$rank === 1 ? 'linear-gradient(135deg,#ffd700,#f59e0b)' :
    p.$rank === 2 ? 'linear-gradient(135deg,#c0c0c0,#9ca3af)' :
    p.$rank === 3 ? 'linear-gradient(135deg,#cd7f32,#b45309)' :
    'rgba(255,255,255,0.1)'};
`;
const Avatar = styled.div`
  width: 46px; height: 46px; border-radius: 50%; font-size: 22px; flex-shrink: 0;
  background: linear-gradient(135deg,#6366f1,#8b5cf6);
  display: flex; align-items: center; justify-content: center;
`;
const Info = styled.div`flex: 1;`;
const Name = styled.div`font-weight: 600; font-size: 15px; color: #fff; margin-bottom: 3px;`;
const Level = styled.div`font-size: 12px; color: rgba(255,255,255,0.5);`;
const Score = styled.div`font-size: 22px; font-weight: 700; color: #a78bfa;`;

const MOCK_GLOBAL = [
  { id: 1, name: 'Alex K.', level: 48, score: 132000, avatar: '🧑', isMe: false },
  { id: 2, name: 'Sara M.', level: 44, score: 121000, avatar: '👩', isMe: false },
  { id: 3, name: 'James T.', level: 41, score: 114000, avatar: '👨', isMe: false },
  { id: 4, name: 'You', level: 35, score: 98000, avatar: '🧠', isMe: true },
  { id: 5, name: 'Nora P.', level: 32, score: 87000, avatar: '👩', isMe: false },
  { id: 6, name: 'Liam D.', level: 28, score: 75000, avatar: '👤', isMe: false },
];
const MOCK_WEEKLY = [
  { id: 1, name: 'You', level: 35, score: 5400, avatar: '🧠', isMe: true },
  { id: 2, name: 'Sara M.', level: 44, score: 4900, avatar: '👩', isMe: false },
  { id: 3, name: 'Liam D.', level: 28, score: 3200, avatar: '👤', isMe: false },
  { id: 4, name: 'James T.', level: 41, score: 2800, avatar: '👨', isMe: false },
];

const Leaderboard = () => {
  const [tab, setTab] = useState<'global' | 'weekly'>('global');
  const data = tab === 'global' ? MOCK_GLOBAL : MOCK_WEEKLY;

  return (
    <Container>
      <Header>
        <h1>🏆 Leaderboard</h1>
        <p>See how you rank against other MindPal users</p>
      </Header>

      <Tabs>
        <Tab $active={tab === 'global'} onClick={() => setTab('global')}>Global</Tab>
        <Tab $active={tab === 'weekly'} onClick={() => setTab('weekly')}>This Week</Tab>
      </Tabs>

      <List>
        {data.map((entry, i) => (
          <Item
            key={entry.id}
            $rank={i + 1}
            $isMe={entry.isMe}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <Rank $rank={i + 1}>{i + 1}</Rank>
            <Avatar>{entry.avatar}</Avatar>
            <Info>
              <Name>{entry.name}{entry.isMe && ' (you)'}</Name>
              <Level>Level {entry.level}</Level>
            </Info>
            <Score>{entry.score.toLocaleString()}</Score>
          </Item>
        ))}
      </List>
    </Container>
  );
};

export default Leaderboard;
