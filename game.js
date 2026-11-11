'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
const STAR_SPEED        = 300;  // px/s, mucho más rápida que un asteroide normal
const STAR_TTL          = 5;    // s del cuerpo en pantalla
const STAR_RADIUS       = 10;
const STAR_POINTS       = 250;  // bonus por destruirla
const STAR_SPAWN_EVERY  = 10;   // s entre chances de aparición
const STAR_SPAWN_CHANCE = 0.5;
const STAR_MIN_LEVEL    = 2;
const STAR_COLOR        = '#fd4';
const TRAIL_TTL         = 1.2;  // s de vida de cada punto del rastro
const TRAIL_SAMPLE      = 0.03; // s entre muestras del rastro
const TRAIL_RADIUS      = 7;    // radio de daño del rastro

class ShootingStar {
  constructor() {
    // Entra por un borde aleatorio apuntando hacia la zona central
    const side = randInt(0, 3);
    if (side === 0)      { this.x = rand(0, W); this.y = 0; }
    else if (side === 1) { this.x = W; this.y = rand(0, H); }
    else if (side === 2) { this.x = rand(0, W); this.y = H; }
    else                 { this.x = 0; this.y = rand(0, H); }

    const tx = rand(W * 0.25, W * 0.75);
    const ty = rand(H * 0.25, H * 0.75);
    const angle = Math.atan2(ty - this.y, tx - this.x);
    this.vx = Math.cos(angle) * STAR_SPEED;
    this.vy = Math.sin(angle) * STAR_SPEED;

    this.radius   = STAR_RADIUS;
    this.ttl      = STAR_TTL;
    this.expired  = false; // el cuerpo desapareció; el rastro aún se apaga
    this.dead     = false;
    this.rot      = rand(0, Math.PI * 2);
    this.rotSpeed = rand(-2, 2);
    this.trail       = [];
    this.sampleTimer = 0;
  }

  update(dt) {
    if (!this.expired) {
      this.x = wrap(this.x + this.vx * dt, W);
      this.y = wrap(this.y + this.vy * dt, H);
      this.rot += this.rotSpeed * dt;

      // Muestrear el rastro a intervalos fijos
      this.sampleTimer -= dt;
      if (this.sampleTimer <= 0) {
        this.sampleTimer = TRAIL_SAMPLE;
        this.trail.push({ x: this.x, y: this.y, ttl: TRAIL_TTL });
      }

      this.ttl -= dt;
      if (this.ttl <= 0) this.expired = true;
    }

    // El rastro se desvanece aunque el cuerpo ya no exista
    this.trail.forEach(p => p.ttl -= dt);
    this.trail = this.trail.filter(p => p.ttl > 0);
    this.dead = this.expired && this.trail.length === 0;
  }

