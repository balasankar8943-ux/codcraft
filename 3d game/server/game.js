const crypto = require('crypto');

const TICK_RATE = 20;
const TICK_INTERVAL = 1000 / TICK_RATE;
const MAP_SIZE = 80;
const PLAYER_RADIUS = 0.8;
const PLAYER_SPEED = 12;
const PLAYER_HEALTH = 100;
const WEAPON_DAMAGE = 25;
const WEAPON_RANGE = 60;
const WEAPON_COOLDOWN = 300;
const RESPAWN_TIME = 3;

const PLAYER_COLORS = [
  0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12,
  0x9b59b6, 0x1abc9c, 0xe67e22, 0x34495e
];

const OBSTACLES = [
  { x: 0, z: 0, w: 8, h: 8, color: 0x555555 },
  { x: -25, z: -20, w: 4, h: 12, color: 0x666666 },
  { x: 25, z: 20, w: 4, h: 12, color: 0x666666 },
  { x: -20, z: 25, w: 12, h: 4, color: 0x666666 },
  { x: 20, z: -25, w: 12, h: 4, color: 0x666666 },
  { x: -15, z: -15, w: 5, h: 5, color: 0x777777 },
  { x: 15, z: 15, w: 5, h: 5, color: 0x777777 },
  { x: -15, z: 15, w: 5, h: 5, color: 0x777777 },
  { x: 15, z: -15, w: 5, h: 5, color: 0x777777 },
  { x: -30, z: 0, w: 3, h: 8, color: 0x888888 },
  { x: 30, z: 0, w: 3, h: 8, color: 0x888888 },
];

class Player {
  constructor(ws, name) {
    this.id = crypto.randomBytes(8).toString('hex');
    this.ws = ws;
    this.name = name;
    this.color = PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    this.x = 0;
    this.z = 0;
    this.rotationY = 0;
    this.aimY = 0;
    this.health = PLAYER_HEALTH;
    this.kills = 0;
    this.deaths = 0;
    this.isAlive = true;
    this.respawnTimer = 0;
    this.lastShotTime = 0;
    this.input = { forward: false, backward: false, left: false, right: false, shooting: false };
    this.spawn();
  }

  spawn() {
    const half = MAP_SIZE / 2 - 5;
    for (let i = 0; i < 50; i++) {
      this.x = (Math.random() - 0.5) * half * 2;
      this.z = (Math.random() - 0.5) * half * 2;
      let valid = true;
      for (const obs of OBSTACLES) {
        if (Math.abs(this.x - obs.x) < obs.w / 2 + PLAYER_RADIUS + 1 &&
            Math.abs(this.z - obs.z) < obs.h / 2 + PLAYER_RADIUS + 1) {
          valid = false;
          break;
        }
      }
      if (valid) break;
    }
    this.health = PLAYER_HEALTH;
    this.isAlive = true;
    this.rotationY = Math.random() * Math.PI * 2;
  }
}

class GameRoom {
  constructor() {
    this.players = new Map();
    this.tickInterval = null;
    this.hitMarkers = [];
  }

  addPlayer(ws, name) {
    const player = new Player(ws, name);
    this.players.set(player.id, player);

    this.send(ws, { type: 'init', id: player.id, color: player.color, obstacles: OBSTACLES, mapSize: MAP_SIZE });

    const peers = [];
    for (const [id, p] of this.players) {
      if (id !== player.id) {
        peers.push({ id: p.id, name: p.name, color: p.color, x: p.x, z: p.z, rotationY: p.rotationY, health: p.health, isAlive: p.isAlive, kills: p.kills, deaths: p.deaths });
      }
    }
    if (peers.length) this.send(ws, { type: 'players_list', players: peers });

    this.broadcast({
      type: 'player_joined', id: player.id, name: player.name, color: player.color,
      x: player.x, z: player.z, rotationY: player.rotationY, health: player.health, isAlive: player.isAlive
    }, player.id);

    this.broadcast({
      type: 'score', entries: this.getScoreboard()
    });

    if (!this.tickInterval) this.tickInterval = setInterval(() => this.tick(), TICK_INTERVAL);
    return player;
  }

