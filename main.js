import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot'); // null | 'arena' | 'hit' | 'special' (title is default)
const $ = (id) => document.getElementById(id);
const errBox = $('err');
function fatal(msg) {
  errBox.textContent = msg;
  errBox.classList.add('on');
  window.__shotError = msg;
  console.error(msg);
}

// ---------------- Renderer / scene ----------------
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true });
} catch (e) {
  fatal('WebGL is not available in this browser, so the 3D arena cannot render.');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbfd9e8);
scene.fog = new THREE.Fog(0xbfd9e8, 26, 60);

const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);

scene.add(new THREE.HemisphereLight(0xfff4e0, 0x5a6a72, 0.9));
const sun = new THREE.DirectionalLight(0xfff1d6, 1.6);
sun.position.set(8, 14, 6);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -16; sun.shadow.camera.right = 16;
sun.shadow.camera.top = 16; sun.shadow.camera.bottom = -16;
scene.add(sun);

// ---------------- Arena (environment geometry is fine; fighters are real models) ----------------
function stoneTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#8d867b'; g.fillRect(0, 0, 512, 512);
  const tile = 128;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const shade = 132 + Math.floor(Math.random() * 26);
    g.fillStyle = `rgb(${shade},${shade - 6},${shade - 16})`;
    g.fillRect(x * tile + 3, y * tile + 3, tile - 6, tile - 6);
    g.fillStyle = 'rgba(0,0,0,0.08)';
    for (let i = 0; i < 40; i++) g.fillRect(x * tile + Math.random() * tile, y * tile + Math.random() * tile, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(4, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 24),
  new THREE.MeshStandardMaterial({ map: stoneTexture(), roughness: 0.95 })
);
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
scene.add(floor);

const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e4a2f, roughness: 0.85 });
const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x4a3220, roughness: 0.9 });
function wall(x, z, w, d) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, 3.4, d), woodMat);
  m.position.set(x, 1.7, z); m.castShadow = true; m.receiveShadow = true; scene.add(m);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(w === 24 ? 24.6 : 0.7, 0.35, d === 24 ? 24.6 : 0.7), darkWoodMat);
  beam.position.set(x, 3.5, z); beam.castShadow = true; scene.add(beam);
}
wall(0, -12, 24, 0.6); wall(0, 12, 24, 0.6); wall(-12, 0, 0.6, 24); wall(12, 0, 0.6, 24);
for (const [x, z] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.9, 4.2, 0.9), darkWoodMat);
  post.position.set(x, 2.1, z); post.castShadow = true; scene.add(post);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff9d2e, emissiveIntensity: 2 }));
  lamp.position.set(x, 4.5, z); scene.add(lamp);
  const pl = new THREE.PointLight(0xffb347, 12, 9); pl.position.set(x, 4.5, z); scene.add(pl);
}
const bambooMat = new THREE.MeshStandardMaterial({ color: 0x3f7a3a, roughness: 0.8 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x4d8f45, roughness: 0.9 });
for (const [cx, cz] of [[-10.5, -10.5], [10.5, -10.5], [-10.5, 10.5], [10.5, 10.5]]) {
  for (let i = 0; i < 5; i++) {
    const h = 3 + Math.random() * 1.6;
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, h, 6), bambooMat);
    stalk.position.set(cx + (Math.random() - 0.5) * 1.2, h / 2, cz + (Math.random() - 0.5) * 1.2);
    stalk.rotation.z = (Math.random() - 0.5) * 0.12; stalk.castShadow = true; scene.add(stalk);
  }
  const crown = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), leafMat);
  crown.position.set(cx, 4.6, cz); scene.add(crown);
}
// Drifting dust motes
const dustGeo = new THREE.BufferGeometry();
{
  const n = 220, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 24; pos[i * 3 + 1] = Math.random() * 6; pos[i * 3 + 2] = (Math.random() - 0.5) * 24; }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
}
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xfff2cc, size: 0.06, transparent: true, opacity: 0.7 }));
scene.add(dust);

