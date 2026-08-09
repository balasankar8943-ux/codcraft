// src/components/GameCanvas.tsx
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { RotateCcw, Zap, AlertTriangle, Shield, Volume2, VolumeX, Bomb } from 'lucide-react';
import { sounds } from '../services/soundEffects';
import type { GameTurnFrame } from '../services/gameEngine';

interface GameCanvasProps {
  frames?: GameTurnFrame[];
  codeAlgorithmActive?: boolean;
  onFinish?: (success: boolean) => void;
  onScoreUpdate?: (score: number, wave: number) => void;
}

interface LiveAlien {
  id: string;
  name: string;
  type: 'stinger' | 'scout' | 'dreadnought';
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  radius: number;
  shootCooldown: number;
}

interface PlayerLaser {
  x: number;
  y: number;
  vx: number;
  vy: number;
  isTriple?: boolean;
}

interface EnemyBullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface PowerUp {
  x: number;
  y: number;
  type: 'triple' | 'shield' | 'bomb';
  radius: number;
}

interface VisualParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  codeAlgorithmActive = false,
  onFinish,
  onScoreUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  // Game state
  const [isPlaying] = useState<boolean>(true);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(0);
  const [wave, setWave] = useState<number>(1);
  const [combo, setCombo] = useState<number>(1);
  const [soundMuted, setSoundMuted] = useState<boolean>(false);
  const [empBombs, setEmpBombs] = useState<number>(2);
  const [, setActivePowerup] = useState<string>('Standard Dual Plasma');

  // Input tracking
  const keysRef = useRef<{ left: boolean; right: boolean; fire: boolean }>({ left: false, right: false, fire: false });

  // Game loop entity refs (to avoid React re-render lag during 60FPS tick)
  const entitiesRef = useRef<{
    jetX: number;
    jetY: number;
    jetVx: number;
    jetShield: number;
    fireCooldown: number;
    tripleLaserTimer: number;
    aliens: LiveAlien[];
    lasers: PlayerLaser[];
    enemyBullets: EnemyBullet[];
    powerups: PowerUp[];
    particles: VisualParticle[];
    stars: Array<{ x: number; y: number; speed: number; size: number; color: string }>;
    tick: number;
    shake: number;
    score: number;
    wave: number;
    combo: number;
    comboTimer: number;
  }>({
    jetX: 320,
    jetY: 340,
    jetVx: 0,
    jetShield: 100,
    fireCooldown: 0,
    tripleLaserTimer: 0,
    aliens: [],
    lasers: [],
    enemyBullets: [],
    powerups: [],
    particles: [],
    stars: [],
    tick: 0,
    shake: 0,
    score: 0,
    wave: 1,
    combo: 1,
    comboTimer: 0
  });

  // Sound toggle
  const toggleSound = () => {
    sounds.enabled = soundMuted;
    setSoundMuted(!soundMuted);
  };

  // Spawn alien wave
  const spawnWave = useCallback((waveNum: number) => {
    const aliens: LiveAlien[] = [];
    const count = 3 + waveNum * 2;
    const names = ['Xeno_Stinger', 'Viper_Drone', 'Gorgon_Alpha', 'Hydra_Beta', 'Shadow_Fiend', 'Wraith_Scout', 'Titan_Queen'];

    for (let i = 0; i < count; i++) {
      const isBoss = (waveNum % 3 === 0) && i === 0;
      const type = isBoss ? 'dreadnought' : (i % 2 === 0 ? 'stinger' : 'scout');
      const hp = isBoss ? 400 + waveNum * 100 : (type === 'stinger' ? 60 : 40);
      const radius = isBoss ? 28 : (type === 'stinger' ? 18 : 14);

      aliens.push({
        id: `alien_${waveNum}_${i}`,
        name: isBoss ? `BOSS_DREADNOUGHT_W${waveNum}` : `${names[i % names.length]}_${i + 1}`,
        type,
        x: 60 + Math.random() * 520,
        y: -40 - (i * 55),
        vx: (Math.random() - 0.5) * (1.5 + waveNum * 0.2),
        vy: 0.8 + Math.random() * 0.6 + (waveNum * 0.1),
        hp,
        maxHp: hp,
        radius,
        shootCooldown: 60 + Math.random() * 120
      });
    }

    entitiesRef.current.aliens = aliens;
  }, []);

  // Reset Game
  const resetGame = useCallback(() => {
    const e = entitiesRef.current;
    e.jetX = 320;
    e.jetY = 340;
    e.jetVx = 0;
    e.jetShield = 100;
    e.fireCooldown = 0;
    e.tripleLaserTimer = 0;
    e.lasers = [];
    e.enemyBullets = [];
    e.powerups = [];
    e.particles = [];
    e.score = 0;
    e.wave = 1;
    e.combo = 1;
    e.comboTimer = 0;

    setScore(0);
    setWave(1);
    setCombo(1);
    setEmpBombs(2);
    setIsGameOver(false);
    setActivePowerup('Standard Dual Plasma');

    spawnWave(1);
  }, [spawnWave]);

  // Initial starfield & wave spawn
  useEffect(() => {
    const stars = Array.from({ length: 70 }).map(() => ({
      x: Math.random() * 640,
      y: Math.random() * 400,
      speed: 1 + Math.random() * 3.5,
      size: Math.random() > 0.8 ? 2 : 1,
      color: Math.random() > 0.6 ? '#38bdf8' : Math.random() > 0.8 ? '#c084fc' : '#ffffff'
    }));
    entitiesRef.current.stars = stars;
    spawnWave(1);
  }, [spawnWave]);

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA', 'a'].includes(e.code) || e.key === 'ArrowLeft') {
        keysRef.current.left = true;
      }
      if (['ArrowRight', 'KeyD', 'd'].includes(e.code) || e.key === 'ArrowRight') {
        keysRef.current.right = true;
      }
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code) || e.key === ' ') {
        keysRef.current.fire = true;
      }
      if (['KeyB', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
        triggerEmpBomb();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'KeyA', 'a'].includes(e.code) || e.key === 'ArrowLeft') {
        keysRef.current.left = false;
      }
      if (['ArrowRight', 'KeyD', 'd'].includes(e.code) || e.key === 'ArrowRight') {
        keysRef.current.right = false;
      }
      if (['Space', 'KeyW', 'ArrowUp'].includes(e.code) || e.key === ' ') {
        keysRef.current.fire = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [empBombs]);

  // EMP Smart Bomb
  const triggerEmpBomb = () => {
    if (empBombs <= 0 || isGameOver) return;
    setEmpBombs(prev => prev - 1);
    sounds.playExplosion();

    const e = entitiesRef.current;
    e.shake = 3.5;

    // Vaporize all normal active aliens
    e.aliens.forEach(alien => {
      // Spawn huge explosion particles
      for (let i = 0; i < 18; i++) {
        const angle = (i / 18) * Math.PI * 2;
        e.particles.push({
          x: alien.x,
          y: alien.y,
          vx: Math.cos(angle) * (3 + Math.random() * 4),
          vy: Math.sin(angle) * (3 + Math.random() * 4),
          life: 1.0,
          color: '#38bdf8',
          size: 3
        });
      }
    });

    e.score += e.aliens.length * 150;
    setScore(e.score);
    e.aliens = [];
    e.enemyBullets = [];
  };

  // Main 60FPS Game Loop Engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const gameLoop = () => {
      const e = entitiesRef.current;
      e.tick += 0.05;

      const width = canvas.width;
      const height = canvas.height;

      if (isPlaying && !isGameOver) {
        // ── 1. Update Player Aircraft Controls ──
        if (keysRef.current.left) {
          e.jetVx -= 0.8;
        } else if (keysRef.current.right) {
          e.jetVx += 0.8;
        } else {
          e.jetVx *= 0.88; // Inertia drag
        }

        // Speed clamping
        e.jetVx = Math.max(-6.5, Math.min(6.5, e.jetVx));
        e.jetX += e.jetVx;

        // Boundaries
        if (e.jetX < 30) { e.jetX = 30; e.jetVx = 0; }
        if (e.jetX > width - 30) { e.jetX = width - 30; e.jetVx = 0; }

        // Firing Mechanics (Manual key OR Autopilot code)
        if (e.fireCooldown > 0) e.fireCooldown--;

        const isShooting = keysRef.current.fire || codeAlgorithmActive;
        if (isShooting && e.fireCooldown === 0) {
          sounds.playLaser();
          e.fireCooldown = e.tripleLaserTimer > 0 ? 7 : 11; // High rate of fire

          if (e.tripleLaserTimer > 0) {
            e.tripleLaserTimer--;
            if (e.tripleLaserTimer === 0) setActivePowerup('Standard Dual Plasma');
            // Triple spread
            e.lasers.push({ x: e.jetX, y: e.jetY - 18, vx: 0, vy: -12, isTriple: true });
            e.lasers.push({ x: e.jetX - 12, y: e.jetY - 14, vx: -2.5, vy: -11, isTriple: true });
            e.lasers.push({ x: e.jetX + 12, y: e.jetY - 14, vx: 2.5, vy: -11, isTriple: true });
          } else {
            // Twin plasma lasers
            e.lasers.push({ x: e.jetX - 14, y: e.jetY - 18, vx: 0, vy: -12 });
            e.lasers.push({ x: e.jetX + 14, y: e.jetY - 18, vx: 0, vy: -12 });
          }
        }

        // ── 2. Update Player Lasers ──
        for (let i = e.lasers.length - 1; i >= 0; i--) {
          const l = e.lasers[i];
          l.x += l.vx;
          l.y += l.vy;

          if (l.y < -20 || l.x < 0 || l.x > width) {
            e.lasers.splice(i, 1);
            continue;
          }

          // Laser to Alien Collision Detection
          for (let j = e.aliens.length - 1; j >= 0; j--) {
            const a = e.aliens[j];
            const dist = Math.hypot(l.x - a.x, l.y - a.y);
            if (dist < a.radius + 6) {
              e.lasers.splice(i, 1);
              a.hp -= 35;

              // Spark hit particles
              for (let p = 0; p < 4; p++) {
                e.particles.push({
                  x: l.x,
                  y: l.y,
                  vx: (Math.random() - 0.5) * 4,
                  vy: (Math.random() - 0.5) * 4,
                  life: 0.6,
                  color: '#38bdf8',
                  size: 2
                });
              }

              if (a.hp <= 0) {
                // Alien Destroyed!
                sounds.playExplosion();
                e.shake = 1.6;

                // Explosion shockwave particles
                for (let p = 0; p < 16; p++) {
                  const angle = (p / 16) * Math.PI * 2;
                  e.particles.push({
                    x: a.x,
                    y: a.y,
                    vx: Math.cos(angle) * (2 + Math.random() * 3.5),
                    vy: Math.sin(angle) * (2 + Math.random() * 3.5),
                    life: 1.0,
                    color: a.type === 'dreadnought' ? '#f59e0b' : '#38bdf8',
                    size: 3
                  });
                }

                // Chance to drop powerup (25%)
                if (Math.random() < 0.28) {
                  const types: Array<'triple' | 'shield' | 'bomb'> = ['triple', 'shield', 'bomb'];
                  e.powerups.push({
                    x: a.x,
                    y: a.y,
                    type: types[Math.floor(Math.random() * types.length)],
                    radius: 12
                  });
                }

                // Score & combo
                e.comboTimer = 120;
                e.combo = Math.min(5, e.combo + 1);
                const pts = (a.type === 'dreadnought' ? 500 : 100) * e.combo;
                e.score += pts;
                setScore(e.score);
                setCombo(e.combo);
                if (e.score > highScore) setHighScore(e.score);

                e.aliens.splice(j, 1);
              }
              break;
            }
          }
        }

        // ── 3. Update Aliens & Swarm AI ──
        for (let i = e.aliens.length - 1; i >= 0; i--) {
          const a = e.aliens[i];
          a.x += a.vx;
          a.y += a.vy;

          // Alien screen edge bounce
          if (a.x < 30 || a.x > width - 30) a.vx *= -1;

          // Alien Shooting
          a.shootCooldown--;
          if (a.shootCooldown <= 0 && a.y > 20 && a.y < height - 100) {
            a.shootCooldown = 90 + Math.random() * 120;
            // Fire plasma bullet at player
            const angle = Math.atan2(e.jetY - a.y, e.jetX - a.x);
            e.enemyBullets.push({
              x: a.x,
              y: a.y + a.radius,
              vx: Math.cos(angle) * 3.5,
              vy: Math.sin(angle) * 3.5
            });
          }

          // Alien reaches bottom (breach)
          if (a.y > height - 40) {
            e.jetShield -= 25;
            sounds.playHit();
            e.shake = 2.5;
            e.aliens.splice(i, 1);

            if (e.jetShield <= 0) {
              e.jetShield = 0;
              setIsGameOver(true);
              if (onFinish) onFinish(false);
            }
          }
        }

        // ── 4. Update Enemy Bullets ──
        for (let i = e.enemyBullets.length - 1; i >= 0; i--) {
          const b = e.enemyBullets[i];
          b.x += b.vx;
          b.y += b.vy;

          if (b.y > height + 20 || b.x < 0 || b.x > width) {
            e.enemyBullets.splice(i, 1);
            continue;
          }

          // Bullet hits Player Starfighter
          const dist = Math.hypot(b.x - e.jetX, b.y - e.jetY);
          if (dist < 22) {
            e.enemyBullets.splice(i, 1);
            e.jetShield -= 15;
            sounds.playHit();
            e.shake = 2.0;

            if (e.jetShield <= 0) {
              e.jetShield = 0;
              setIsGameOver(true);
              if (onFinish) onFinish(false);
            }
          }
        }

        // ── 5. Update Powerup Drops ──
        for (let i = e.powerups.length - 1; i >= 0; i--) {
          const p = e.powerups[i];
          p.y += 1.8;

          if (p.y > height + 20) {
            e.powerups.splice(i, 1);
            continue;
          }

          // Collect Powerup
          const dist = Math.hypot(p.x - e.jetX, p.y - e.jetY);
          if (dist < 26) {
            sounds.playPowerup();
            if (p.type === 'triple') {
              e.tripleLaserTimer = 160; // ~10 seconds of triple laser
              setActivePowerup('⚡ Triple Spread Plasma (10s)');
            } else if (p.type === 'shield') {
              e.jetShield = Math.min(100, e.jetShield + 35);
            } else if (p.type === 'bomb') {
              setEmpBombs(prev => prev + 1);
            }
            e.powerups.splice(i, 1);
          }
        }

        // ── 6. Check Wave Completion ──
        if (e.aliens.length === 0) {
          e.wave += 1;
          setWave(e.wave);
          if (onScoreUpdate) onScoreUpdate(e.score, e.wave);
          spawnWave(e.wave);
        }

        // Combo decay timer
        if (e.comboTimer > 0) {
          e.comboTimer--;
          if (e.comboTimer === 0) {
            e.combo = 1;
            setCombo(1);
          }
        }
      }

      // ── 7. Render All Visuals ──
      if (e.shake > 0) {
        e.shake *= 0.88;
        if (e.shake < 0.1) e.shake = 0;
      }

      ctx.save();
      if (e.shake > 0) {
        ctx.translate((Math.random() - 0.5) * e.shake * 8, (Math.random() - 0.5) * e.shake * 8);
      }

      // Background Gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#020617');
      bgGrad.addColorStop(0.5, '#090d24');
      bgGrad.addColorStop(1, '#050819');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Starfield Motion
      e.stars.forEach(s => {
        s.y = (s.y + s.speed) % height;
        ctx.fillStyle = s.color;
        ctx.fillRect(s.x, s.y, s.size, s.size * 2);
      });

      // Base line
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(0, height - 30);
      ctx.lineTo(width, height - 30);
      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Powerups
      e.powerups.forEach(p => {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(e.tick * 3);
        ctx.fillStyle = p.type === 'triple' ? '#38bdf8' : p.type === 'shield' ? '#22c55e' : '#f59e0b';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      });

      // Draw Player Lasers
      e.lasers.forEach(l => {
        ctx.fillStyle = l.isTriple ? '#a855f7' : '#38bdf8';
        ctx.shadowColor = l.isTriple ? '#a855f7' : '#38bdf8';
        ctx.shadowBlur = 10;
        ctx.fillRect(l.x - 2, l.y, 4, 16);
        ctx.shadowBlur = 0;
      });

      // Draw Enemy Bullets
      e.enemyBullets.forEach(b => {
        ctx.fillStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Draw Aliens
      e.aliens.forEach(a => {
        ctx.save();
        ctx.translate(a.x, a.y);

        // Pulsating shield
        ctx.strokeStyle = a.type === 'dreadnought' ? '#f59e0b' : '#a855f7';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, a.radius + 4 + Math.sin(e.tick * 4) * 2, 0, Math.PI * 2);
        ctx.stroke();

        // Hull
        ctx.fillStyle = '#1e1035';
        ctx.strokeStyle = a.type === 'dreadnought' ? '#fbbf24' : '#c084fc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, a.radius);
        ctx.lineTo(-a.radius, -a.radius * 0.6);
        ctx.lineTo(0, -a.radius * 0.2);
        ctx.lineTo(a.radius, -a.radius * 0.6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Eye
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Name & Health bar
        ctx.fillStyle = '#94a3b8';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(a.name, a.x, a.y + a.radius + 12);

        const barW = a.radius * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(a.x - barW / 2, a.y - a.radius - 8, barW, 3);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(a.x - barW / 2, a.y - a.radius - 8, barW * (a.hp / a.maxHp), 3);
      });

      // Draw Particles
      for (let i = e.particles.length - 1; i >= 0; i--) {
        const p = e.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.025;

        if (p.life <= 0) {
          e.particles.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fillRect(p.x, p.y, p.size, p.size);
        ctx.globalAlpha = 1.0;
      }

      // Draw Player Starfighter
      drawStarfighter(ctx, e.jetX, e.jetY, e.jetVx * -0.06, e.tick);

      ctx.restore();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, isGameOver, codeAlgorithmActive, highScore, onFinish, onScoreUpdate]);

  const drawStarfighter = (ctx: CanvasRenderingContext2D, x: number, y: number, bankAngle: number, tick: number) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(bankAngle);

    // Twin Exhaust Flames
    [-10, 10].forEach(offset => {
      const flameLen = 16 + Math.sin(tick * 10) * 8;
      const flameGrad = ctx.createLinearGradient(offset, 14, offset, 14 + flameLen);
      flameGrad.addColorStop(0, '#38bdf8');
      flameGrad.addColorStop(0.5, '#6366f1');
      flameGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.moveTo(offset - 4, 14);
      ctx.lineTo(offset, 14 + flameLen);
      ctx.lineTo(offset + 4, 14);
      ctx.closePath();
      ctx.fill();
    });

    // Fighter Wings
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(24, 14);
    ctx.lineTo(14, 14);
    ctx.lineTo(8, 20);
    ctx.lineTo(-8, 20);
    ctx.lineTo(-14, 14);
    ctx.lineTo(-24, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cyan Wing Insets
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-18, 10);
    ctx.lineTo(0, -18);
    ctx.lineTo(18, 10);
    ctx.stroke();

    // Twin Cannons
    ctx.fillStyle = '#6366f1';
    ctx.fillRect(-26, -4, 4, 16);
    ctx.fillRect(22, -4, 4, 16);

    // Cockpit
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, -6, 5, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  };

  // Touch controls for mobile / mouse clicking
  const handleTouchSteer = (dir: 'left' | 'right', isPress: boolean) => {
    if (dir === 'left') keysRef.current.left = isPress;
    if (dir === 'right') keysRef.current.right = isPress;
  };

  // Direct touch drag steering on canvas (for phones & tablets)
  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;
    const touchX = ((touch.clientX - rect.left) / rect.width) * canvas.width;
    entitiesRef.current.jetX = Math.max(30, Math.min(canvas.width - 30, touchX));
    keysRef.current.fire = true; // Auto-fire while dragging on screen
  };

  const handleCanvasTouchEnd = () => {
    keysRef.current.fire = false;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#090d24', border: '1px solid #1e293b', borderRadius: 'var(--radius)', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
      
      {/* ── Main Canvas Screen ── */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/10', minHeight: '340px', touchAction: 'none' }}>
        <canvas
          ref={canvasRef}
          width={640}
          height={400}
          onTouchStart={handleCanvasTouch}
          onTouchMove={handleCanvasTouch}
          onTouchEnd={handleCanvasTouchEnd}
          style={{ width: '100%', height: '100%', display: 'block', cursor: 'crosshair', touchAction: 'none' }}
        />

        {/* Top HUD Overlay */}
        <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ background: 'rgba(3, 7, 18, 0.88)', backdropFilter: 'blur(6px)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.4)', color: '#38bdf8', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Zap size={14} />
            <span>WAVE {wave}</span>
          </div>

          <div style={{ background: 'rgba(3, 7, 18, 0.88)', backdropFilter: 'blur(6px)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(34, 197, 94, 0.4)', color: '#4ade80', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Shield size={14} />
            <span>SHIELD: {Math.round(entitiesRef.current.jetShield)}%</span>
          </div>

          <div style={{ background: 'rgba(3, 7, 18, 0.88)', backdropFilter: 'blur(6px)', padding: '0.35rem 0.75rem', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.4)', color: '#fbbf24', fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--mono)' }}>
            SCORE: {score.toLocaleString()} {combo > 1 && <span style={{ color: '#ec4899' }}>({combo}x COMBO!)</span>}
          </div>
        </div>

        {/* Top-Right EMP & Sound HUD */}
        <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <button
            onClick={triggerEmpBomb}
            disabled={empBombs <= 0}
            title="Deploy EMP Smart Bomb (Press B or Shift)"
            style={{ background: empBombs > 0 ? '#3b82f6' : '#1e293b', border: 'none', color: '#fff', padding: '0.35rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
          >
            <Bomb size={13} />
            <span>EMP x{empBombs}</span>
          </button>

          <button
            onClick={toggleSound}
            title="Toggle Sound Effects"
            style={{ background: 'rgba(3, 7, 18, 0.85)', border: '1px solid #334155', color: soundMuted ? '#94a3b8' : '#38bdf8', padding: '0.35rem 0.5rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            {soundMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
        </div>

        {/* Game Over Screen */}
        {isGameOver && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(3, 7, 18, 0.88)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
            <div style={{ background: '#450a0a', border: '2px solid #ef4444', padding: '1.5rem 2.5rem', borderRadius: '14px', textAlign: 'center', boxShadow: '0 0 50px rgba(239, 68, 68, 0.6)' }}>
              <AlertTriangle size={44} style={{ color: '#f87171', margin: '0 auto 0.5rem' }} />
              <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>AIRCRAFT DESTROYED</h2>
              <p style={{ color: '#fca5a5', fontSize: '0.85rem', margin: '0.35rem 0 1rem' }}>
                Final Score: <strong>{score.toLocaleString()}</strong> · Wave Reached: <strong>{wave}</strong>
              </p>
              <button onClick={resetGame} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                <RotateCcw size={16} /> Play Again
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Interactive Arcade Controls HUD ── */}
      <div style={{ padding: '0.75rem 1rem', background: '#050819', borderTop: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        
        {/* Playable Pilot Flight Controls Instructions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
          <span style={{ color: '#38bdf8', fontWeight: 800 }}>🕹️ FLIGHT CONTROLS:</span>
          <span>Fly: <strong>← →</strong> (or <strong>A / D</strong>)</span>
          <span>·</span>
          <span>Fire: <strong>SPACEBAR</strong></span>
          <span>·</span>
          <span>EMP: <strong>B</strong></span>
        </div>

        {/* On-Screen Mobile / Clickable Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button
            onMouseDown={() => handleTouchSteer('left', true)}
            onMouseUp={() => handleTouchSteer('left', false)}
            onTouchStart={() => handleTouchSteer('left', true)}
            onTouchEnd={() => handleTouchSteer('left', false)}
            className="btn btn-outline btn-xs"
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}
          >
            ◄ Left
          </button>

          <button
            onMouseDown={() => { keysRef.current.fire = true; }}
            onMouseUp={() => { keysRef.current.fire = false; }}
            onTouchStart={() => { keysRef.current.fire = true; }}
            onTouchEnd={() => { keysRef.current.fire = false; }}
            className="btn btn-primary btn-xs"
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.85rem', fontWeight: 800, background: '#ef4444', borderColor: '#dc2626' }}
          >
            🔥 FIRE
          </button>

          <button
            onMouseDown={() => handleTouchSteer('right', true)}
            onMouseUp={() => handleTouchSteer('right', false)}
            onTouchStart={() => handleTouchSteer('right', true)}
            onTouchEnd={() => handleTouchSteer('right', false)}
            className="btn btn-outline btn-xs"
            style={{ fontSize: '0.85rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}
          >
            Right ►
          </button>

          <button onClick={resetGame} className="btn btn-ghost btn-xs" title="Restart Game">
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
