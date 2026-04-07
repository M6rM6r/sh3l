import React, { useState, useEffect, useCallback, memo } from 'react';
import { audioManager } from '../../utils/audio';

interface MapNavigatorProps {
  onComplete: (score: number, accuracy: number) => void;
  isPaused?: boolean;
  onScoreChange?: (score: number) => void;
  onTimeChange?: (time: number) => void;
}

interface Landmark {
  id: string;
  name: string;
  nameAr: string;
  x: number;
  y: number;
  icon: string;
}

interface Route {
  from: string;
  to: string;
  distance: number;
}

const CITIES = [
  {
    name: 'Cairo',
    nameAr: 'القاهرة',
    landmarks: [
      { id: 'pyramids', name: 'Pyramids of Giza', nameAr: 'أهرامات الجيزة', icon: '🔺' },
      { id: 'museum', name: 'Egyptian Museum', nameAr: 'المتحف المصري', icon: '🏛️' },
      { id: 'nile', name: 'Nile River', nameAr: 'نهر النيل', icon: '🌊' },
      { id: 'citadel', name: 'Citadel', nameAr: 'قلعة صلاح الدين', icon: '🏰' },
      { id: 'khan', name: 'Khan el-Khalili', nameAr: 'خان الخليلي', icon: '🛒' },
    ]
  },
  {
    name: 'Dubai',
    nameAr: 'دبي',
    landmarks: [
      { id: 'burj', name: 'Burj Khalifa', nameAr: 'برج خليفة', icon: '🏢' },
      { id: 'mall', name: 'Dubai Mall', nameAr: 'دبي مول', icon: '🛍️' },
      { id: 'palm', name: 'Palm Jumeirah', nameAr: 'نخلة جميرا', icon: '🌴' },
      { id: 'marina', name: 'Dubai Marina', nameAr: 'دبي مارينا', icon: '⚓' },
      { id: 'desert', name: 'Desert Safari', nameAr: 'سفاري الصحراء', icon: '🐪' },
    ]
  },
  {
    name: 'Riyadh',
    nameAr: 'الرياض',
    landmarks: [
      { id: 'kingdom', name: 'Kingdom Tower', nameAr: 'برج المملكة', icon: '🏙️' },
      { id: 'diriyah', name: 'Diriyah', nameAr: 'الدرعية', icon: '🏛️' },
      { id: 'boulevard', name: 'Boulevard City', nameAr: 'بوليفارد الرياض', icon: '🎭' },
      { id: 'edge', name: 'Edge of the World', nameAr: 'حافة العالم', icon: '🏔️' },
      { id: 'national', name: 'National Museum', nameAr: 'المتحف الوطني', icon: '🏺' },
    ]
  }
];

const GAME_DURATION = 120;