// Fighter ground rings (teal = you, red = bot)
function ring(color) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.1, 32),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.02; scene.add(m); return m;
}

// ---------------- Fighters ----------------
const loader = new GLTFLoader();
function clipByName(gltf, name) {
  const c = gltf.animations.find((a) => a.name.toLowerCase() === name.toLowerCase());
  return c || null;
}
class Fighter {
  constructor(gltf, x, z, ringMesh, isPlayer) {
    this.isPlayer = isPlayer;
    this.group = gltf.scene;
    const box = new THREE.Box3().setFromObject(this.group);
    const size = new THREE.Vector3(); box.getSize(size);
    const s = 1.8 / Math.max(size.y, 0.001);
    this.group.scale.setScalar(s);
    const box2 = new THREE.Box3().setFromObject(this.group);
    this.group.position.set(x, -box2.min.y, z);
    this.group.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
    scene.add(this.group);
    this.ring = ringMesh; this.ring.position.x = x; this.ring.position.z = z;
    this.mixer = new THREE.AnimationMixer(this.group);
    this.clips = {};
    for (const n of ['Idle', 'Walk', 'Run', 'Attack', 'Hit', 'Special', 'Death']) this.clips[n] = clipByName(gltf, n);
    this.hp = 100; this.meter = 0;
    this.state = 'idle'; // idle | walk | attack | hit | special | dead | dash
    this.cur = null; this.oneShotUntil = 0; this.pendingHit = null;
    this.attackCd = 0; this.dashCd = 0; this.dashT = 0; this.dashDir = new THREE.Vector3();
    this.vel = new THREE.Vector3(); this.flashUntil = 0; this.spinT = -1; this.baseYaw = 0;
    this.specialHitDone = false;
    this.play('Idle', true);
  }
  play(name, loop) {
    const clip = this.clips[name];
    if (!clip) return;
    if (this.cur && this.cur.clip === clip && loop) return;
    const action = this.mixer.clipAction(clip);
    action.reset();
    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    if (this.cur) this.cur.fadeOut(0.1);
    action.fadeIn(0.1).play();
    this.cur = action;
  }
  face(target) {
    const dx = target.group.position.x - this.group.position.x;
    const dz = target.group.position.z - this.group.position.z;
    if (Math.abs(dx) + Math.abs(dz) < 0.001) return;
    this.group.rotation.y = Math.atan2(dx, dz);
  }
  flash() {
    this.flashUntil = gameNow + 0.14;
    this.group.traverse((o) => { if (o.isMesh && o.material && 'emissive' in o.material) o.material.emissive.setHex(0x881111); });
  }
  unflash(now) {
    if (this.flashUntil && now > this.flashUntil) {
      this.group.traverse((o) => { if (o.isMesh && o.material && 'emissive' in o.material) o.material.emissive.setHex(0x000000); });
      this.flashUntil = 0;
    }
  }
}

let player, bot, started = false, frozen = false, over = false;
let shakeT = 0, shakeMag = 0, camDist = 14, gameNow = 0;

function setHp() {
  $('playerHp').firstElementChild.style.width = Math.max(player.hp, 0) + '%';
  $('botHp').firstElementChild.style.width = Math.max(bot.hp, 0) + '%';
  $('meter').firstElementChild.style.width = Math.min(player.meter, 100) + '%';
  $('meter').classList.toggle('glow', player.meter >= 100);
  $('btnSpecial').classList.toggle('ready', player.meter >= 100);
  window.__ironState = { playerHp: player.hp, botHp: bot.hp, meter: player.meter };
}

