import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How does the personalised daily plan work?',
    a: 'Every day, Ygy analyses your recent game history and cognitive area scores to generate a custom workout. It targets your weakest areas first while maintaining your strengths — just 10–15 minutes a day.',
  },
  {
    q: 'What does the LPI score represent?',
    a: 'LPI (Lumosity Performance Index) is a composite score averaging your performance across all five cognitive areas: Memory, Speed, Attention, Flexibility, and Problem Solving. It updates after every game session.',
  },
  {
    q: 'How many brain games are available?',
    a: 'There are 15+ arcade games (Memory Match, Chess, Maze Runner, Quick Reflexes, Math Marathon, Logic Grid, Pipe Connection, and more) plus 10 classic training games, for a total of 25+ unique games.',
  },
  {
    q: 'How do I appear on the leaderboard?',
    a: 'Play any game to earn a score. Your total score across all sessions determines your leaderboard rank. The leaderboard refreshes daily and shows global, weekly, and all-time rankings.',
  },
  {
    q: 'How does the analytics dashboard work?',
    a: 'The /analytics page shows your score trends over 7d, 30d, or all time with line charts, a radar chart of cognitive areas, per-game breakdowns, and real-time session analytics.',
  },
  {
    q: 'Can I track my progress over time?',
    a: 'Yes — the Analytics page charts your daily score trend, and the Insights page gives a deeper breakdown of cognitive area growth, streaks, and personalised improvement tips.',
  },
  {
    q: 'How do I reset my progress?',
    a: 'Open your Profile (the 👤 button in the top nav), then click "Reset Stats". This clears all local data. There is no undo.',
  },
  {
    q: 'Does Ygy work offline?',
    a: 'Yes. Ygy is a Progressive Web App (PWA). Once loaded, all games run fully offline. Progress is stored locally and synced when you reconnect.',
  },
  {
    q: 'How do I contact priority support?',
    a: 'Email us at support@ygy.app with the subject "Priority Support". Premium users receive a response within 4 hours on business days.',
  },
];

const CONTACT_TOPICS = [
  'General question',
  'Bug report',
  'Billing / subscription',
  'Account issue',
  'Feature request',
  'Priority support',
];

const Support: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [topic, setTopic] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || !message.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="support-page">
      <nav className="nav">
        <Link to="/" className="logo">Ygy</Link>
        <div className="nav-links">
          <Link to="/dashboard" className="nav-dash-link">← Dashboard</Link>
        </div>
      </nav>

      <div className="support-content">
        <header className="support-hero">
          <h1>Priority Support</h1>
          <p>We're here to help. Search the FAQ or send us a message.</p>
        </header>

        <div className="support-grid">
          {/* FAQ */}
          <section className="support-section">
            <h2>Frequently Asked Questions</h2>
            <div className="faq-list">
              {FAQS.map((faq, i) => (
                <div
                  key={i}
                  className={`faq-item${openIdx === i ? ' open' : ''}`}
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                >
                  <div className="faq-q">
                    <span>{faq.q}</span>
                    <span className="faq-chevron">{openIdx === i ? '▲' : '▼'}</span>
                  </div>
                  {openIdx === i && <div className="faq-a">{faq.a}</div>}
                </div>
              ))}
            </div>
          </section>

          {/* Contact form */}
          <section className="support-section">
            <h2>Contact Us</h2>
            {submitted ? (
              <div className="support-success">
                <span className="support-success-icon">✅</span>
                <h3>Message sent!</h3>
                <p>We've received your message and will reply within 4 hours (business days) for priority requests.</p>
                <button className="btn-primary" onClick={() => { setSubmitted(false); setTopic(''); setMessage(''); }}>
                  Send another
                </button>
              </div>
            ) : (
              <form className="support-form" onSubmit={handleSubmit}>
                <label htmlFor="support-topic">Topic</label>
                <select
                  id="support-topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  required
                >
                  <option value="">Select a topic…</option>
                  {CONTACT_TOPICS.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>

                <label htmlFor="support-message">Message</label>
                <textarea
                  id="support-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue or question..."
                  rows={6}
                  required
                />

                <button type="submit" className="btn-primary">Send Message</button>

                <p className="support-email-note">
                  Or email us directly at{' '}
                  <a href="mailto:support@ygy.app">support@ygy.app</a>
                </p>
              </form>
            )}
          </section>
        </div>

        {/* Quick links */}
        <section className="support-quick-links">
          <h2>Quick Links</h2>
          <div className="support-links-grid">
            <Link to="/analytics" className="support-link-card">
              <span>📊</span>
              <strong>Analytics Dashboard</strong>
              <span>View your full performance data</span>
            </Link>
            <Link to="/leaderboard" className="support-link-card">
              <span>🏆</span>
              <strong>Leaderboard</strong>
              <span>See how you rank globally</span>
            </Link>
            <Link to="/dashboard" className="support-link-card">
              <span>🎮</span>
              <strong>All Brain Games</strong>
              <span>Play all 15+ games</span>
            </Link>
            <Link to="/insights" className="support-link-card">
              <span>💡</span>
              <strong>Insights</strong>
              <span>Personalised progress tips</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Support;