  removePlayer(ws) {
    for (const [id, player] of this.players) {
      if (player.ws === ws) {
        this.players.delete(id);
        this.broadcast({ type: 'player_left', id });
        this.broadcast({ type: 'score', entries: this.getScoreboard() });
        if (this.players.size === 0 && this.tickInterval) {
          clearInterval(this.tickInterval);
          this.tickInterval = null;
        }
        return;
      }
    }
  }

  handleMessage(ws, msg) {
    let player = null;
    for (const [, p] of this.players) { if (p.ws === ws) { player = p; break; } }
    if (!player) return;

    if (msg.type === 'input') {
      player.input.forward = !!msg.forward;
      player.input.backward = !!msg.backward;
      player.input.left = !!msg.left;
      player.input.right = !!msg.right;
      player.input.shooting = !!msg.shooting;
      if (typeof msg.aimX === 'number') player.rotationY = msg.aimX;
      if (typeof msg.aimY === 'number') player.aimY = Math.max(-1.2, Math.min(1.2, msg.aimY));
    }
  }

  tick() {
    const dt = 1 / TICK_RATE;
    const players = Array.from(this.players.values());

    for (const p of players) {
      if (!p.isAlive) {
        p.respawnTimer -= dt;
        if (p.respawnTimer <= 0) {
          p.spawn();
          this.broadcast({ type: 'respawn', id: p.id, x: p.x, z: p.z, rotationY: p.rotationY, health: p.health });
        }
        continue;
      }

      this.processMovement(p, dt, players);
      this.processShooting(p, players);
    }

    const state = {
      type: 'state',
      players: players.map(p => ({
        id: p.id, x: p.x, z: p.z, rotationY: p.rotationY, aimY: p.aimY, health: p.health, isAlive: p.isAlive
      }))
    };
    this.broadcastAll(state);
  }

  processMovement(p, dt, all) {
    const fb = (p.input.forward ? 1 : 0) - (p.input.backward ? 1 : 0);
    const rl = (p.input.right ? 1 : 0) - (p.input.left ? 1 : 0);
    if (fb === 0 && rl === 0) return;

    const rot = p.rotationY;
    const dx = Math.sin(rot) * fb + Math.cos(rot) * rl;
    const dz = Math.cos(rot) * fb - Math.sin(rot) * rl;
    const len = Math.sqrt(dx * dx + dz * dz);
    const mv = PLAYER_SPEED * dt;
    const nx = dx / len * mv;
    const nz = dz / len * mv;

    let newX = p.x + nx;
    let newZ = p.z + nz;

    const half = MAP_SIZE / 2 - PLAYER_RADIUS;
    newX = Math.max(-half, Math.min(half, newX));
    newZ = Math.max(-half, Math.min(half, newZ));

    for (const obs of OBSTACLES) {
      const halfW = obs.w / 2 + PLAYER_RADIUS;
      const halfH = obs.h / 2 + PLAYER_RADIUS;
      const dx2 = newX - obs.x;
      const dz2 = newZ - obs.z;
      const overlapX = halfW - Math.abs(dx2);
      const overlapZ = halfH - Math.abs(dz2);

      if (overlapX > 0 && overlapZ > 0) {
        if (overlapX < overlapZ) {
          newX = obs.x + Math.sign(dx2) * halfW;
        } else {
          newZ = obs.z + Math.sign(dz2) * halfH;
        }
      }
    }

    // Player collision
    for (const other of all) {
      if (other === p || !other.isAlive) continue;
      const pdx = newX - other.x;
      const pdz = newZ - other.z;
      const dist = Math.sqrt(pdx * pdx + pdz * pdz);
      const minDist = PLAYER_RADIUS * 2;
      if (dist < minDist && dist > 0.01) {
        const push = (minDist - dist) / 2;
        const nx2 = pdx / dist;
        const nz2 = pdz / dist;
        newX += nx2 * push;
        newZ += nz2 * push;
      }
    }

    p.x = newX;
    p.z = newZ;
  }