// Damage numbers (DOM, projected)
const dmgLayer = $('dmgLayer');
function damageNumber(worldPos, text, crit) {
  const el = document.createElement('div');
  el.className = 'dmg' + (crit ? ' crit' : '');
  el.textContent = text;
  dmgLayer.appendChild(el);
  const born = gameNow;
  const v = new THREE.Vector3();
  (function tick() {
    if (frozen) { requestAnimationFrame(tick); return; } // frozen poses keep their numbers visible
    const age = gameNow - born;
    if (age > 0.9) { el.remove(); return; }
    v.copy(worldPos); v.y += 2.2 + age * 1.2; v.project(camera);
    el.style.left = ((v.x * 0.5 + 0.5) * innerWidth) + 'px';
    el.style.top = ((-v.y * 0.5 + 0.5) * innerHeight) + 'px';
    el.style.opacity = String(1 - age / 0.9);
    requestAnimationFrame(tick);
  })();
}

// Spark bursts
const sparks = [];
function burst(pos, color, n, speed) {
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { arr[i * 3] = pos.x; arr[i * 3 + 1] = pos.y + 1.2; arr[i * 3 + 2] = pos.z; }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.14, transparent: true, opacity: 1 }));
  scene.add(pts);
  const vel = [];
  for (let i = 0; i < n; i++) vel.push(new THREE.Vector3((Math.random() - 0.5) * speed, Math.random() * speed * 0.8, (Math.random() - 0.5) * speed));
  sparks.push({ pts, vel, born: performance.now() });
}
function updateSparks(now) {
  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i], age = (now - s.born) / 1000;
    if (age > 0.45) { scene.remove(s.pts); s.pts.geometry.dispose(); sparks.splice(i, 1); continue; }
    const p = s.pts.geometry.attributes.position;
    for (let j = 0; j < s.vel.length; j++) {
      p.array[j * 3] += s.vel[j].x * 0.016; p.array[j * 3 + 1] += s.vel[j].y * 0.016 - 0.02; p.array[j * 3 + 2] += s.vel[j].z * 0.016;
    }
    p.needsUpdate = true; s.pts.material.opacity = 1 - age / 0.45;
  }
}

// Special ring effect
const ringGeo = new THREE.RingGeometry(0.9, 1.15, 40);
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd76a, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
const specialRing = new THREE.Mesh(ringGeo, ringMat);
specialRing.rotation.x = -Math.PI / 2; specialRing.visible = false; scene.add(specialRing);
let ringT = -1;

