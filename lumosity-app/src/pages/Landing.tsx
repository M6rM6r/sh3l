import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from '../components/LanguageSwitcher';

type GameCategory = 'all' | 'memory' | 'logic' | 'speed' | 'math' | 'focus' | 'language';

const ALL_GAMES: { id: string; name: string; emoji: string; color: string; category: Exclude<GameCategory, 'all'>; desc: string }[] = [
  { id: 'memory_match',        name: 'Memory Match',     emoji: '🃏', color: '#ab47bc', category: 'memory',   desc: 'Match pairs before time runs out' },
  { id: 'number_sequence',     name: 'Number Sequence',  emoji: '🔢', color: '#1e88e5', category: 'logic',    desc: 'Remember and repeat number sequences' },
  { id: 'pipe_connection',     name: 'Pipe Connection',  emoji: '🔧', color: '#43a047', category: 'logic',    desc: 'Connect pipes from start to finish' },
  { id: 'pattern_recognition', name: 'Pattern Match',    emoji: '🔷', color: '#00acc1', category: 'logic',    desc: 'Identify the odd pattern out' },
  { id: 'logic_grid',          name: 'Logic Grid',       emoji: '🧩', color: '#e91e63', category: 'logic',    desc: 'Solve logical deduction puzzles' },
  { id: 'code_breaker',        name: 'Code Breaker',     emoji: '💻', color: '#ff5722', category: 'logic',    desc: 'Crack the color code sequence' },
  { id: 'tower_of_hanoi',      name: 'Tower of Hanoi',   emoji: '🗼', color: '#795548', category: 'logic',    desc: 'Classic disk stacking puzzle' },
  { id: 'color_harmony',       name: 'Color Harmony',    emoji: '🎨', color: '#e91e63', category: 'focus',    desc: 'Match RGB colors using sliders' },
  { id: 'math_marathon',       name: 'Math Marathon',    emoji: '➕', color: '#3f51b5', category: 'math',     desc: 'Solve math problems against the clock' },
  { id: 'shape_shifter',       name: 'Shape Shifter',    emoji: '⬡',  color: '#009688', category: 'focus',   desc: 'Find and click all matching shapes' },
  { id: 'rhythm_blocks',       name: 'Rhythm Blocks',    emoji: '🥁', color: '#ff4081', category: 'focus',    desc: 'Hit blocks to the beat' },
  { id: 'maze_runner',         name: 'Maze Runner',      emoji: '🌀', color: '#ff9800', category: 'speed',    desc: 'Navigate through challenging mazes' },
  { id: 'bubble_sort',         name: 'Bubble Sort',      emoji: '🫧', color: '#29b6f6', category: 'logic',    desc: 'Sort numbers by swapping pairs' },
  { id: 'quick_reflexes',      name: 'Quick Reflexes',   emoji: '⚡', color: '#ffd600', category: 'speed',    desc: 'Click targets before they vanish' },
  { id: 'chess',               name: 'Chess',             emoji: '♟', color: '#7c6f9f', category: 'logic',   desc: 'Play chess against the AI' },
];

const CATEGORY_TABS: { id: GameCategory; label: string }[] = [
  { id: 'all',      label: 'All Games' },
  { id: 'memory',   label: '🧠 Memory'   },
  { id: 'logic',    label: '🧩 Logic'    },
  { id: 'speed',    label: '⚡ Speed'    },
  { id: 'math',     label: '➕ Math'     },
  { id: 'focus',    label: '🎯 Focus'    },
  { id: 'language', label: '📝 Language' },
];

const Landing: React.FC = () => {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState<GameCategory>('all');

  return (
    <div className="landing">
      <nav className="nav">
        <a href="#" className="logo">Ygy</a>
        <ul className="nav-links">
          <li><a href="#games">{t('landing.sections.games.title')}</a></li>
          <li><Link to="/login">Log In</Link></li>
          <li><LanguageSwitcher /></li>
          <li><Link to="/dashboard" className="btn-primary">{t('landing.hero.cta')}</Link></li>
        </ul>
      </nav>

      <div id="games" className="section landing-games-section">
        <div className="landing-category-tabs">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              className={`landing-cat-btn${activeCategory === tab.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="landing-games-grid">
          {ALL_GAMES
            .filter(g => activeCategory === 'all' || g.category === activeCategory)
            .map(game => (
              <Link
                to={`/game/${game.id}`}
                key={game.id}
                className="landing-game-card"
                style={{ '--game-color': game.color } as React.CSSProperties}
              >
                <span className="landing-game-emoji">{game.emoji}</span>
                <span className="landing-game-name">{game.name}</span>
                <span className="landing-game-desc">{game.desc}</span>
                <span className="landing-game-category">{game.category}</span>
              </Link>
            ))}
        </div>
      </div>

      <footer>
        <div className="footer-copy">© 2026 Ygy. All rights reserved.</div>
      </footer>
    </div>
  );
};

export default Landing;
