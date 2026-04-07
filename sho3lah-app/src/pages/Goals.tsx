import React, { useState } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

// ---------------------------------------------------------------------------
// Styled components
// ---------------------------------------------------------------------------
const Container = styled.div`padding: 20px; max-width: 700px; margin: 0 auto;`;
const Title = styled.h1`font-size: 28px; color: #ffd700; margin-bottom: 24px; text-align: center;`;

const GoalCard = styled.div`
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
`;
const GoalText = styled.div`flex: 1; color: #fff; font-size: 15px;`;
const GoalArea = styled.span<{ $area: string }>`
  font-size: 12px;
  background: ${p => areaColor(p.$area)};
  color: #fff;
  border-radius: 10px;
  padding: 2px 10px;
  margin-left: 8px;
`;
const GoalCheck = styled.button<{ $done: boolean }>`
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid ${p => p.$done ? '#4ade80' : 'rgba(255,255,255,0.3)'};
  background: ${p => p.$done ? '#4ade80' : 'transparent'};
  color: #fff; cursor: pointer; font-size: 14px;
  flex-shrink: 0;
`;
const DelBtn = styled.button`
  background: transparent; border: none; color: #f87171;
  cursor: pointer; font-size: 18px; padding: 0 4px;
`;

const AddForm = styled.form`
  display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 24px;
`;
const Input = styled.input`
  flex: 1; min-width: 180px;
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px; padding: 8px 12px;
  color: #fff; font-size: 14px;
  &::placeholder { color: #666; }
`;
const Select = styled.select`
  background: rgba(255,255,255,0.07);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 8px; padding: 8px 12px;
  color: #fff; font-size: 14px;
`;
const AddBtn = styled.button`
  background: linear-gradient(135deg, #ff6b35, #ffd700);
  border: none; border-radius: 8px; padding: 8px 20px;
  color: #fff; font-weight: 600; cursor: pointer;
`;
const SectionTitle = styled.h2`font-size: 18px; color: #fff; margin-bottom: 12px;`;
const Empty = styled.p`color: #666; text-align: center; padding: 20px;`;
const ProfileRow = styled.div`margin-bottom: 8px;`;
const ProfileRowHeader = styled.div`
  display: flex;
  justify-content: space-between;
  color: #a0a0a0;
  font-size: 13px;
  margin-bottom: 3px;
`;
const ProfileBar = styled.div`
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  height: 8px;
`;
const ProfileBarFill = styled.div<{ $area: string; $value: number }>`
  background: ${p => areaColor(p.$area)};
  border-radius: 6px;
  height: 8px;
  width: ${p => `${p.$value}%`};
  transition: width 0.5s;
`;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const AREAS = ['memory', 'speed', 'attention', 'logic', 'math'] as const;
type Area = typeof AREAS[number];

function areaColor(area: string): string {
  const map: Record<string, string> = {
    memory: '#6366f1', speed: '#f59e0b', attention: '#ec4899',
    logic: '#06b6d4', math: '#22c55e',
  };
  return map[area] ?? '#a0a0a0';
}

interface Goal { id: string; text: string; area: Area; done: boolean; }

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const Goals: React.FC = () => {
  const cognitiveProfile = useSelector((state: RootState) => state.user.cognitiveProfile);
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', text: 'ألعب 3 ألعاب يومياً', area: 'memory', done: false },
    { id: '2', text: 'تحسين درجة السرعة إلى 80', area: 'speed', done: false },
  ]);
  const [text, setText] = useState('');
  const [area, setArea] = useState<Area>('memory');

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setGoals(g => [...g, { id: Date.now().toString(), text: text.trim(), area, done: false }]);
    setText('');
  };

  const toggleDone = (id: string) =>
    setGoals(g => g.map(goal => goal.id === id ? { ...goal, done: !goal.done } : goal));

  const deleteGoal = (id: string) =>
    setGoals(g => g.filter(goal => goal.id !== id));

  const pending = goals.filter(g => !g.done);
  const done = goals.filter(g => g.done);

  return (
    <Container>
      <Title>🎯 أهدافي</Title>

      {/* Profile snapshot */}
      <SectionTitle>ملف الأداء المعرفي</SectionTitle>
      {Object.entries(cognitiveProfile).map(([k, v]) => (
        <ProfileRow key={k}>
          <ProfileRowHeader>
            <span>{k}</span><span>{v}%</span>
          </ProfileRowHeader>
          <ProfileBar>
            <ProfileBarFill $area={k} $value={v} />
          </ProfileBar>
        </ProfileRow>
      ))}

      {/* Add goal */}
      <SectionTitle style={{ marginTop: 28 }}>إضافة هدف جديد</SectionTitle>
      <AddForm onSubmit={addGoal}>
        <Input
          aria-label="Goal description"
          placeholder="اكتب هدفك هنا..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <Select aria-label="Goal area" title="Goal area" value={area} onChange={e => setArea(e.target.value as Area)}>
          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
        <AddBtn type="submit">+ إضافة</AddBtn>
      </AddForm>

      {/* Pending goals */}
      <SectionTitle>الأهداف النشطة ({pending.length})</SectionTitle>
      {pending.length === 0
        ? <Empty>لا توجد أهداف نشطة</Empty>
        : pending.map(g => (
          <GoalCard key={g.id}>
            <GoalCheck $done={false} type="button" aria-label={`تحديد الهدف ${g.text} كمكتمل`} title="تحديد كمكتمل" onClick={() => toggleDone(g.id)}>○</GoalCheck>
            <GoalText>{g.text}<GoalArea $area={g.area}>{g.area}</GoalArea></GoalText>
            <DelBtn type="button" aria-label={`حذف الهدف ${g.text}`} title="حذف الهدف" onClick={() => deleteGoal(g.id)}>✕</DelBtn>
          </GoalCard>
        ))
      }

      {/* Completed goals */}
      {done.length > 0 && (
        <>
          <SectionTitle style={{ marginTop: 20 }}>المكتملة ({done.length})</SectionTitle>
          {done.map(g => (
            <GoalCard key={g.id} style={{ opacity: 0.6 }}>
              <GoalCheck $done={true} type="button" aria-label={`تحديد الهدف ${g.text} كغير مكتمل`} title="تحديد كغير مكتمل" onClick={() => toggleDone(g.id)}>✓</GoalCheck>
              <GoalText style={{ textDecoration: 'line-through' }}>{g.text}<GoalArea $area={g.area}>{g.area}</GoalArea></GoalText>
              <DelBtn type="button" aria-label={`حذف الهدف ${g.text}`} title="حذف الهدف" onClick={() => deleteGoal(g.id)}>✕</DelBtn>
            </GoalCard>
          ))}
        </>
      )}
    </Container>
  );
};

export default Goals;