// ---------------- Combat ----------------
function dist(a, b) { return Math.hypot(a.group.position.x - b.group.position.x, a.group.position.z - b.group.position.z); }
function inArc(a, b) {
  const dx = b.group.position.x - a.group.position.x, dz = b.group.position.z - a.group.position.z;
  const want = Math.atan2(dx, dz);
  let d = want - a.group.rotation.y;
  while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d) < 1.1;
}
function tryAttack(f, target) {
  if (f.state === 'dead' || f.state === 'attack' || f.state === 'special' || over) return false;
  if (f.attackCd > 0) return false;
  f.state = 'attack'; f.play('Attack', false);
  f.oneShotUntil = gameNow + (f.clips.Attack ? f.clips.Attack.duration : 1.0);
  f.attackCd = 0.95;
  f.pendingHit = { at: gameNow + 0.35, target };
  return true;
}
function applyHit(target, dmg, opts = {}) {
  if (target.state === 'dead' || over) return;
  target.hp -= dmg;
  target.state = 'hit'; target.play('Hit', false);
  target.oneShotUntil = gameNow + (target.clips.Hit ? target.clips.Hit.duration : 0.6);
  target.flash();
  const dir = new THREE.Vector3().subVectors(target.group.position, opts.from.group.position).setY(0).normalize();
  target.vel.addScaledVector(dir, opts.knock || 2.2);
  burst(target.group.position, opts.crit ? 0xffd76a : 0xffcc99, opts.crit ? 26 : 14, opts.crit ? 7 : 5);
  damageNumber(target.group.position, '-' + dmg, !!opts.crit);
  shakeT = opts.crit ? 0.45 : 0.22; shakeMag = opts.crit ? 0.35 : 0.14;
  if (target.isPlayer) {
    target.meter = Math.min(100, target.meter + dmg * 2.5); // meter builds ONLY from damage taken
  }
  if (target.hp <= 0) {
    target.hp = 0; target.state = 'dead'; target.play('Death', false);
    endMatch(target.isPlayer ? 'BOT WINS' : 'YOU WIN');
  }
  setHp();
}
function tryDash(f, dir) {
  if (f.state === 'dead' || f.state === 'special' || over) return false;
  if (f.dashCd > 0 || f.dashT > 0) return false;
  f.dashT = 0.22; f.dashCd = 1.3; f.dashDir.copy(dir);
  if (dir.lengthSq() < 0.01) f.dashDir.set(Math.sin(f.group.rotation.y), 0, Math.cos(f.group.rotation.y));
  f.dashDir.normalize();
  f.play('Run', true);
  return true;
}
function trySpecial(f, target) {
  if (!f.isPlayer || f.state === 'dead' || f.state === 'special' || over) return false;
  if (f.meter < 100) return false;
  f.meter = 0; setHp(); // spending the meter: it must refill from damage taken
  f.state = 'special'; f.play('Special', false);
  f.baseYaw = f.group.rotation.y; f.spinT = 0; f.specialHitDone = false;
  f.oneShotUntil = gameNow + (f.clips.Special ? f.clips.Special.duration : 1.2);
  ringT = 0; specialRing.visible = true;
  return true;
}
function endMatch(text) {
  over = true;
  setTimeout(() => {
    $('bannerTitle').textContent = 'K.O.';
    $('bannerSub').textContent = text + ' — tap REMATCH to fight again.';
    $('banner').classList.add('on');
  }, 900);
}
function resetMatch() {
  for (const [f, x, z] of [[player, -3.5, 0], [bot, 3.5, 0]]) {
    f.group.position.set(x, f.group.position.y, z);
    f.hp = 100; f.meter = 0; f.state = 'idle'; f.vel.set(0, 0, 0);
    f.attackCd = 0; f.dashCd = 0; f.dashT = 0; f.spinT = -1; f.pendingHit = null;
    f.play('Idle', true);
  }
  over = false; frozen = false;
  $('banner').classList.remove('on');
  specialRing.visible = false; ringT = -1;
  setHp();
}

// ---------------- Input: keys + touch ----------------
const keys = {};
addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys[e.code] = true;
  if (!started && (e.code === 'Enter' || e.code === 'Space')) startFight();
  if (started && !over) {
    if (e.code === 'KeyJ') tryAttack(player, bot);
    if (e.code === 'Space') tryDash(player, moveVec());
    if (e.code === 'KeyK') trySpecial(player, bot);
  }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });

const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const zone = $('stickZone'), base = $('stickBase'), knob = $('stickKnob');
function stickSet(e) {
  const dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
  const len = Math.hypot(dx, dy), max = 48;
  const cl = len > max ? max / len : 1;
  joy.x = (dx * cl) / max; joy.y = -(dy * cl) / max;
  knob.style.left = (joy.ox + dx * cl) + 'px'; knob.style.top = (joy.oy + dy * cl) + 'px';
}
zone.addEventListener('pointerdown', (e) => {
  if (joy.id !== null) return;
  joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = 0; joy.y = 0;
  base.style.display = knob.style.display = 'block';
  base.style.left = joy.ox + 'px'; base.style.top = joy.oy + 'px';
  knob.style.left = joy.ox + 'px'; knob.style.top = joy.oy + 'px';
  zone.setPointerCapture(e.pointerId);
});
zone.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) stickSet(e); });
function stickEnd(e) {
  if (e.pointerId !== joy.id) return;
  joy.id = null; joy.x = 0; joy.y = 0;
  base.style.display = knob.style.display = 'none';
}
zone.addEventListener('pointerup', stickEnd);
zone.addEventListener('pointercancel', stickEnd);
function moveVec() {
  const v = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) v.z -= 1;
  if (keys.KeyS || keys.ArrowDown) v.z += 1;
  if (keys.KeyA || keys.ArrowLeft) v.x -= 1;
  if (keys.KeyD || keys.ArrowRight) v.x += 1;
  if (Math.abs(joy.x) > 0.12 || Math.abs(joy.y) > 0.12) { v.x = joy.x; v.z = -joy.y; }
  return v;
}
$('btnAttack').addEventListener('pointerdown', (e) => { e.preventDefault(); if (started) tryAttack(player, bot); });
$('btnDash').addEventListener('pointerdown', (e) => { e.preventDefault(); if (started) tryDash(player, moveVec()); });
$('btnSpecial').addEventListener('pointerdown', (e) => { e.preventDefault(); if (started) trySpecial(player, bot); });
$('rematchBtn').addEventListener('click', resetMatch);
$('startBtn').addEventListener('click', startFight);

