import * as THREE from 'three';

/* ============================================================
   STATE
   ============================================================ */
const state = {
  id: null, color: 0x3498db, connected: false,
  players: {},          // id -> { mesh, nameTag, healthBar, group }
  local: null,          // local player data (from server)
  cameraRotY: 0,        // horizontal aim
  cameraAimY: 0,        // vertical aim
  keys: { w: false, a: false, s: false, d: false },
  shooting: false,
  pointerLocked: false,
  killFeed: [],
  scoreboardVisible: false,
  myKills: 0, myDeaths: 0,
  respawning: false,
};

/* ============================================================
   THREE.JS SETUP
   ============================================================ */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
scene.fog = new THREE.Fog(0x1a1a2e, 60, 120);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.prepend(renderer.domElement);

/* Lights */
const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
dirLight.position.set(30, 50, 20);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.left = -60;
dirLight.shadow.camera.right = 60;
dirLight.shadow.camera.top = 60;
dirLight.shadow.camera.bottom = -60;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 120;
scene.add(dirLight);

const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3a3a5a, 0.6);
scene.add(hemiLight);

/* Ground */
const groundGeo = new THREE.PlaneGeometry(200, 200);
const groundMat = new THREE.MeshStandardMaterial({
  color: 0x2d5a27, roughness: 0.9, metalness: 0.0,
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

/* Grid helper for visual reference */
const gridHelper = new THREE.GridHelper(80, 20, 0x444444, 0x333333);
gridHelper.position.y = 0.05;
scene.add(gridHelper);

/* Obstacles container */
const obstacles = { meshes: [] };
let mapSize = 80;

/* ============================================================
   PLAYER MESH BUILDER
   ============================================================ */
function createPlayerMesh(color) {
  const group = new THREE.Group();

  // Body
  const bodyGeo = new THREE.CylinderGeometry(0.6, 0.6, 1.2, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.1 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.6;
  body.castShadow = true;
  group.add(body);

  // Head
  const headGeo = new THREE.SphereGeometry(0.35, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = 1.35;
  head.castShadow = true;
  group.add(head);

  // Gun
  const gunGeo = new THREE.BoxGeometry(1.0, 0.12, 0.12);
  const gunMat = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.5, metalness: 0.6 });
  const gun = new THREE.Mesh(gunGeo, gunMat);
  gun.position.set(0.7, 0.7, 0);
  group.add(gun);

  // Arms (simple)
  const armGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.6, 6);
  const armMat = new THREE.MeshStandardMaterial({ color: 0xffccaa, roughness: 0.6 });
  const armL = new THREE.Mesh(armGeo, armMat);
  armL.position.set(-0.5, 0.7, 0);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, armMat);
  armR.position.set(0.5, 0.7, 0);
  group.add(armR);

  // Outline glow (subtle)
  const outlineMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.3, side: THREE.BackSide });
  const outline = new THREE.Mesh(bodyGeo.clone(), outlineMat);
  outline.scale.set(1.15, 1.15, 1.15);
  outline.position.y = 0.6;
  group.add(outline);

  return group;
}

function createHealthBar() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.2, 0.15, 1);
  sprite.position.y = 2.2;

  return { sprite, canvas, ctx, texture };
}

function createNameTag(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  ctx.font = 'bold 28px Arial';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(name, 128, 34);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;

  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(1.6, 0.3, 1);
  sprite.position.y = 2.5;

  return { sprite, canvas, ctx, texture };
}

function updateHealthBar(hb, health, maxHealth) {
  const { canvas, ctx, texture } = hb;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const w = canvas.width - 4;
  const h = canvas.height - 4;
  const ratio = Math.max(0, health / maxHealth);

  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.roundRect(2, 2, w, h, 3);
  ctx.fill();

  const color = ratio > 0.5 ? '#2ecc71' : ratio > 0.25 ? '#f39c12' : '#e74c3c';
  ctx.fillStyle = color;
  ctx.roundRect(2, 2, w * ratio, h, 3);
  ctx.fill();

  texture.needsUpdate = true;
}

/* roundRect polyfill for canvas */
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}

/* ============================================================
   WORLD BUILDING
   ============================================================ */
