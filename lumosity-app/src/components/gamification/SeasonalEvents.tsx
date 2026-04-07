import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { useToastHelpers } from '../Toast';
import { ProgressBar, Badge } from '../UI';

interface SeasonalEvent {
  id: number;
  name: string;
  description: string;
  season_type: string;
  start_date: string;
  end_date: string;
  theme_color: string;
  banner_image?: string;
  progress: number;
  completed: boolean;
  rewards_claimed: string[];
}

interface EventReward {
  milestone: number;
  type: 'coins' | 'xp' | 'item' | 'badge';
  amount?: number;
  item_name?: string;
  claimed: boolean;
}

interface SeasonalEventsPanelProps {
  userLevel: number;
}

const eventThemes: Record<string, { icon: string; color: string; bg: string }> = {
  halloween: { icon: '🎃', color: '#ff6b6b', bg: 'linear-gradient(135deg, #ff6b6b20, #ffa50020)' },
  winter: { icon: '❄️', color: '#4fc3f7', bg: 'linear-gradient(135deg, #4fc3f720, #ffffff20)' },
  spring: { icon: '🌸', color: '#f06292', bg: 'linear-gradient(135deg, #f0629220, #81c78420)' },
  summer: { icon: '☀️', color: '#ffd54f', bg: 'linear-gradient(135deg, #ffd54f20, #ff8a6520)' },
  anniversary: { icon: '🎂', color: '#ba68c8', bg: 'linear-gradient(135deg, #ba68c820, #4fc3f720)' },
  competition: { icon: '🏆', color: '#ffd700', bg: 'linear-gradient(135deg, #ffd70020, #ff8c0020)' }
};

export const SeasonalEventsPanel: React.FC<SeasonalEventsPanelProps> = ({ userLevel }) => {
  const [events, setEvents] = useState<SeasonalEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SeasonalEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { success, error } = useToastHelpers();

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      const response = await apiService.get('/gamification/seasonal-events');
      setEvents(response.data);
    } catch (err) {
      console.error('Failed to load events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinEvent = async (eventId: number) => {
    try {
      await apiService.post(`/gamification/seasonal-events/${eventId}/join`);
      success('Event Joined!', 'Good luck in the competition!');
      loadEvents();
    } catch (err) {
      error('Failed to join', 'Please try again');
    }
  };

  const handleClaimReward = async (eventId: number, milestone: number) => {
    try {
      const response = await apiService.post(`/gamification/seasonal-events/${eventId}/claim/${milestone}`);
      success('Reward Claimed!', response.data.reward_name);
      loadEvents();
    } catch (err) {
      error('Claim failed', 'Reward not available');
    }
  };

  const getTimeRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) return `${days} days left`;
    if (hours > 0) return `${hours} hours left`;
    return 'Ending soon!';
  };

  if (isLoading) {
    return (
      <div className="events-loading">
        <div className="loading-spinner" />
        <p>Loading events...</p>
      </div>
    );
  }

  const activeEvents = events.filter(e => new Date(e.end_date) > new Date());
  const pastEvents = events.filter(e => new Date(e.end_date) <= new Date());

  return (
    <div className="seasonal-events-panel">
      {/* Header */}
      <div className="events-header">
        <h2>Seasonal Events</h2>
        <p>Limited-time challenges with exclusive rewards</p>
      </div>

      {/* Active Events */}
      <div className="events-section">
        <h3>Active Events</h3>
        {activeEvents.length === 0 ? (
          <div className="no-events">
            <span className="no-events-icon">📅</span>
            <p>No active events right now</p>
            <span className="no-events-sub">Check back soon for new challenges!</span>
          </div>
        ) : (
          <div className="events-grid">
            {activeEvents.map(event => {
              const theme = eventThemes[event.season_type] || eventThemes.competition;
              
              return (
                <div
                  key={event.id}
                  className="event-card"
                  style={{ background: theme.bg, borderColor: theme.color + '40' }}
                  onClick={() => setSelectedEvent(event)}
                >
                  <div className="event-icon" style={{ background: theme.color + '30' }}>
                    {theme.icon}
                  </div>
                  
                  <div className="event-info">
                    <h4>{event.name}</h4>
                    <p className="event-description">{event.description}</p>
                    
                    <div className="event-meta">
                      <Badge variant="primary">{getTimeRemaining(event.end_date)}</Badge>
                      {event.completed && (
                        <Badge variant="success">Completed</Badge>
                      )}
                    </div>
                  </div>
                  
                  {event.progress > 0 && (
                    <div className="event-progress">
                      <ProgressBar value={event.progress} max={100} size="sm" showLabel />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div className="events-section past">
          <h3>Past Events</h3>
          <div className="events-list-past">
            {pastEvents.slice(0, 3).map(event => (
              <div key={event.id} className="event-card-past">
                <span className="past-icon">{eventThemes[event.season_type]?.icon || '🏆'}</span>
                <span className="past-name">{event.name}</span>
                {event.completed && <span className="past-completed">✓ Completed</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Detail Modal would go here */}

      <style>{`
        .seasonal-events-panel {
          padding: 24px;
          max-width: 1000px;
          margin: 0 auto;
        }

        .events-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          gap: 16px;
        }

        .events-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .events-header h2 {
          font-size: 28px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 8px;
        }

        .events-header p {
          color: var(--text-secondary);
          margin: 0;
        }

        .events-section {
          margin-bottom: 32px;
        }

        .events-section h3 {
          font-size: 18px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 16px;
        }

        .events-section.past {
          opacity: 0.7;
        }

        .events-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 16px;
        }

        .event-card {
          border-radius: 20px;
          padding: 24px;
          border: 2px solid;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .event-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.3);
        }

        .event-icon {
          width: 64px;
          height: 64px;
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          margin-bottom: 16px;
        }

        .event-info h4 {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0 0 8px;
        }

        .event-description {
          font-size: 14px;
          color: var(--text-secondary);
          margin: 0 0 12px;
          line-height: 1.4;
        }

        .event-meta {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .event-progress {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .no-events {
          text-align: center;
          padding: 60px 20px;
          background: var(--bg-card);
          border-radius: 20px;
          border: 1px solid var(--border);
        }

        .no-events-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .no-events p {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 8px;
        }

        .no-events-sub {
          font-size: 14px;
          color: var(--text-muted);
        }

        .events-list-past {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .event-card-past {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-card);
          border-radius: 12px;
          border: 1px solid var(--border);
        }

        .past-icon {
          font-size: 24px;
        }

        .past-name {
          flex: 1;
          font-weight: 500;
          color: var(--text-primary);
        }

        .past-completed {
          font-size: 12px;
          font-weight: 600;
          color: #22c55e;
          background: #22c55e20;
          padding: 4px 12px;
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
};