// Camera-relative move basis (camera sits at +Z side, so forward is -Z)
const CAM_FWD = new THREE.Vector3(0, 0, -1), CAM_RIGHT = new THREE.Vector3(1, 0, 0);
function camMove(v, out) {
  out.set(0, 0, 0).addScaledVector(CAM_FWD, -v.z).addScaledVector(CAM_RIGHT, v.x);
  if (out.lengthSq() > 0) out.normalize();
  return out;
}

// ---------------- Bot AI ----------------
let botThink = 0, botStrafe = 1;
function botUpdate(dt, now) {
  if (bot.state === 'dead' || over) return;
  botThink -= dt;
  const d = dist(bot, player);
  const mv = new THREE.Vector3();
  if (botThink <= 0) {
    botThink = 0.16;
    botStrafe = Math.random() < 0.5 ? 1 : -1;
    if (d <= 2.6 && bot.attackCd <= 0 && Math.random() < 0.75) tryAttack(bot, player);
    else if (d <= 2.2 && bot.dashCd <= 0 && Math.random() < 0.25) {
      const away = new THREE.Vector3().subVectors(bot.group.position, player.group.position).setY(0).normalize();
      tryDash(bot, away);
    }
  }
  if (bot.state === 'attack' || bot.state === 'hit' || bot.state === 'special') return;
  if (d > 2.6) {
    mv.subVectors(player.group.position, bot.group.position).setY(0).normalize();
    mv.x += botStrafe * 0.25; mv.normalize();
    moveFighter(bot, mv, 3.3, dt);
  }
}
const _mv = new THREE.Vector3();
function moveFighter(f, mv, speed, dt) {
  if (f.state === 'dead' || f.state === 'attack' || f.state === 'hit' || f.state === 'special') return;
  if (mv.lengthSq() < 0.01) { if (f.state !== 'idle') { f.state = 'idle'; f.play('Idle', true); } return; }
  if (f.state !== 'walk' && f.dashT <= 0) { f.state = 'walk'; f.play('Walk', true); }
  f.group.position.addScaledVector(mv, speed * dt);
  f.group.position.x = THREE.MathUtils.clamp(f.group.position.x, -10.5, 10.5);
  f.group.position.z = THREE.MathUtils.clamp(f.group.position.z, -10.5, 10.5);
}

