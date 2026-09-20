'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

window.addEventListener('keydown', (e) => {
  if (!keys[e.code]) justPressed[e.code] = true;
  keys[e.code] = true;
});

window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

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

// Siluetas dibujadas a mano, normalizadas a radio 1 (vértice más lejano = 1.0).
// Se usan como variación de los asteroides grandes junto a las formas aleatorias.
const BIG_SHAPES = [
  [
    [-0.100, -0.936], [ 0.435, -0.789], [ 0.301, -0.227], [ 0.856, -0.067],
    [ 0.682,  0.542], [ 0.234,  0.535], [ 0.013,  0.890], [-0.649,  0.575],
    [-0.936,  0.020], [-0.836, -0.549],
  ],
];

// Probabilidad de que un asteroide grande use una silueta del catálogo.
const BIG_SHAPE_CHANCE = 1 / 3;

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

    // Polígono irregular: los grandes usan a veces una silueta del catálogo.
    if (size === 3 && Math.random() < BIG_SHAPE_CHANCE) {
      const shape = BIG_SHAPES[randInt(0, BIG_SHAPES.length - 1)];
      this.verts = shape.map(([x, y]) => [x * this.radius, y * this.radius]);
    } else {
      const n = randInt(8, 13);
      this.verts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = this.radius * rand(0.6, 1.0);
        this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
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

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;

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
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    const shots = [new Bullet(ox, oy, this.angle)];
    if (tripleTimer > 0) {
      shots.push(new Bullet(ox, oy, this.angle - TRIPLE_SPREAD));
      shots.push(new Bullet(ox, oy, this.angle + TRIPLE_SPREAD));
    }
    return shots;
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
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

    // Escudo temporal activo: anillo de energía alrededor de la nave
    if (shieldTimer > 0 && !(shieldTimer < 1.5 && Math.floor(shieldTimer * 8) % 2 === 0)) {
      const shieldColor = PU_DEFS.shield.color;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = shieldColor;
      ctx.lineWidth   = 2;
      ctx.shadowColor = shieldColor;
      ctx.shadowBlur  = 10;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

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

// ── Power-Ups ─────────────────────────────────────────────────────────────────
const PU_DROP_CHANCE  = 0.15;  // prob. por asteroide destruido (evaluada por cada tipo)
const PU_TTL          = 12;    // segundos que un orbe permanece en pantalla sin recoger
const TRIPLE_DURATION = 10;    // segundos de disparo triple
const TRIPLE_SPREAD   = 0.22;  // rad de separación entre balas del abanico
const SHIELD_DURATION = 5;     // segundos que dura el escudo temporal

// Un tipo por clave: cada power-up tiene su propio color y figura geométrica
// para distinguirse a simple vista. Al agregar uno nuevo, súmalo aquí con
// colores/figura que no se repitan.
const PU_DEFS = {
  triple: { color: '#2ee6d0', sides: 3, label: '3x' }, // verde azulado, triángulo
  shield: { color: '#b967ff', sides: 6, label: 'S'  }, // violeta, hexágono
};

class PowerUp {
  constructor(x, y, type) {
    this.type = type;
    this.x    = x;
    this.y    = y;
    this.radius   = 12;
    this.ttl  = PU_TTL;
    this.life = PU_TTL;
    this.rot  = rand(0, Math.PI * 2);
    this.rotSpeed = rand(0.6, 1.4) * (Math.random() < 0.5 ? 1 : -1);
    const angle = rand(0, Math.PI * 2);
    const speed = rand(20, 45);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.dead = false;
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    // Parpadea cuando está por expirar
    if (this.ttl < 3 && Math.floor(this.ttl * 6) % 2 === 0) return;

    const def = PU_DEFS[this.type];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = def.color;
    ctx.lineWidth   = 2.5;
    ctx.lineJoin    = 'round';
    ctx.shadowColor = def.color;
    ctx.shadowBlur  = 8;

    ctx.beginPath();
    for (let i = 0; i < def.sides; i++) {
      const a = (i / def.sides) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * this.radius;
      const y = Math.sin(a) * this.radius;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();

    ctx.shadowBlur   = 0;
    ctx.fillStyle    = def.color;
    ctx.font         = 'bold 8px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.label, 0, 0);

    ctx.restore();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles;
let score, lives, level;
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;
let powerups;          // PowerUp[] — normalmente 0-2, pero puede haber más si quedan
                        // pendientes al cambiar de nivel
let spawnedThisLevel;  // { triple: bool, shield: bool } — ya salió ese tipo en el nivel actual
let tripleTimer;       // segundos restantes de disparo triple
let shieldTimer;       // segundos restantes de escudo activo (0 = inactivo)

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

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  powerups         = [];
  spawnedThisLevel = { triple: false, shield: false };
  tripleTimer      = 0;
  shieldTimer      = 0;
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  ship.reset();
  // powerups NO se limpia: si el último asteroide del nivel anterior soltó uno
  // y no se recogió a tiempo, debe seguir siendo recogible en el nuevo nivel.
  spawnedThisLevel = { triple: false, shield: false };
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  tripleTimer = 0;
  shieldTimer = 0;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (state === 'gameover') {
    if (pressed('Space')) initGame();
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
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  if (tripleTimer > 0) tripleTimer -= dt;
  if (shieldTimer > 0) shieldTimer -= dt;

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(p => p.update(dt));

  bullets   = bullets.filter(b => !b.dead);
  particles = particles.filter(p => !p.dead);
  powerups  = powerups.filter(p => !p.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  let lastKillX = null, lastKillY = null;
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        lastKillX = a.x;
        lastKillY = a.y;
        for (const type of Object.keys(PU_DEFS)) {
          if (!spawnedThisLevel[type] && Math.random() < PU_DROP_CHANCE) {
            powerups.push(new PowerUp(a.x, a.y, type));
            spawnedThisLevel[type] = true;
          }
        }
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Garantiza al menos un power-up de cada tipo por nivel: si el nivel se
  // acaba de vaciar y algún tipo todavía no salió por azar, se fuerza en la
  // posición del último asteroide destruido.
  if (asteroids.length === 0 && lastKillX !== null) {
    for (const type of Object.keys(PU_DEFS)) {
      if (!spawnedThisLevel[type]) {
        powerups.push(new PowerUp(lastKillX, lastKillY, type));
        spawnedThisLevel[type] = true;
      }
    }
  }

  // Nave vs power-up
  for (const p of powerups) {
    if (!p.dead && !ship.dead && dist(ship, p) < ship.radius + p.radius) {
      explode(p.x, p.y, 10);
      p.dead = true;
      if (p.type === 'triple') tripleTimer = TRIPLE_DURATION;
      if (p.type === 'shield') shieldTimer = SHIELD_DURATION;
    }
  }
  powerups = powerups.filter(p => !p.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        if (shieldTimer > 0) {
          // El escudo absorbe el impacto: se consume y da un respiro breve
          // para no volver a chocar con el mismo asteroide en el acto.
          shieldTimer = 0;
          ship.invincible = 0.5;
          explode(ship.x, ship.y, 10);
        } else {
          killShip();
        }
        break;
      }
    }
  }

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

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  if (tripleTimer > 0 && !(tripleTimer < 2 && Math.floor(tripleTimer * 6) % 2 === 0)) {
    ctx.textAlign = 'left';
    ctx.font      = '13px monospace';
    ctx.fillStyle = PU_DEFS.triple.color;
    ctx.fillText(`[3x] DISPARO TRIPLE ${Math.ceil(tripleTimer)}s`, 14, H - 14);
  }

  if (shieldTimer > 0 && !(shieldTimer < 1.5 && Math.floor(shieldTimer * 8) % 2 === 0)) {
    ctx.textAlign = 'left';
    ctx.font      = '13px monospace';
    ctx.fillStyle = PU_DEFS.shield.color;
    ctx.fillText(`[S] ESCUDO ${Math.ceil(shieldTimer)}s`, 14, H - 32);
  }
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

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  powerups.forEach(p => p.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR`);
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

initGame();
requestAnimationFrame(loop);
