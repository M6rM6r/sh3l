import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import LanguageSwitcher from '../components/LanguageSwitcher';
import StreakWidget from '../components/StreakWidget';

type GameCategory = 'all' | 'memory' | 'logic' | 'speed' | 'math' | 'focus' | 'language';

const ALL_GAMES: { id: string; name: string; emoji: string; color: string; category: Exclude<GameCategory, 'all'>; desc: string }[] = [
  // Classic games
  { id: 'memory',              name: 'Memory Matrix',     emoji: '🧠', color: '#ab47bc', category: 'memory',   desc: 'Test your spatial working memory' },
  { id: 'speed',               name: 'Speed Match',       emoji: '⚡', color: '#43a047', category: 'speed',    desc: 'Match rapidly changing symbols' },
  { id: 'attention',           name: 'Train of Thought',  emoji: '🚂', color: '#1e88e5', category: 'focus',    desc: 'Manage divided attention tasks' },
  { id: 'flexibility',         name: 'Color Match',       emoji: '🧩', color: '#e91e63', category: 'focus',    desc: 'Stroop-style color challenges' },
  { id: 'problemSolving',      name: 'Pattern Recall',    emoji: '🔍', color: '#ff5722', category: 'logic',    desc: 'Recall complex visual patterns' },
  { id: 'math',                name: 'Number Crunch',     emoji: '🔢', color: '#3f51b5', category: 'math',     desc: 'Mental math speed drills' },
  { id: 'reaction',            name: 'Fish Food Frenzy', emoji: '🐟', color: '#00bcd4', category: 'speed',    desc: 'React fast to feed the fish' },
  { id: 'word',                name: 'Word Bubbles',      emoji: '💬', color: '#9c27b0', category: 'language', desc: 'Find words before bubbles pop' },
  { id: 'visual',              name: 'Lost in Migration', emoji: '🦅', color: '#ff9800', category: 'focus',    desc: 'Spot the odd bird direction' },
  { id: 'spatial',             name: 'Pinball Recall',    emoji: '📍', color: '#009688', category: 'memory',   desc: 'Remember bouncing bumper locations' },
  { id: 'memorySequence',      name: 'Sequence Memory',   emoji: '🔗', color: '#795548', category: 'memory',   desc: 'Remember growing sequences' },
  // Arcade games
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
  { id: 'voice_command',       name: 'Voice Stroop',      emoji: '🎙', color: '#f43f5e', category: 'focus',    desc: 'Say the color, not the word' },
  { id: 'voice_math',          name: 'Voice Math',        emoji: '🔊', color: '#0ea5e9', category: 'math',     desc: 'Solve math problems with your voice' },
  { id: 'voice_memory',        name: 'Voice Memory',      emoji: '🗣', color: '#8b5cf6', category: 'memory',   desc: 'Repeat spoken sequences aloud' },
  { id: 'voice_spelling',      name: 'Voice Spelling',    emoji: '📢', color: '#10b981', category: 'language', desc: 'Spell words using your voice' },
  { id: 'focus_grid',          name: 'Focus Grid',        emoji: '🎯', color: '#f59e0b', category: 'focus',    desc: 'Memorize and find hidden targets' },
  { id: 'word_unscramble',     name: 'Word Unscramble',   emoji: '🔤', color: '#7c3aed', category: 'language', desc: 'Unscramble jumbled letters' },
  { id: 'sliding_puzzle',      name: 'Sliding Puzzle',    emoji: '🔢', color: '#0891b2', category: 'logic',    desc: 'Slide tiles into the correct order' },
  { id: 'attention_grid',      name: 'Attention Grid',    emoji: '⚡', color: '#16a34a', category: 'focus',    desc: 'Tap flashing cells before they fade' },
  { id: 'speed_reaction',      name: 'Speed Reaction',    emoji: '🔴', color: '#dc2626', category: 'speed',    desc: 'Test your pure reaction time' },
  { id: 'math_blitz',          name: 'Math Blitz',        emoji: '🔥', color: '#ea580c', category: 'math',     desc: '60-second timed math challenge' },
  // Advanced cognitive games
  { id: 'dual_n_back',         name: 'Dual N-Back',       emoji: '🔄', color: '#6366f1', category: 'memory',   desc: 'Train working memory with dual tasks' },
  { id: 'map_navigator',       name: 'Map Navigator',     emoji: '🗺️', color: '#0d9488', category: 'logic',    desc: 'Navigate routes from memory' },
  { id: 'mental_rotation_3d',  name: 'Mental Rotation',   emoji: '🧊', color: '#7c3aed', category: 'logic',    desc: 'Rotate 3D shapes mentally' },
  { id: 'perspective_shift',   name: 'Perspective Shift', emoji: '👁️', color: '#0891b2', category: 'focus',    desc: 'See from different viewpoints' },
  { id: 'stroop_challenge',    name: 'Stroop Challenge',  emoji: '🎨', color: '#e11d48', category: 'focus',    desc: 'Name the color, ignore the word' },
  { id: 'task_switcher',       name: 'Task Switcher',     emoji: '🔀', color: '#d97706', category: 'focus',    desc: 'Rapidly switch between rules' },
  { id: 'tower_planner',       name: 'Tower Planner',     emoji: '🏗️', color: '#64748b', category: 'logic',    desc: 'Plan tower construction moves' },
  // INTJ Strategic Games
  { id: 'logic_grid_puzzle',   name: 'Logic Grid Puzzle', emoji: '🧩', color: '#00e5ff', category: 'logic',    desc: '5-category deduction grid puzzle' },
  { id: 'chess_tactics',       name: 'Chess Tactics',     emoji: '♛',  color: '#7c6f9f', category: 'logic',    desc: 'Solve chess tactical puzzles' },
  { id: 'pattern_sequence',    name: 'Pattern Sequence',  emoji: '🔮', color: '#aa00ff', category: 'logic',    desc: 'Predict the next in the sequence' },
  { id: 'resource_management', name: 'Resource Manager',  emoji: '📊', color: '#00bcd4', category: 'logic',    desc: 'Optimize resource allocation' },
  { id: 'deduction_chain',     name: 'Deduction Chain',   emoji: '🔗', color: '#ff6d00', category: 'logic',    desc: 'Solve Knights & Knaves logic puzzles' },
  { id: 'cipher_breaker',      name: 'Cipher Breaker',    emoji: '🔐', color: '#00e5ff', category: 'logic',    desc: 'Crack substitution cipher codes' },
  { id: 'sudoku',              name: 'Sudoku',            emoji: '🔢', color: '#7c4dff', category: 'logic',    desc: 'Classic 9×9 constraint logic puzzle' },
  { id: 'syllogism_engine',    name: 'Syllogism Engine',  emoji: '⚖️', color: '#ff6d00', category: 'logic',    desc: 'Spot valid and invalid arguments' },
  { id: 'systems_cascade',     name: 'Systems Cascade',   emoji: '🌐', color: '#00bfa5', category: 'logic',    desc: 'Predict cascading system failures' },
  { id: 'binary_matrix',       name: 'Binary Matrix',     emoji: '🔲', color: '#76ff03', category: 'logic',    desc: 'Fill grid with 0s and 1s logically' },
  { id: 'graph_pathfinder',    name: 'Graph Pathfinder',  emoji: '🗺️', color: '#448aff', category: 'logic',    desc: 'Find shortest paths in weighted graphs' },
  { id: 'cryptogram',          name: 'Cryptogram',        emoji: '📜', color: '#ffab40', category: 'language', desc: 'Decode encrypted famous quotes' },
  { id: 'strategic_conquest',  name: 'Strategic Conquest', emoji: '⚔️', color: '#e040fb', category: 'logic',   desc: 'Conquer territories with tactical moves' },
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
  const [activeCategory, setActiveCategory] = useState<GameCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navRef = useRef<HTMLElement>(null);

  // Count games per category for badge display
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: ALL_GAMES.length };
    for (const g of ALL_GAMES) counts[g.category] = (counts[g.category] || 0) + 1;
    return counts;
  }, []);

  // Filtered games for display (category + search)
  const displayedGames = useMemo(() => {
    let games = ALL_GAMES;
    if (activeCategory !== 'all') games = games.filter(g => g.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      games = games.filter(g => g.name.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q));
    }
    return games;
  }, [activeCategory, searchQuery]);

  // Nav glassmorphism on scroll
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return;
    const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 16);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="landing">
      <nav className="nav" ref={navRef}>
        <a href="#" className="logo">Y<span>gy</span></a>
        <ul className="nav-links">
          <li><LanguageSwitcher /></li>
          <li><Link to="/settings" className="nav-icon-link" aria-label="Settings">⚙️</Link></li>
          <li><Link to="/login" className="btn-primary btn-sm">Log In</Link></li>
        </ul>
      </nav>

      <div className="landing-hero">
        <h1 className="landing-hero-title">
          🧠 Ygy <span className="landing-hero-accent">Brain Games</span>
        </h1>
        <p className="landing-hero-sub">
          {ALL_GAMES.length} free games — pick one and start playing now
        </p>
        <a href="#games" className="landing-hero-cta">
          Explore Games <span className="cta-arrow">↓</span>
        </a>
      </div>

      <div className="section section--flush">
        <StreakWidget />
      </div>

      <div id="games" className="section landing-games-section">
        <div className="landing-search-wrap">
          <input
            type="search"
            className="landing-search-input"
            placeholder="Search games…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            aria-label="Search games"
          />
        </div>

        <div className="landing-category-tabs" role="tablist">
          {CATEGORY_TABS.map(tab => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeCategory === tab.id ? true : undefined}
              className={`landing-cat-btn${activeCategory === tab.id ? ' active' : ''}`}
              onClick={() => setActiveCategory(tab.id)}
            >
              {tab.label}
              <span className="landing-cat-count">{categoryCounts[tab.id] || 0}</span>
            </button>
          ))}
        </div>

        <div className="landing-games-grid" key={activeCategory}>
          {displayedGames.length === 0 ? (
            <div className="landing-empty-state">No games match "{searchQuery}"</div>
          ) : displayedGames.map((game, i) => (
              <Link
                to={`/game/${game.id}`}
                key={game.id}
                className="landing-game-card"
              style={{ '--game-color': game.color, '--i': i } as React.CSSProperties}
              >
                <div className="landing-game-preview" style={{ background: game.color }}>
                  <span>{game.emoji}</span>
                </div>
                <div className="landing-game-info">
                  <span className="landing-game-name">{game.name}</span>
                  <span className="landing-game-desc">{game.desc}</span>
                  <span className="landing-game-category">{game.category}</span>
                </div>
              </Link>
            ))}
        </div>
      </div>

      <footer>
        <div className="footer-inner">
          <div className="footer-brand">
            <span className="logo">Y<span>gy</span></span>
            <span className="footer-tagline">Train your brain, every day.</span>
          </div>
          <div className="footer-links-row">
            <Link to="/settings">Settings</Link>
            <Link to="/support">Support</Link>
            <Link to="/leaderboard">Leaderboard</Link>
          </div>
          <div className="footer-copy">© 2026 Ygy. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;