// ---------------- Shot-mode driver (for screenshots) ----------------
let shotTimer = 0, shotFrozenAt = 0, shotHitDone = false;
function shotDriver(dt, now) {
  if (!started || frozen) return;
  if (SHOT === 'arena') {
    shotTimer += dt;
    if (shotTimer > 1.8) { frozen = true; window.__shotReady = true; } // lets the dynamic camera settle
    return;
  }
  const d = dist(player, bot);
  if (SHOT === 'hit') {
    if (!shotHitDone) {
      if (d > 2.0) { _mv.subVectors(bot.group.position, player.group.position).setY(0).normalize(); moveFighter(player, _mv, 4, dt); }
      else tryAttack(player, bot);
    } else {
      shotTimer += dt;
      if (shotTimer > 0.35) { frozen = true; window.__shotReady = true; }
    }
    return;
  }
  if (SHOT === 'ko') {
    if (!over) {
      if (d > 2.0) { _mv.subVectors(bot.group.position, player.group.position).setY(0).normalize(); moveFighter(player, _mv, 4, dt); }
      else tryAttack(player, bot);
    } else {
      // Let the Death clip play and the K.O. banner (900ms wall-clock)
      // appear before freezing the frame.
      shotTimer += dt;
      if (shotTimer > 1.2) { frozen = true; window.__shotReady = true; }
    }
    return;
  }
  if (SHOT === 'special') {
    if (player.state !== 'special') {
      if (d > 3.0) { _mv.subVectors(bot.group.position, player.group.position).setY(0).normalize(); moveFighter(player, _mv, 4, dt); }
      else trySpecial(player, bot);
    } else {
      shotTimer += dt;
      if (shotTimer > 0.5) { frozen = true; window.__shotReady = true; }
    }
  }
}

// ---------------- Start / load ----------------
function startFight() {
  if (started || !player) return;
  started = true;
  $('title').style.display = 'none';
  $('hud').classList.add('on');
  $('touch').classList.add('on');
  resetMatch();
}
async function load() {
  try {
    const [p, b] = await Promise.all([
      loader.loadAsync('models/KnightCaptain.glb'),
      loader.loadAsync('models/HeavyWarrior.glb'),
    ]);
    player = new Fighter(p, -3.5, 0, ring(0x2dd4a7), true);
    bot = new Fighter(b, 3.5, 0, ring(0xe5484d), false);
    $('loadNote').style.display = 'none';
    setHp();
    if (SHOT === 'special') player.meter = 100;
    if (SHOT === 'arena' || SHOT === 'hit' || SHOT === 'special' || SHOT === 'ko') {
      // Bot stands still in shot modes so the staged moment is deterministic.
      started = true;
      $('title').style.display = 'none';
      $('hud').classList.add('on');
      $('touch').classList.add('on');
      setHp();
    }
    window.__ironLoaded = true;
  } catch (e) {
    fatal('A fighter model failed to load, so the game cannot start: ' + e.message + '. No placeholder fighter was substituted.');
  }
}
load();