  draw() {
    // Rastro: segmentos cálidos que se desvanecen
    for (let i = 1; i < this.trail.length; i++) {
      const a = this.trail[i - 1];
      const b = this.trail[i];
      // Cortar el segmento si el salto es grande (envolvimiento de bordes)
      if (Math.hypot(b.x - a.x, b.y - a.y) > STAR_SPEED * TRAIL_SAMPLE * 2) continue;
      ctx.strokeStyle = `rgba(255, 221, 68, ${(a.ttl / TRAIL_TTL).toFixed(2)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    if (this.expired) return;
    // Parpadeo del cuerpo cuando está a punto de desaparecer
    if (this.ttl < 1.5 && Math.floor(this.ttl * 6) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = STAR_COLOR;
    ctx.fillStyle   = 'rgba(255, 221, 68, 0.2)';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Estrella de 4 puntas
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2;
      const r = i % 2 === 0 ? this.radius : this.radius * 0.4;
      if (i === 0) ctx.moveTo(Math.cos(ang) * r, Math.sin(ang) * r);
      else ctx.lineTo(Math.cos(ang) * r, Math.sin(ang) * r);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

// ── PowerUp (escudo) ──────────────────────────────────────────────────────────
const POWERUP_CHANCE  = 0.15;  // probabilidad de drop al destruir un asteroide
const POWERUP_TTL     = 12;    // s en pantalla antes de desaparecer
const SHIELD_DURATION = 5;     // s de escudo al recoger el power-up
const POWERUP_COLOR   = '#6cf';

class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 11;
    this.ttl  = POWERUP_TTL;
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = rand(25, 45);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-0.8, 0.8);
    this.rot = rand(0, Math.PI * 2);

    // Hexágono regular
    this.verts = [];
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this.verts.push([Math.cos(a) * this.radius, Math.sin(a) * this.radius]);
    }
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadeo cuando está a punto de desaparecer
    if (this.ttl < 2 && Math.floor(this.ttl * 6) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = POWERUP_COLOR;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Anillo hexagonal giratorio
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Glifo de escudo, sin rotación para que se vea fijo
    ctx.rotate(-this.rot);
    ctx.beginPath();
    ctx.moveTo( 0, -6);
    ctx.lineTo( 5, -4);
    ctx.lineTo( 5,  1);
    ctx.lineTo( 0,  6);
    ctx.lineTo(-5,  1);
    ctx.lineTo(-5, -4);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
const SHIP_TYPES = [
  {
    name: 'CLÁSICA',
    description: 'TAMAÑO NORMAL · ×1 PUNTOS',
    radius: 12,
    scale: 1,
    nose: 21,
    scoreMultiplier: 1,
  },
  {
    name: 'PESADA',
    description: 'MÁS GRANDE · ×2 PUNTOS',
    radius: 20,
    scale: 1.6,
    nose: 34,
    scoreMultiplier: 2,
  },
];

class Ship {
  constructor(type = SHIP_TYPES[0]) {
    this.type = type;
    this.reset();
  }

  get shielded() { return this.shieldTime > 0; }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = this.type.radius;
    this.scale  = this.type.scale;
    this.scoreMultiplier = this.type.scoreMultiplier;
    this.shieldRadius    = this.type.radius + 10;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.shieldTime    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.shieldTime    > 0) this.shieldTime    -= dt;

    const ROT   = 3.5;   // rad/s
    const THRUST = 260;  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = this.type.nose;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.scale(this.scale, this.scale);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5 / this.scale;
    ctx.lineJoin    = 'round';

    // Silueta clásica: triángulo con muesca trasera
    ctx.beginPath();
    ctx.moveTo( 20,  0);   // nariz
    ctx.lineTo(-12, -9);   // ala izquierda
    ctx.lineTo( -7,  0);   // muesca trasera
    ctx.lineTo(-12,  9);   // ala derecha
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(-8, -4);
      ctx.lineTo(-8 - rand(6, 14), 0);
      ctx.lineTo(-8,  4);
      ctx.strokeStyle = 'rgba(255, 130, 0, 0.85)';
      ctx.stroke();
    }

    ctx.restore();

    // Anillo de escudo: pulsa suave y parpadea en su último segundo
    if (this.shielded) {
      const ending = this.shieldTime < 1 && Math.floor(this.shieldTime * 8) % 2 === 0;
      if (!ending) {
        ctx.save();
        ctx.globalAlpha = 0.5 + 0.25 * Math.sin(this.shieldTime * 9);
        ctx.strokeStyle = POWERUP_COLOR;
        ctx.lineWidth   = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.shieldRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
  }
}

const previewShips = SHIP_TYPES.map(type => {
  const preview = new Ship(type);
  preview.invincible = 0;
  return preview;
});

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups, shootingStars;
let score, lives, level;
let state;      // 'select' | 'playing' | 'dead' | 'gameover'
let deadTimer;
let starTimer;
let shipTypeIndex = 0;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function resetWorld() {
  ship          = new Ship(SHIP_TYPES[shipTypeIndex]);
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  shootingStars = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  starTimer = STAR_SPAWN_EVERY;
}

function startGame() {
  resetWorld();
  state = 'playing';
  spawnAsteroids(4);
}

function showShipSelect() {
  resetWorld();
  state = 'select';
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  shootingStars = [];
  starTimer = STAR_SPAWN_EVERY;
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function destroyAsteroid(a, fragments) {
  a.dead = true;
  score += POINTS[a.size] * ship.scoreMultiplier;
  explode(a.x, a.y, a.size * 5);
  fragments.push(...a.split());
}

function maybeDropPowerUp(a) {
  if (powerups.length === 0 && Math.random() < POWERUP_CHANCE)
    powerups.push(new PowerUp(a.x, a.y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

function destroyShootingStar(s) {
  s.expired = true;
  score += STAR_POINTS * ship.scoreMultiplier;
  explode(s.x, s.y, 12);
}

function maybeSpawnShootingStar(dt) {
  starTimer -= dt;
  if (starTimer > 0) return;
  starTimer = STAR_SPAWN_EVERY;
  const active = shootingStars.some(s => !s.expired);
  if (level >= STAR_MIN_LEVEL && !active && Math.random() < STAR_SPAWN_CHANCE)
    shootingStars.push(new ShootingStar());
}

function trailHitsShip() {
  if (ship.dead || ship.shielded || ship.invincible > 0) return false;
  return shootingStars.some(s =>
    s.trail.some(p => dist(ship, p) < ship.radius + TRAIL_RADIUS));
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'select') {
    if (pressed('ArrowLeft'))
      shipTypeIndex = (shipTypeIndex + SHIP_TYPES.length - 1) % SHIP_TYPES.length;
    if (pressed('ArrowRight'))
      shipTypeIndex = (shipTypeIndex + 1) % SHIP_TYPES.length;
    if (pressed('Space')) startGame();
    return;
  }

  if (state === 'gameover') {
    if (pressed('Space')) startGame();
    if (pressed('KeyS')) showShipSelect();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    powerups.forEach(p => p.update(dt));
    powerups = powerups.filter(p => !p.dead);
    shootingStars.forEach(s => s.update(dt));
    shootingStars = shootingStars.filter(s => !s.dead);
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  powerups.forEach(p => p.update(dt));
  particles.forEach(p => p.update(dt));
  maybeSpawnShootingStar(dt);
  shootingStars.forEach(s => s.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  shootingStars = shootingStars.filter(s => !s.dead);

  // Bala vs asteroide y estrella fugaz
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        destroyAsteroid(a, newAsteroids);
        maybeDropPowerUp(a);
      }
    }
    for (const s of shootingStars) {
      if (!s.expired && !b.dead && dist(b, s) < s.radius) {
        b.dead = true;
        destroyShootingStar(s);
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide: con escudo el asteroide se destruye sin dañar la nave
  const shieldFragments = [];
  const hitRadius = ship.shielded ? ship.shieldRadius : ship.radius;
  for (const a of asteroids) {
    if (a.dead) continue;
    if (dist(ship, a) >= hitRadius + a.radius * 0.82) continue;
    if (ship.shielded) {
      destroyAsteroid(a, shieldFragments);
    } else if (ship.invincible <= 0) {
      killShip();
      break;
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(shieldFragments);

  // Nave vs cuerpo de la estrella fugaz: se comporta como un asteroide
  for (const s of shootingStars) {
    if (ship.dead) break;
    if (s.expired) continue;
    if (dist(ship, s) >= hitRadius + s.radius) continue;
    if (ship.shielded) {
      destroyShootingStar(s);
    } else if (ship.invincible <= 0) {
      killShip();
      break;
    }
  }

  // Nave vs rastro: daña salvo con escudo o invencibilidad de reaparición
  if (trailHitsShip()) killShip();

  // Nave vs power-up
  for (const p of powerups) {
    if (!p.dead && !ship.dead && dist(ship, p) < ship.radius + p.radius) {
      p.dead = true;
      ship.shieldTime = SHIELD_DURATION;
      explode(p.x, p.y, 6);
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '13px monospace';
  ctx.fillText(`${ship.type.name}  ×${ship.scoreMultiplier}`, 14, 46);

  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (ship.shielded) {
    ctx.fillStyle = POWERUP_COLOR;
    ctx.textAlign = 'right';
    ctx.fillText(`ESCUDO ${ship.shieldTime.toFixed(1)}`, W - 16, 48);
  }
}

function drawShipSelect() {
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  ctx.font      = 'bold 40px monospace';
  ctx.fillText('ELIGE TU NAVE', W / 2, 140);

  const y      = H / 2 - 10;
  const gap    = 210;
  const startX = W / 2 - gap * (SHIP_TYPES.length - 1) / 2;

  SHIP_TYPES.forEach((type, i) => {
    const x = startX + i * gap;
    const preview = previewShips[i];
    preview.x = x;
    preview.y = y;
    preview.draw();

    if (i === shipTypeIndex) {
      ctx.strokeStyle = POWERUP_COLOR;
      ctx.lineWidth   = 2;
      ctx.strokeRect(x - 80, y - 70, 160, 160);
    }

    ctx.fillStyle = i === shipTypeIndex ? '#fff' : 'rgba(255,255,255,0.5)';
    ctx.font      = 'bold 18px monospace';
    ctx.fillText(type.name, x, y + 78);

    ctx.fillStyle = i === shipTypeIndex ? POWERUP_COLOR : 'rgba(255,255,255,0.4)';
    ctx.font      = '14px monospace';
    ctx.fillText(type.description, x, y + 100);
  });

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font      = '16px monospace';
  ctx.fillText('← → PARA ELEGIR   —   ESPACIO PARA JUGAR', W / 2, H - 80);
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (state === 'select') {
    drawShipSelect();
    return;
  }

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  shootingStars.forEach(s => s.draw());
  bullets.forEach(b => b.draw());
  powerups.forEach(p => p.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR   —   S PARA ELEGIR NAVE`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

showShipSelect();
requestAnimationFrame(loop);
