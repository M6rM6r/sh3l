import styled from 'styled-components';
import { motion } from 'framer-motion';
import { useState } from 'react';

const Container = styled.div`
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 40px;
  
  h1 {
    font-size: 32px;
    color: #ffd700;
    margin-bottom: 10px;
  }
  
  p {
    color: #a0a0a0;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  justify-content: center;
  
  button {
    padding: 12px 24px;
    border-radius: 25px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.05);
    color: white;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.3s;
    
    &.active, &:hover {
      background: linear-gradient(135deg, #ff6b35, #f7931e);
      border-color: transparent;
    }
  }
`;

const LeaderboardList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const LeaderboardItem = styled(motion.div)<{ $rank: number; $isMe?: boolean }>`
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: ${(props: { $isMe?: boolean }) => props.$isMe ? 'rgba(255, 107, 53, 0.2)' : 'rgba(255, 255, 255, 0.05)'};
  border: ${(props: { $isMe?: boolean }) => props.$isMe ? '1px solid rgba(255, 107, 53, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'};
  border-radius: 16px;
  
  .rank {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    background: ${(props: { $rank: number }) => {
      if (props.$rank === 1) return 'linear-gradient(135deg, #ffd700, #f7931e)';
      if (props.$rank === 2) return 'linear-gradient(135deg, #c0c0c0, #a0a0a0)';
      if (props.$rank === 3) return 'linear-gradient(135deg, #cd7f32, #b87333)';
      return 'rgba(255, 255, 255, 0.1)';
    }};
  }
  
  .avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff6b35, #ffd700);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }
  
  .info {
    flex: 1;
    
    .name {
      font-weight: 600;
      font-size: 16px;
      margin-bottom: 4px;
    }
    
    .level {
      font-size: 12px;
      color: #a0a0a0;
    }
  }
  
  .score {
    font-size: 24px;
    font-weight: 700;
    color: #ffd700;
  }
`;

const mockGlobalData = [
  { id: 1, name: 'أحمد', level: 45, score: 125000, avatar: '👤' },
  { id: 2, name: 'سارة', level: 42, score: 118000, avatar: '👩' },
  { id: 3, name: 'محمد', level: 38, score: 105000, avatar: '👨' },
  { id: 4, name: 'نور', level: 35, score: 98000, avatar: '👩' },
  { id: 5, name: 'علي', level: 33, score: 92000, avatar: '👨' },
  { id: 6, name: 'فاطمة', level: 30, score: 85000, avatar: '👩' },
  { id: 7, name: 'عمر', level: 28, score: 78000, avatar: '👨' },
  { id: 8, name: 'ليلى', level: 25, score: 65000, avatar: '👩' },
  { id: 9, name: 'يوسف', level: 22, score: 54000, avatar: '👨' },
  { id: 10, name: 'رنا', level: 20, score: 48000, avatar: '👩' },
];

const mockFriendsData: { id: number; name: string; level: number; score: number; avatar: string; isMe?: boolean }[] = [
  { id: 1, name: 'خالد', level: 28, score: 75000, avatar: '👨' },
  { id: 2, name: 'أنت', level: 15, score: 32000, avatar: '👤', isMe: true },
  { id: 3, name: 'منى', level: 12, score: 25000, avatar: '👩' },
  { id: 4, name: 'سامي', level: 10, score: 18000, avatar: '👨' },
  { id: 5, name: 'هدى', level: 8, score: 12000, avatar: '👩' },
];

const Leaderboard = () => {
  const [activeTab, setActiveTab] = useState<'global' | 'friends'>('global');
  
  const data: { id: number; name: string; level: number; score: number; avatar: string; isMe?: boolean }[] = activeTab === 'global' ? mockGlobalData : mockFriendsData;
  
  return (
    <Container>
      <Header>
        <h1>🏆 المتصدرين</h1>
        <p>تنافس مع اللاعبين من جميع أنحاء العالم</p>
      </Header>
      
      <Tabs>
        <button 
          className={activeTab === 'global' ? 'active' : ''}
          onClick={() => setActiveTab('global')}
        >
          🌍 العالمي
        </button>
        <button 
          className={activeTab === 'friends' ? 'active' : ''}
          onClick={() => setActiveTab('friends')}
        >
          👥 الأصدقاء
        </button>
      </Tabs>
      
      <LeaderboardList>
        {data.map((user, index) => (
          <LeaderboardItem
            key={user.id}
            $rank={index + 1}
            $isMe={user.isMe}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="rank">{index + 1}</div>
            <div className="avatar">{user.avatar}</div>
            <div className="info">
              <div className="name">{user.name}</div>
              <div className="level">المستوى {user.level}</div>
            </div>
            <div className="score">{user.score.toLocaleString()}</div>
          </LeaderboardItem>
        ))}
      </LeaderboardList>
    </Container>
  );
};

export default Leaderboard;
