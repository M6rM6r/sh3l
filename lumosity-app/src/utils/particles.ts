// Canvas-based particle burst — zero dependencies, fully programmatic

const PALETTE = ['#4fc3f7', '#ffffff', '#ffd700', '#ff6b9d', '#a78bfa', '#34d399'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  shape: 'circle' | 'star';
}

export function burst(
  originX: number,
  originY: number,
  color: string = '#4fc3f7',
  count = 24,
) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d')!;
  const palette = [color, ...PALETTE.filter(c => c !== color)];

  const particles: Particle[] = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 10 + 4;
    return {
      x: originX,
      y: originY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3,
      size: Math.random() * 7 + 3,
      alpha: 1,
      color: palette[Math.floor(Math.random() * palette.length)],
      shape: Math.random() > 0.5 ? 'circle' : 'star',
    };
  });

  let frame = 0;
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    frame++;

    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.4;  // gravity
      p.vx *= 0.97; // air resistance
      p.alpha -= 0.022;

      if (p.alpha > 0) {
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.shape === 'star') {
          drawStar(ctx, p.x, p.y, p.size * 0.5, p.size, 5);
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    if (alive) {
      requestAnimationFrame(animate);
    } else {
      document.body.removeChild(canvas);
    }
  };

  requestAnimationFrame(animate);
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  points: number,
) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
    else ctx.lineTo(cx + r * Math.cos(angle), cy + r * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();
}

/** Trigger burst from a DOM element's center */
export function burstFromElement(el: HTMLElement, color?: string) {
  const rect = el.getBoundingClientRect();
  burst(rect.left + rect.width / 2, rect.top + rect.height / 2, color);
}