function buildWorld(obs) {
  for (const m of obstacles.meshes) { scene.remove(m); }
  obstacles.meshes = [];

  for (const o of obs) {
    const geo = new THREE.BoxGeometry(o.w, 2.5, o.h);
    const mat = new THREE.MeshStandardMaterial({
      color: o.color, roughness: 0.8, metalness: 0.2,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(o.x, 1.25, o.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    obstacles.meshes.push(mesh);
  }
}

/* ============================================================
   BULLET TRAILS
   ============================================================ */
const bulletTrails = [];

function spawnBulletTrail(from, to) {
  const fromV = new THREE.Vector3(from.x, from.y || 1.5, from.z);
  const toV = new THREE.Vector3(to.x, to.y || 1.5, to.z);

  const mid = new THREE.Vector3().addVectors(fromV, toV).multiplyScalar(0.5);
  const dir = new THREE.Vector3().subVectors(toV, fromV);
  const len = dir.length();
  dir.normalize();

  const trailGeo = new THREE.BoxGeometry(0.06, 0.06, len);
  const trailMat = new THREE.MeshBasicMaterial({
    color: 0xffff88, transparent: true, opacity: 0.9,
  });
  const trail = new THREE.Mesh(trailGeo, trailMat);
  trail.position.copy(mid);
  trail.lookAt(toV);
  scene.add(trail);

  // Hit spark
  const sparkGeo = new THREE.SphereGeometry(0.15, 4, 4);
  const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffaa44, transparent: true, opacity: 1 });
  const spark = new THREE.Mesh(sparkGeo, sparkMat);
  spark.position.copy(toV);
  scene.add(spark);

  bulletTrails.push({ trail, spark, life: 0.15 });
}

/* ============================================================
   HUD HELPERS
   ============================================================ */
function updateHUD() {
  const health = state.local ? state.local.health : 100;
  const fill = document.getElementById('health-fill');
  fill.style.width = Math.max(0, health) + '%';
  document.getElementById('health-text').textContent = Math.max(0, Math.round(health)) + ' HP';

  document.getElementById('stat-kills').textContent = 'Kills: ' + state.myKills;
  document.getElementById('stat-deaths').textContent = 'Deaths: ' + state.myDeaths;

  const deathScreen = document.getElementById('death-screen');
  if (state.local && !state.local.isAlive) {
    deathScreen.style.display = 'flex';
    document.getElementById('respawn-timer').textContent = Math.ceil(state.local.respawnTimer || 0);
  } else {
    deathScreen.style.display = 'none';
  }
}

function renderScoreboard(entries) {
  const tbody = document.getElementById('score-body');
  tbody.innerHTML = '';
  for (const e of entries) {
    const tr = document.createElement('tr');
    const colorHex = '#' + e.color.toString(16).padStart(6, '0');
    tr.innerHTML = `
      <td><div class="name-cell"><span class="color-dot" style="background:${colorHex}"></span>${e.name}</div></td>
      <td>${e.kills}</td>
      <td>${e.deaths}</td>
    `;
    if (e.id === state.id) tr.style.fontWeight = 'bold';
    tbody.appendChild(tr);
  }
}

function addKillMsg(killerName, targetName) {
  const feed = document.getElementById('kill-feed');
  const div = document.createElement('div');
  div.className = 'kill-msg';
  div.innerHTML = `<b>${killerName}</b> killed <b>${targetName}</b>`;
  feed.appendChild(div);
  if (feed.children.length > 6) feed.removeChild(feed.firstChild);
  setTimeout(() => { if (div.parentNode) div.remove(); }, 3000);
}

/* ============================================================
   NETWORK
   ============================================================ */
let ws = null;

function connect(name) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  ws = new WebSocket(`${protocol}//${window.location.host}`);

  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', name }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    handleMessage(msg);
  };

  ws.onclose = () => {
    state.connected = false;
    setTimeout(() => connect(name), 2000);
  };
}

function sendInput() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({
    type: 'input',
    forward: state.keys.w,
    backward: state.keys.s,
    left: state.keys.a,
    right: state.keys.d,
    aimX: state.cameraRotY,
    aimY: state.cameraAimY,
    shooting: state.shooting,
  }));
}

/* ============================================================
   MESSAGE HANDLER
   ============================================================ */
function handleMessage(msg) {
  switch (msg.type) {
    case 'init': {
      state.id = msg.id;
      state.color = msg.color;
      mapSize = msg.mapSize || 80;
      buildWorld(msg.obstacles);
      state.connected = true;
      document.getElementById('lobby').style.display = 'none';
      document.getElementById('hud').style.display = 'block';
      break;
    }
    case 'players_list': {
      for (const p of msg.players) {
        addPlayer(p);
      }
      break;
    }
    case 'player_joined': {
      addPlayer(msg);
      break;
    }
    case 'player_left': {
      removePlayer(msg.id);
      break;
    }
    case 'state': {
      for (const p of msg.players) {
        if (p.id === state.id) {
          if (!state.local) state.local = {};
          state.local.x = p.x;
          state.local.z = p.z;
          state.local.rotationY = p.rotationY;
          state.local.aimY = p.aimY;
          state.local.health = p.health;
          state.local.isAlive = p.isAlive;
        } else {
          updatePlayer(p);
        }
      }
      updateHUD();
      break;
    }
    case 'shot': {
      spawnBulletTrail(
        { x: msg.fromX, y: msg.fromY || 1.5, z: msg.fromZ },
        { x: msg.toX, y: msg.toY || 1.5, z: msg.toZ }
      );
      break;
    }
    case 'damaged': {
      if (state.local) state.local.health = msg.health;
      break;
    }
    case 'killed': {
      addKillMsg(msg.killerName, msg.targetName);
      if (msg.targetId === state.id) {
        state.myDeaths++;
      }
      if (msg.killerId === state.id) {
        state.myKills++;
      }
      break;
    }
    case 'respawn': {
      if (msg.id === state.id && state.local) {
        state.local.health = 100;
        state.local.isAlive = true;
        state.local.respawnTimer = 0;
      }
      break;
    }
    case 'score': {
      renderScoreboard(msg.entries);
      break;
    }
  }
}