// ---------------- Main loop ----------------
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  // ONE clock for all gameplay timing: gameNow advances by dt, so slow
  // frames (headless software rendering, laggy phones) slow the whole
  // game down together instead of letting wall-clock deadlines fire
  // before game-time progress (spin, meter, shot timers) reaches them.
  if (!frozen) gameNow += dt;
  const now = gameNow;
  if (!frozen) {
    dust.rotation.y += dt * 0.01;
    if (started && player && bot) {
      // Cooldowns
      for (const f of [player, bot]) {
        f.attackCd = Math.max(0, f.attackCd - dt);
        f.dashCd = Math.max(0, f.dashCd - dt);
        f.unflash(now);
        if (f.mixer) f.mixer.update(dt);
      }
      // One-shot returns
      for (const f of [player, bot]) {
        if ((f.state === 'attack' || f.state === 'hit') && now >= f.oneShotUntil) { f.state = 'idle'; f.play('Idle', true); }
      }
      // Pending attack hits
      for (const f of [player, bot]) {
        if (f.pendingHit && now >= f.pendingHit.at) {
          const t = f.pendingHit.target; f.pendingHit = null;
          if (t.state !== 'dead' && dist(f, t) <= 2.6 && inArc(f, t)) {
            applyHit(t, 10, { from: f, knock: 2.2 });
            if (SHOT === 'hit' && f.isPlayer) { shotHitDone = true; shotTimer = 0; }
          }
        }
      }
      // Player input movement
      if (!over && player.state !== 'dead') {
        const v = moveVec();
        if (player.state !== 'attack' && player.state !== 'hit' && player.state !== 'special') {
          if (player.dashT > 0) {
            player.dashT -= dt;
            player.group.position.addScaledVector(player.dashDir, 14 * dt);
            player.group.position.x = THREE.MathUtils.clamp(player.group.position.x, -10.5, 10.5);
            player.group.position.z = THREE.MathUtils.clamp(player.group.position.z, -10.5, 10.5);
            if (player.dashT <= 0) { player.state = 'idle'; player.play('Idle', true); }
          } else if (v.lengthSq() > 0.01) {
            camMove(v, _mv);
            moveFighter(player, _mv, 4.2, dt);
          } else if (player.state === 'walk') { player.state = 'idle'; player.play('Idle', true); }
        }
        player.face(bot);
      }
      // Bot dash + AI
      if (bot.dashT > 0) {
        bot.dashT -= dt;
        bot.group.position.addScaledVector(bot.dashDir, 13 * dt);
        if (bot.dashT <= 0 && bot.state !== 'dead') { bot.state = 'idle'; bot.play('Idle', true); }
      } else if (!(SHOT && started)) {
        botUpdate(dt, now);
      } else if (SHOT === 'arena') {
        // Bot idles in arena shot; nothing to do.
      }
      if (bot.state !== 'dead' && bot.state !== 'special') bot.face(player);
      // Knockback decay
      for (const f of [player, bot]) {
        if (f.vel.lengthSq() > 0.001) {
          f.group.position.addScaledVector(f.vel, dt);
          f.vel.multiplyScalar(0.86);
          f.group.position.x = THREE.MathUtils.clamp(f.group.position.x, -10.5, 10.5);
          f.group.position.z = THREE.MathUtils.clamp(f.group.position.z, -10.5, 10.5);
        }
        f.ring.position.x = f.group.position.x; f.ring.position.z = f.group.position.z;
      }
      // Special spin + ring + damage
      if (player.state === 'special') {
        player.spinT += dt;
        player.group.rotation.y = player.baseYaw + player.spinT * 9;
        ringT += dt;
        specialRing.position.set(player.group.position.x, 0.06, player.group.position.z);
        const s = 1 + ringT * 4;
        specialRing.scale.set(s, s, 1);
        ringMat.opacity = Math.max(0, 0.9 - ringT * 0.8);
        window.__dbg = { spinT: player.spinT, dist: dist(player, bot), hitDone: player.specialHitDone, state: player.state, botHp: bot.hp };
        if (!player.specialHitDone && player.spinT >= 0.35) {
          player.specialHitDone = true;
          if (dist(player, bot) <= 3.6) applyHit(bot, 30, { from: player, knock: 6, crit: true });
        }
        if (now >= player.oneShotUntil) {
          player.state = 'idle'; player.play('Idle', true);
          specialRing.visible = false; ringT = -1;
        }
      }
      updateSparks(now);
      shotDriver(dt, now);
    }
    // Camera: follow midpoint from the +Z side, pulled back far enough that
    // both fighters fit horizontally — portrait phones need much more
    // distance than landscape (narrow horizontal FOV). Zooms in as the
    // fighters close in, out as they separate.
    if (player && bot) {
      const mid = new THREE.Vector3().addVectors(player.group.position, bot.group.position).multiplyScalar(0.5);
      const aspect = innerWidth / innerHeight;
      const vTan = Math.tan(THREE.MathUtils.degToRad(25));
      const need = THREE.MathUtils.clamp(dist(player, bot) / 2 + 2.2, 3.6, 8);
      const targetDist = Math.max(11.5, need / (vTan * aspect));
      camDist += (targetDist - camDist) * Math.min(1, dt * 3);
      const shX = shakeT > 0 ? (Math.random() - 0.5) * shakeMag : 0;
      const shY = shakeT > 0 ? (Math.random() - 0.5) * shakeMag : 0;
      shakeT = Math.max(0, shakeT - dt);
      camera.position.set(mid.x + shX, camDist * 0.66 + shY, mid.z + camDist);
      camera.lookAt(mid.x, 1.3, mid.z);
    }
  }
  renderer.render(scene, camera);
}
animate();

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
