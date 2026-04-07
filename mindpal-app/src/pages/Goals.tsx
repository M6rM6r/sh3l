import React, { useState } from 'react';
import styled from 'styled-components';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

const Container = styled.div`padding: 24px; max-width: 700px; margin: 0 auto;`;
const Title = styled.h1`font-size: 28px; font-weight: 700; color: #fff; margin-bottom: 24px; text-align: center;`;

const GoalCard = styled.div`
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 14px;
  padding: 14px 18px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 14px;
`;
const GoalText = styled.div`flex: 1; color: #fff; font-size: 15px;`;
const Tag = styled.span<{ $color: string }>`
  font-size: 11px;
  background: ${p => p.$color};
  color: #fff;
  border-radius: 10px;
  padding: 2px 9px;
  margin-left: 6px;
  opacity: 0.9;
`;
const CheckBtn = styled.button<{ $done: boolean }>`
  width: 28px; height: 28px; border-radius: 50%;
  border: 2px solid ${p => p.$done ? '#22c55e' : 'rgba(255,255,255,0.3)'};
  background: ${p => p.$done ? '#22c55e' : 'transparent'};
  color: #fff; cursor: pointer; font-size: 14px; flex-shrink: 0;
`;
const DelBtn = styled.button`
  background: transparent; border: none; color: #f87171;
  cursor: pointer; font-size: 18px; padding: 0 4px;
`;

const AddForm = styled.form`display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px;`;
const Input = styled.input`
  flex: 1; min-width: 200px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 10px; padding: 9px 14px;
  color: #fff; font-size: 14px;
  &::placeholder { color: rgba(255,255,255,0.4); }
`;
const Select = styled.select`
  background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.2);
  border-radius: 10px; padding: 9px 14px; color: #fff; font-size: 14px;
`;
const AddBtn = styled.button`
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  border: none; border-radius: 10px; padding: 9px 22px;
  color: #fff; font-weight: 600; cursor: pointer;
`;
const SectionTitle = styled.h2`font-size: 17px; font-weight: 600; color: rgba(255,255,255,0.8); margin-bottom: 10px;`;
const Empty = styled.p`color: rgba(255,255,255,0.4); text-align: center; padding: 20px;`;
const ProfileRow = styled.div`margin-bottom: 8px;`;
const ProfileRowHeader = styled.div`
  display: flex;
  justify-content: space-between;
  color: rgba(255,255,255,0.6);
  font-size: 13px;
  margin-bottom: 4px;
`;
const ProfileName = styled.span`text-transform: capitalize;`;
const ProfileBar = styled.div`
  background: rgba(255,255,255,0.1);
  border-radius: 6px;
  height: 8px;
`;
const ProfileBarFill = styled.div<{ $color: string; $value: number }>`
  background: ${p => p.$color};
  border-radius: 6px;
  height: 8px;
  width: ${p => `${p.$value}%`};
  transition: width 0.5s;
`;

const AREAS: Record<string, string> = {
  memory: '#6366f1', language: '#ec4899',
  focus: '#f59e0b', math: '#22c55e', logic: '#06b6d4',
};

interface Goal { id: string; text: string; area: string; done: boolean; }

const Goals: React.FC = () => {
  const { profile } = useSelector((state: RootState) => state.user);
  const [goals, setGoals] = useState<Goal[]>([
    { id: '1', text: 'Play 3 games daily', area: 'memory', done: false },
    { id: '2', text: 'Reach 80% in Focus', area: 'focus', done: false },
  ]);
  const [text, setText] = useState('');
  const [area, setArea] = useState('memory');

  const addGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setGoals(g => [...g, { id: Date.now().toString(), text: text.trim(), area, done: false }]);
    setText('');
  };

  const toggle = (id: string) =>
    setGoals(g => g.map(goal => goal.id === id ? { ...goal, done: !goal.done } : goal));

  const remove = (id: string) =>
    setGoals(g => g.filter(goal => goal.id !== id));

  const pending = goals.filter(g => !g.done);
  const done = goals.filter(g => g.done);

  return (
    <Container>
      <Title>🎯 My Goals</Title>

      <SectionTitle>Cognitive Profile</SectionTitle>
      {Object.entries(profile.cognitiveProfile).map(([k, v]) => (
        <ProfileRow key={k}>
          <ProfileRowHeader>
            <ProfileName>{k}</ProfileName><span>{v}%</span>
          </ProfileRowHeader>
          <ProfileBar>
            <ProfileBarFill $color={AREAS[k] ?? '#6366f1'} $value={v} />
          </ProfileBar>
        </ProfileRow>
      ))}

      <SectionTitle style={{ marginTop: 28 }}>Add a New Goal</SectionTitle>
      <AddForm onSubmit={addGoal}>
        <Input aria-label="Goal description" placeholder="Describe your goal..." value={text} onChange={e => setText(e.target.value)} />
        <Select aria-label="Goal area" title="Goal area" value={area} onChange={e => setArea(e.target.value)}>
          {Object.keys(AREAS).map(a => <option key={a} value={a}>{a}</option>)}
        </Select>
        <AddBtn type="submit">+ Add</AddBtn>
      </AddForm>

      <SectionTitle>Active Goals ({pending.length})</SectionTitle>
      {pending.length === 0
        ? <Empty>No active goals yet</Empty>
        : pending.map(g => (
          <GoalCard key={g.id}>
            <CheckBtn $done={false} type="button" aria-label={`Mark goal \"${g.text}\" as complete`} title="Mark goal complete" onClick={() => toggle(g.id)}>○</CheckBtn>
            <GoalText>{g.text}<Tag $color={AREAS[g.area] ?? '#6366f1'}>{g.area}</Tag></GoalText>
            <DelBtn type="button" aria-label={`Delete goal \"${g.text}\"`} title="Delete goal" onClick={() => remove(g.id)}>✕</DelBtn>
          </GoalCard>
        ))
      }

      {done.length > 0 && (
        <>
          <SectionTitle style={{ marginTop: 20 }}>Completed ({done.length})</SectionTitle>
          {done.map(g => (
            <GoalCard key={g.id} style={{ opacity: 0.6 }}>
              <CheckBtn $done={true} type="button" aria-label={`Mark goal \"${g.text}\" as incomplete`} title="Mark goal incomplete" onClick={() => toggle(g.id)}>✓</CheckBtn>
              <GoalText style={{ textDecoration: 'line-through' }}>{g.text}<Tag $color={AREAS[g.area] ?? '#6366f1'}>{g.area}</Tag></GoalText>
              <DelBtn type="button" aria-label={`Delete goal \"${g.text}\"`} title="Delete goal" onClick={() => remove(g.id)}>✕</DelBtn>
            </GoalCard>
          ))}
        </>
      )}
    </Container>
  );
};

export default Goals;