/* ============================================================
   PLAYER MANAGEMENT
   ============================================================ */
function addPlayer(data) {
  if (state.players[data.id]) return;
  const color = data.color || 0x3498db;
  const mesh = createPlayerMesh(color);
  const nameTag = createNameTag(data.name);
  const healthBar = createHealthBar();

  const group = new THREE.Group();
  group.add(mesh);
  group.add(nameTag.sprite);
  group.add(healthBar.sprite);

  group.position.set(data.x || 0, 0, data.z || 0);
  group.rotation.y = data.rotationY || 0;
  scene.add(group);

  state.players[data.id] = { mesh, nameTag, healthBar, group, data };
  updateHealthBar(healthBar, data.health || 100, 100);
}

function removePlayer(id) {
  const p = state.players[id];
  if (!p) return;
  scene.remove(p.group);
  delete state.players[id];
}

function updatePlayer(data) {
  const p = state.players[data.id];
  if (!p) {
    // Player data came before joined event, create placeholder
    return;
  }
  p.group.position.x = data.x;
  p.group.position.z = data.z;
  p.group.rotation.y = data.rotationY;
  p.data = data;

  p.group.visible = data.isAlive !== false;
  updateHealthBar(p.healthBar, data.health || 100, 100);
}

/* ============================================================
   CAMERA
   ============================================================ */
const _camTarget = new THREE.Vector3();

function updateCamera() {
  const targetX = state.local ? state.local.x : 0;
  const targetZ = state.local ? state.local.z : 0;
  const rotY = state.cameraRotY;
  const aimY = state.cameraAimY;

  const dist = 8;
  const heightOffset = 3;

  const hDist = dist * Math.cos(aimY);
  const vDist = dist * Math.sin(aimY) + heightOffset;

  _camTarget.set(
    targetX + Math.sin(rotY) * hDist,
    Math.max(0.5, vDist),
    targetZ + Math.cos(rotY) * hDist
  );

  camera.position.lerp(_camTarget, 0.3);
  camera.lookAt(targetX, 1.2, targetZ);
}

/* ============================================================
   INPUT
   ============================================================ */
document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    state.keys[key] = true;
    sendInput();
  }
  if (key === 'tab') {
    e.preventDefault();
    state.scoreboardVisible = !state.scoreboardVisible;
    document.getElementById('scoreboard').style.display = state.scoreboardVisible ? 'block' : 'none';
  }
});

document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'w' || key === 'a' || key === 's' || key === 'd') {
    state.keys[key] = false;
    sendInput();
  }
});

renderer.domElement.addEventListener('click', () => {
  if (state.connected) {
    renderer.domElement.requestPointerLock();
  }
});

document.addEventListener('pointerlockchange', () => {
  state.pointerLocked = !!document.pointerLockElement;
});

document.addEventListener('mousemove', (e) => {
  if (!state.pointerLocked) return;
  const sensitivity = 0.003;
  state.cameraRotY -= e.movementX * sensitivity;
  state.cameraAimY -= e.movementY * sensitivity;
  state.cameraAimY = Math.max(-1.0, Math.min(1.0, state.cameraAimY));
  sendInput();
});

document.addEventListener('mousedown', (e) => {
  if (e.button === 0 && state.pointerLocked) {
    state.shooting = true;
    sendInput();
  }
});

document.addEventListener('mouseup', (e) => {
  if (e.button === 0) {
    state.shooting = false;
    sendInput();
  }
});

/* Prevent right-click context menu */
document.addEventListener('contextmenu', (e) => e.preventDefault());

/* Resize */
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

/* ============================================================
   GAME LOOP
   ============================================================ */
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();

  // Update camera
  updateCamera();

  // Update bullet trails
  for (let i = bulletTrails.length - 1; i >= 0; i--) {
    const bt = bulletTrails[i];
    bt.life -= dt;
    if (bt.life <= 0) {
      scene.remove(bt.trail);
      scene.remove(bt.spark);
      bulletTrails.splice(i, 1);
    } else {
      const alpha = bt.life / 0.15;
      bt.trail.material.opacity = alpha;
      bt.spark.material.opacity = alpha;
      bt.spark.scale.setScalar(1 + (1 - alpha) * 3);
    }
  }

  // Regular input sends
  const now = Date.now();
  if (!state._lastInputSend || now - state._lastInputSend > 50) {
    sendInput();
    state._lastInputSend = now;
  }

  renderer.render(scene, camera);
}

/* ============================================================
   START
   ============================================================ */
document.getElementById('join-btn').addEventListener('click', () => {
  const name = document.getElementById('name-input').value.trim() || 'Player';
  document.getElementById('join-btn').disabled = true;
  document.getElementById('join-btn').textContent = 'CONNECTING...';
  connect(name);
});

document.getElementById('name-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('join-btn').click();
});

// Pre-fill name
const names = ['Sniper', 'Shotgun', 'Viper', 'Phoenix', 'Ghost', 'Storm', 'Blade', 'Fury'];
document.getElementById('name-input').value = names[Math.floor(Math.random() * names.length)];

animate();