  processShooting(p, all) {
    if (!p.input.shooting) return;
    const now = Date.now();
    if (now - p.lastShotTime < WEAPON_COOLDOWN) return;
    p.lastShotTime = now;

    const dirX = Math.sin(p.rotationY);
    const dirZ = Math.cos(p.rotationY);

    let hitTarget = null;
    let hitDist = WEAPON_RANGE;

    for (const target of all) {
      if (target.id === p.id || !target.isAlive) continue;
      const tdx = target.x - p.x;
      const tdz = target.z - p.z;
      const tdist = Math.sqrt(tdx * tdx + tdz * tdz);
      if (tdist > WEAPON_RANGE || tdist < 0.5) continue;

      const angleToTarget = Math.atan2(tdx, tdz);
      let diff = angleToTarget - p.rotationY;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;

      if (Math.abs(diff) < Math.PI / 6) {
        // Simple obstacle check - if obstacle center is closer than target in roughly the same direction
        let blocked = false;
        for (const obs of OBSTACLES) {
          if (this.rayObstacleHit(p.x, p.z, dirX, dirZ, obs, tdist)) {
            blocked = true;
            break;
          }
        }
        if (!blocked && tdist < hitDist) {
          hitTarget = target;
          hitDist = tdist;
        }
      }
    }

    const endX = hitTarget ? hitTarget.x : p.x + dirX * WEAPON_RANGE;
    const endZ = hitTarget ? hitTarget.z : p.z + dirZ * WEAPON_RANGE;

    this.broadcastAll({
      type: 'shot', shooterId: p.id,
      fromX: p.x, fromY: 1.5, fromZ: p.z,
      toX: endX, toY: 1.5, toZ: endZ,
      hit: !!hitTarget
    });

    if (hitTarget) {
      hitTarget.health -= WEAPON_DAMAGE;
      this.send(hitTarget.ws, { type: 'damaged', byId: p.id, health: Math.max(0, hitTarget.health) });

      if (hitTarget.health <= 0) {
        hitTarget.isAlive = false;
        hitTarget.respawnTimer = RESPAWN_TIME;
        hitTarget.health = 0;
        p.kills++;
        hitTarget.deaths++;

        this.broadcastAll({
          type: 'killed', killerId: p.id, targetId: hitTarget.id,
          killerName: p.name, targetName: hitTarget.name
        });

        this.broadcastAll({ type: 'score', entries: this.getScoreboard() });
      }
    }
  }

  rayObstacleHit(ox, oz, dx, dz, obs, maxDist) {
    const x1 = obs.x - obs.w / 2, x2 = obs.x + obs.w / 2;
    const z1 = obs.z - obs.h / 2, z2 = obs.z + obs.h / 2;

    let tMin = -Infinity, tMax = Infinity;
    if (Math.abs(dx) > 0.001) {
      const t1 = (x1 - ox) / dx, t2 = (x2 - ox) / dx;
      tMin = Math.max(tMin, Math.min(t1, t2));
      tMax = Math.min(tMax, Math.max(t1, t2));
    } else if (ox <= x1 || ox >= x2) return false;

    if (Math.abs(dz) > 0.001) {
      const t1 = (z1 - oz) / dz, t2 = (z2 - oz) / dz;
      tMin = Math.max(tMin, Math.min(t1, t2));
      tMax = Math.min(tMax, Math.max(t1, t2));
    } else if (oz <= z1 || oz >= z2) return false;

    if (tMax < 0 || tMin > tMax) return false;
    const t = tMin >= 0 ? tMin : tMax;
    return t < maxDist;
  }

  getScoreboard() {
    return Array.from(this.players.values())
      .map(p => ({ id: p.id, name: p.name, kills: p.kills, deaths: p.deaths, color: p.color }))
      .sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  }

  send(ws, msg) { if (ws.readyState === 1) ws.send(JSON.stringify(msg)); }
  broadcast(msg, excludeId) { for (const [id, p] of this.players) if (id !== excludeId) this.send(p.ws, msg); }
  broadcastAll(msg) { for (const [, p] of this.players) this.send(p.ws, msg); }
}

module.exports = { GameRoom };
