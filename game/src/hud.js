// The HUD: the DOM readouts (health, cash, stars, objective, banner, speed)
// and the 2D minimap, drawn fresh every frame from the world state. The minimap
// is the player's compass: roads, the player arrow, police in red, the mission
// beacon in gold, traffic in white.
import { BLOCK, BLOCKS, CITY, ROAD } from './config.js';

export function createHud(document) {
  const el = (id) => document.getElementById(id);
  const hud = {
    healthFill: el('health-fill'),
    healthText: el('health-text'),
    cash: el('cash'),
    stars: el('stars'),
    objective: el('objective'),
    banner: el('banner'),
    speed: el('speed'),
    minimap: el('minimap'),
    flashEl: el('flash'),
    crosshair: el('crosshair'),
    bannerTimer: 0,
    bannerQueue: [],
    setHealth(hp) {
      const pct = Math.max(0, Math.min(100, hp));
      this.healthFill.style.width = `${pct}%`;
      this.healthFill.style.background = pct > 50 ? '#58c96b' : pct > 25 ? '#e8a52e' : '#e84a3a';
      this.healthText.textContent = `${Math.ceil(pct)}`;
    },
    setCash(cash) {
      this.cash.textContent = `$${cash.toLocaleString('en-US')}`;
    },
    setStars(n) {
      this.stars.textContent = '★'.repeat(n) + '☆'.repeat(5 - n);
      this.stars.className = n > 0 ? 'hot' : '';
    },
    setObjective(text) {
      this.objective.textContent = text;
    },
    setSpeed(kmh) {
      this.speed.textContent = kmh > 1 ? `${Math.round(kmh)} km/h` : '';
    },
    banner(text) {
      this.bannerQueue.push(text);
      if (this.bannerTimer <= 0) this.nextBanner();
    },
    nextBanner() {
      const text = this.bannerQueue.shift();
      if (!text) {
        this.banner.textContent = '';
        this.bannerTimer = 0;
        return;
      }
      this.banner.textContent = text;
      this.bannerTimer = 3.2;
    },
    flash(kind) {
      this.flashEl.className = kind === 'busted' ? 'show red' : 'show';
      setTimeout(() => { this.flashEl.className = ''; }, 350);
    },
    step(dt) {
      if (this.bannerTimer > 0) {
        this.bannerTimer -= dt;
        if (this.bannerTimer <= 0) this.nextBanner();
      }
    },
    drawMinimap(world) {
      const canvas = this.minimap;
      const ctx = canvas.getContext('2d');
      const size = canvas.width;
      const half = CITY / 2 + 24;
      const toMap = (x, z) => [
        ((x + half) / (half * 2)) * size,
        ((z + half) / (half * 2)) * size,
      ];
      ctx.fillStyle = '#0e1a24';
      ctx.fillRect(0, 0, size, size);
      // Roads.
      ctx.strokeStyle = '#3a4550';
      ctx.lineWidth = 5;
      const pitch = BLOCK + ROAD;
      for (let i = 0; i <= BLOCKS; i += 1) {
        const at = -CITY / 2 + i * pitch - ROAD / 2;
        const [x1, y1] = toMap(at, -half);
        const [x2, y2] = toMap(at, half);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        const [x3, y3] = toMap(-half, at);
        const [x4, y4] = toMap(half, at);
        ctx.beginPath();
        ctx.moveTo(x3, y3);
        ctx.lineTo(x4, y4);
        ctx.stroke();
      }
      // The sea, south.
      ctx.fillStyle = '#1e6f8e';
      const [, seaY] = toMap(0, CITY / 2 + 8);
      ctx.fillRect(0, seaY, size, size - seaY);
      // Traffic, white dots.
      ctx.fillStyle = '#e8e8e8';
      for (const car of world.cars) {
        if (car.dead || car.kind === 'police') continue;
        const [x, y] = toMap(car.x, car.z);
        ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
      }
      // Police, red dots.
      ctx.fillStyle = '#ff3b30';
      for (const car of world.cars) {
        if (car.kind !== 'police' || car.dead) continue;
        const [x, y] = toMap(car.x, car.z);
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      // The mission beacon, gold.
      const target = world.missions.targetPos();
      if (target) {
        const [x, y] = toMap(target.x, target.z);
        ctx.fillStyle = '#ffd23e';
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd23e';
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      // The player, a white arrow that points where he faces.
      const p = world.player;
      const px = p.car ? p.car.x : p.x;
      const pz = p.car ? p.car.z : p.z;
      const heading = p.car ? p.car.heading : p.heading;
      const [mx, my] = toMap(px, pz);
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(heading);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  };
  return hud;
}