const MapNavigator: React.FC<MapNavigatorProps> = memo(({
  onComplete,
  isPaused,
  onScoreChange,
  onTimeChange
}) => {
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [gameState, setGameState] = useState<'memorize' | 'navigate' | 'gameover'>('memorize');
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  
  const [currentCity, setCurrentCity] = useState(CITIES[0]);
  const [landmarkPositions, setLandmarkPositions] = useState<Landmark[]>([]);
  const [route, setRoute] = useState<string[]>([]);
  const [userPath, setUserPath] = useState<string[]>([]);
  const [memorizeTimeLeft, setMemorizeTimeLeft] = useState(5);
  const [showDistance, setShowDistance] = useState(false);

  const generatePositions = useCallback((landmarks: typeof CITIES[0]['landmarks']) => {
    const positions: Landmark[] = [];
    const usedPositions: { x: number; y: number }[] = [];
    
    landmarks.forEach(lm => {
      let x: number, y: number;
      let attempts = 0;
      do {
        x = 10 + Math.random() * 80;
        y = 10 + Math.random() * 80;
        attempts++;
      } while (
        usedPositions.some((pos: { x: number; y: number }) => 
          Math.abs(pos.x - x) < 20 && Math.abs(pos.y - y) < 20
        ) && attempts < 50
      );
      
      usedPositions.push({ x, y });
      positions.push({ ...lm, x, y });
    });
    
    return positions;
  }, []);

  const generateRoute = useCallback((landmarks: Landmark[], level: number) => {
    const routeLength = Math.min(3 + Math.floor(level / 2), landmarks.length);
    const shuffled = [...landmarks].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, routeLength).map(lm => lm.id);
  }, []);

  const calculateDistance = (from: Landmark, to: Landmark) => {
    const dx = from.x - to.x;
    const dy = from.y - to.y;
    return Math.sqrt(dx * dx + dy * dy).toFixed(1);
  };

  const startRound = useCallback(() => {
    const city = CITIES[Math.floor(Math.random() * CITIES.length)];
    setCurrentCity(city);
    
    const positions = generatePositions(city.landmarks);
    setLandmarkPositions(positions);
    
    const newRoute = generateRoute(positions, level);
    setRoute(newRoute);
    setUserPath([]);
    
    // Memorize phase
    const memorizeDuration = Math.max(3000, 8000 - level * 500);
    setMemorizeTimeLeft(Math.ceil(memorizeDuration / 1000));
    setGameState('memorize');
    setShowDistance(level >= 3);
    
    setTimeout(() => {
      setGameState('navigate');
    }, memorizeDuration);
  }, [level, generatePositions, generateRoute]);

  useEffect(() => {
    startRound();
  }, [startRound]);

  useEffect(() => {
    onScoreChange?.(score);
  }, [score, onScoreChange]);

  useEffect(() => {
    onTimeChange?.(timeLeft);
  }, [timeLeft, onTimeChange]);

  useEffect(() => {
    if (isPaused || gameState === 'gameover') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setGameState('gameover');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isPaused, gameState]);

  useEffect(() => {
    if (gameState === 'memorize' && memorizeTimeLeft > 0) {
      const timer = setTimeout(() => {
        setMemorizeTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState, memorizeTimeLeft]);

  useEffect(() => {
    if (gameState === 'gameover') {
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      onComplete(score, accuracy);
    }
  }, [gameState, score, correct, total, onComplete]);

  const handleLandmarkClick = (landmarkId: string) => {
    if (gameState !== 'navigate') return;
    
    const newPath = [...userPath, landmarkId];
    setUserPath(newPath);
    
    const currentIndex = newPath.length - 1;
    
    if (route[currentIndex] !== landmarkId) {
      // Wrong landmark
      audioManager.playWrong();
      setTotal(prev => prev + 1);
      setGameState('gameover');
      return;
    }
    
    audioManager.playCorrect();
    
    if (newPath.length === route.length) {
      // Completed route correctly
      setCorrect(prev => prev + 1);
      setTotal(prev => prev + 1);
      const timeBonus = Math.floor(timeLeft / 10);
      const levelBonus = level * 15;
      const distanceBonus = showDistance ? 20 : 0;
      setScore(prev => prev + 100 + timeBonus + levelBonus + distanceBonus);
      setLevel(prev => prev + 1);
      
      setTimeout(() => {
        startRound();
      }, 1000);
    }
  };

  if (gameState === 'gameover') {
    return (
      <div className="game-over" role="alert" aria-live="polite">
        <h2>Game Over!</h2>
        <div className="final-score">Score: {score}</div>
        <div className="final-stats">Level Reached: {level}</div>
        <div className="final-stats">Routes Completed: {correct}</div>
      </div>
    );
  }

  return (
    <div className="map-navigator" role="application" aria-label="Map Navigator game">
      <div className="game-stats-bar" role="status" aria-live="polite">
        <span>Score: {score}</span>
        <span>Level: {level}</span>
        <span>Time: {timeLeft}s</span>
        {gameState === 'memorize' && <span className="phase-indicator">Memorize: {memorizeTimeLeft}s</span>}
      </div>

      <div className="city-header">
        <h2>{currentCity.name} <span className="arabic-name">{currentCity.nameAr}</span></h2>
        <p className="game-instructions">
          {gameState === 'memorize' 
            ? 'Memorize the route and distances!' 
            : 'Navigate the route from memory!'}
        </p>
      </div>

      <div className="map-container">
        {gameState === 'memorize' && (
          <div className="route-overlay">
            <div className="route-path">
              {route.map((landmarkId, index) => {
                const landmark = landmarkPositions.find(l => l.id === landmarkId);
                const prevLandmark = index > 0 ? landmarkPositions.find(l => l.id === route[index - 1]) : null;
                
                return (
                  <div key={landmarkId} className="route-step">
                    <span className="step-number">{index + 1}</span>
                    <span className="landmark-name">{landmark?.name}</span>
                    {showDistance && prevLandmark && landmark && (
                      <span className="distance">{calculateDistance(prevLandmark, landmark)}km</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="map-area">
          {/* Map background */}
          <div className="map-background">
            <svg className="map-grid" viewBox="0 0 100 100">
              {[...Array(10)].map((_, i) => (
                <React.Fragment key={i}>
                  <line x1={i * 10} y1="0" x2={i * 10} y2="100" stroke="rgba(99,102,241,0.2)" strokeWidth="0.5" />
                  <line x1="0" y1={i * 10} x2="100" y2={i * 10} stroke="rgba(99,102,241,0.2)" strokeWidth="0.5" />
                </React.Fragment>
              ))}
            </svg>
          </div>

          {/* Landmarks */}
          {landmarkPositions.map((landmark, index) => {
            const isInRoute = route.includes(landmark.id);
            const isNextStop = gameState === 'navigate' && 
                             userPath.length < route.length && 
                             route[userPath.length] === landmark.id;
            const isVisited = userPath.includes(landmark.id);
            
            return (
              <button
                key={landmark.id}
                className={`landmark ${isInRoute ? 'in-route' : ''} ${isNextStop ? 'next-stop' : ''} ${isVisited ? 'visited' : ''}`}
                style={{ 
                  left: `${landmark.x}%`, 
                  top: `${landmark.y}%`,
                  animationDelay: `${index * 0.1}s`
                }}
                onClick={() => handleLandmarkClick(landmark.id)}
                disabled={gameState === 'memorize' || (gameState === 'navigate' && !isNextStop && !isInRoute)}
                aria-label={`${landmark.name} ${landmark.nameAr}${isNextStop ? ' - Next stop!' : ''}`}
              >
                <span className="landmark-icon">{landmark.icon}</span>
                <span className="landmark-label">{landmark.name}</span>
                {showDistance && gameState === 'memorize' && index > 0 && route.includes(landmark.id) && (
                  <span className="distance-badge">
                    {calculateDistance(
                      landmarkPositions.find(l => l.id === route[route.indexOf(landmark.id) - 1])!,
                      landmark
                    )}km
                  </span>
                )}
              </button>
            );
          })}

          {/* Route line during memorization */}
          {gameState === 'memorize' && (
            <svg className="route-line" viewBox="0 0 100 100">
              {route.map((landmarkId, index) => {
                if (index === 0) return null;
                const from = landmarkPositions.find(l => l.id === route[index - 1]);
                const to = landmarkPositions.find(l => l.id === landmarkId);
                if (!from || !to) return null;
                
                return (
                  <line
                    key={`line-${index}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#6366f1"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    opacity="0.6"
                  >
                    <animate
                      attributeName="stroke-dashoffset"
                      from="0"
                      to="4"
                      dur="1s"
                      repeatCount="indefinite"
                    />
                  </line>
                );
              })}
            </svg>
          )}
        </div>

        {gameState === 'navigate' && (
          <div className="progress-indicator">
            <span>Progress: {userPath.length} / {route.length} stops</span>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(userPath.length / route.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default MapNavigator;
