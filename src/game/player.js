import { random } from '../core/random.js';
import {findMantle,beginMantle,advanceMantle} from '../world/traversal.js';
import { THREE,V3 } from '../core/gfx.js';
import { CONFIG } from '../config.js';
import { keys, tapped } from '../core/input.js';
import { clamp, damp } from '../core/rng.js';
import { W } from '../world/state.js';
import { moveBody, zoneAt, bumpPushables, solidsNear, groundAt } from '../world/physics.js';
import { puff, burst, smoke, smokeRing, splash, ripple, decal } from '../world/particles.js';
import { T } from '../core/textures.js';
import { makeCharacter } from '../characters/rig.js';
import { updateRide, autoMount, updateGrab, release, clearInvalidRide } from './ride.js';
import { hitBreakables } from '../world/breakables.js';
import { bounceAt, worldHit, shake, leaveSwing, driveSwing, leaveHide, leaveBench } from './worldfx.js';
import { isFree } from '../world/physics.js';
import { sfx } from '../core/sfx.js';
import { voice } from './voice.js';
import { applyGripMotion, struggleTap, startEmote, updateEmote, EMOTES } from './grab.js';
import { actors, shove, tickStun, ragK, knockDown } from './actors.js';
import { updateZip } from './zipline.js';

const PC = CONFIG.player;
export function createPlayer(skin, ch = makeCharacter(skin)) {
  return {
    ch, root: ch.root, pos: ch.root.position, vel: new V3(), push: new V3(),
    r: PC.radius, h: PC.height, step: PC.step, onGround: true, landed: false,
    stamina: 1, stDelay: 0, exhausted: false, sprinting: false, speed: 0,
    stun: 0, airPeak: 0, climb: null, held: null, charge: 0, charging: false,
    smokeT: 0, facing: 0, frozen: false, splashT: 0, boost: 0, throwT: 0, accel: 0, lastSpd: 0,
    crouch: false, slideT: 0, slideDir: [0, 1], dive: null, rollT: 0, diveCD: 0,
  };
}

// Пятно-тень лежит на земле под персонажем и не подпрыгивает вместе с ним: чем выше, тем меньше и бледнее
const shadowPoint=new V3(),shadowRotation=new THREE.Quaternion(),flatShadow=new THREE.Quaternion().setFromAxisAngle(new V3(1,0,0),-Math.PI/2);
export function groundBlob(p) {
  const support=p.ride?.solid,wasOn=support?.on;let g;
  try{if(support)support.on=false;g=groundAt(p.pos.x,p.pos.z,.1,p.pos.y+.05);}finally{if(support)support.on=wasOn;}
  const h=Math.max(0,p.pos.y-g),k=Math.max(0,1-h/6),b=p.ch.blob;
  p.root.updateWorldMatrix(true,false);shadowPoint.set(p.pos.x,g+.03,p.pos.z);b.position.copy(p.root.worldToLocal(shadowPoint));
  p.root.getWorldQuaternion(shadowRotation);b.quaternion.copy(shadowRotation.invert()).multiply(flatShadow);
  b.scale.setScalar(p.ch.blobS*(.55+.45*k));b.material.opacity=.32*k;b.visible=k>.02;
}
export function updatePlayer(p, dt, t, canMove, yaw = 0) {
  if (p.drone || p.returning) return;
  tickStun(p,dt);
  if(p.roofSeat){if(p.stun>0||p.heldBy||tapped('Space'))p.roofSeat=null;else{p.pos.copy(p.roofSeat.o.g.localToWorld(p.roofSeat.local.clone()));p.vel.set(0,0,0);p.ch.animate(dt,{t,speed:0,ride:'sit'});groundBlob(p);return;}}
  if(p.bus){p.vel.set(0,0,0);p.ch.animate(dt,{t,speed:0,ride:'sit',dangle:false});groundBlob(p);return;}
  if (p.knockT > 0) p.knockT -= dt;
  if (p.heldBy && canMove && ['Space', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE'].some(k => tapped(k))) struggleTap(p);
  if (p.noMountT > 0) p.noMountT -= dt;
  // в клетке: стоим, ждём (E — головоломка замка, см. main)
  if (p.caged) { p.vel.set(0, 0, 0); p.ch.animate(dt, { t, speed: 0, grabbed: true }); groundBlob(p); return; }
  // перекур/пивко со скелетом: стоим рядом, пока не докурим (убежать нельзя)
  if (p.chill) { p.chill.t -= dt; p.vel.set(0, p.vel.y, 0); if (p.chill.t <= 0) { p.stBoost = 25; p.chill = null; } }
  const ctrl = !p.chill && canMove && p.stun <= 0 && !(p.getT > 0) && !p.frozen && !(p.knockT > 0) && !(p.floatT > 0) && !(p.netT > 0);
  let ix = 0, iz = 0;
  if (ctrl) {
    if (keys.KeyA || keys.ArrowLeft) ix--; if (keys.KeyD || keys.ArrowRight) ix++;
    if (keys.KeyW || keys.ArrowUp) iz--; if (keys.KeyS || keys.ArrowDown) iz++;
  }
  // ввод относительно камеры: W — от камеры вперёд
  { const sx = ix, sz = iz, s = Math.sin(yaw), c = Math.cos(yaw); ix = sx * c + sz * s; iz = -sx * s + sz * c; }
  if (p.noRun) { ix = 0; iz = 0; }
  const il = Math.hypot(ix, iz); if (il) { ix /= il; iz /= il; }
  // эмоции 1–5
  if (ctrl) for (let i = 0; i < 5; i++) if (tapped('Digit' + (i + 1))) startEmote(p, EMOTES[i]);
  // F — «ква» (V оставлена под голосовой ввод)
  if (ctrl && tapped('KeyF')) voice(p.ch, ['idle', 'happy', 'jump'][(random() * 3) | 0], undefined, true);
  updateEmote(p, dt, il > 0 || tapped('Space'));
  // в укрытии: стоим невидимыми, выскочить — E (в main) или пробел
  if (p.hidden) { p.stamina = Math.min(1, p.stamina + PC.stamina.regen * dt); if (ctrl && tapped('Space')) leaveHide(p); else { groundBlob(p); return; } }
  // на зиплайне: едешь вниз по тросу, пробел — спрыгнуть
  if (p.zip) { updateZip(p, dt, ctrl && tapped('Space')); p.ch.animate(dt, { t, speed: 0, air: false, vy: 0, zip: true }); groundBlob(p); if (p.zip) return; }
  // на скамейке: сидит, болтает ногами, осматривается; выносливость восстанавливается втрое быстрее
  if (p.bench) {
    p.stamina = Math.min(1, p.stamina + PC.stamina.regen * 3 * dt); p.exhausted = false;
    if (ctrl && (tapped('Space') || il > 0)) leaveBench(p);
    else { p.ch.animate(dt, { t, speed: 0, ride: 'sit', rideSpeed: 0, dangle: true, look: Math.sin(t * 0.6) * 0.9 * Math.max(0, Math.sin(t * 0.23)) }); groundBlob(p); return; }
  }
  // на качелях: W/S — раскачиваться, пробел — спрыгнуть
  if (p.swing) { p.stamina = Math.min(1, p.stamina + PC.stamina.regen * 2 * dt);
    if (ctrl && tapped('Space')) leaveSwing(p, true);
    else { driveSwing(p, ctrl && (keys.KeyW || keys.KeyS || keys.ArrowUp || keys.ArrowDown), dt); p.ch.animate(dt, { t, speed: 0, ride: 'sit', rideSpeed: 0, hold: true, dangle: true }); groundBlob(p); return; }
  }
  // Проверенный маршрут подтягивания: от края вверх, затем на опору.
  if(p.mantle&&(p.stun>0||p.heldBy||p.ride||p.frozen)){p.mantle=null;p.onGround=false;}
  if(p.mantle){const active=advanceMantle(p,dt);p.ch.animate(dt,{t,speed:0,climb:true,air:false,vy:2});if(active&&!p.mantle)smokeRing(p.pos.x,p.pos.y+.05,p.pos.z,4,{speed:1.2,size:.12,grow:.3,life:.4});groundBlob(p);return;}

  clearInvalidRide(p);
  if (p.ride) {
    const pose = p.ride.ride.pose;
    updateRide(p, dt, t, ix, iz, ctrl);
    if (p.ride) {
      p.stamina = Math.min(1, p.stamina + PC.stamina.regen * dt);
      p.ch.animate(dt, { t, speed: 0, ride: pose, rideSpeed: p.speed, hold: false, kick: p.rideKick, trick: p.trickK || 0, cyclePhase:p.cyclePhase, board: p.ride.kind,rideAir:!!p.ride.air });
      groundBlob(p);
      return;
    }
  }
  // присед / подкат / выпад
  const curSp = Math.hypot(p.vel.x, p.vel.z);
  p.diveCD -= dt;
  if (ctrl && tapped('KeyC') && p.onGround && curSp > PC.walk + 1 && !p.climb && !p.dive) {
    p.slideT = PC.slideTime; p.slideDir = [p.vel.x / curSp, p.vel.z / curSp]; p.slideV = Math.max(curSp, PC.slideSpeed);
    smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 6, { speed: 2.2 });
  }
  // выпад стоит четверть стамины: без неё не прыгнешь, спамить нельзя
  if (ctrl && !p.holding && !p.heldBy && !p.carryCrate && tapped('KeyQ') && !p.dive && p.diveCD <= 0 && !p.climb && p.slideT <= 0 && p.stamina >= PC.diveCost && !p.exhausted) {
    sfx('dive'); voice(p.ch, 'dive'); const f = p.root.rotation.y; p.dive = 'air'; p.diveCD = PC.diveCooldown; p.stamina -= PC.diveCost; p.stDelay = PC.stamina.delay;
    p.vel.x = Math.sin(f) * PC.diveSpeed + p.vel.x * 0.2; p.vel.z = Math.cos(f) * PC.diveSpeed + p.vel.z * 0.2;
    p.vel.y = p.onGround ? PC.diveUp : Math.max(p.vel.y, 2); p.onGround = false; p.airPeak = p.pos.y;
  }
  const lowCeil = solidsNear(p.pos.x - 0.3, p.pos.z - 0.3, p.pos.x + 0.3, p.pos.z + 0.3).some(s => s.on && p.pos.x + 0.3 > s.x0 && p.pos.x - 0.3 < s.x1 && p.pos.z + 0.3 > s.z0 && p.pos.z - 0.3 < s.z1 && s.y0 >= p.pos.y + PC.crouchH - 0.05 && s.y0 < p.pos.y + PC.height);
  p.crouch = !p.climb && (p.slideT > 0 || !!p.dive || (ctrl && keys.KeyC && p.onGround) || (p.crouch && lowCeil));
  p.h = p.crouch ? PC.crouchH : PC.height;
  // спринт и стамина
  const wantSprint = ctrl && il > 0 && (keys.ShiftLeft || keys.ShiftRight) && !p.climb && !p.crouch;
  if (p.grab && tapped('KeyC')) release(p, 1);
  if (p.exhausted && p.stamina > PC.stamina.restart) p.exhausted = false;
  p.sprinting = !p.holding && !p.heldBy && !p.carryCrate && wantSprint && !p.exhausted && p.stamina > 0;
  // бодрость после перекура/пивка со скелетом: усталость копится втрое медленнее, отдых быстрее
  if (p.stBoost > 0) p.stBoost -= dt;
  if (p.sprinting && !(p.energy > 0)) { p.stamina -= PC.stamina.drain * dt * (p.stBoost > 0 ? 0.35 : 1); p.stDelay = PC.stamina.delay; if (p.stamina <= 0) { p.stamina = 0; p.exhausted = true; } }
  else { p.stDelay -= dt; if (p.stDelay <= 0) p.stamina = Math.min(1, p.stamina + PC.stamina.regen * dt * (p.stBoost > 0 ? 1.8 : 1)); }
  // поверхность под ногами
  const water = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'water');
  const wading=zoneAt(p.pos.x,p.pos.z,p.pos.y,'wading');
  const slick = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'oil') || zoneAt(p.pos.x, p.pos.z, p.pos.y, 'puddle');
  const wash = zoneAt(p.pos.x, p.pos.z, p.pos.y, 'wash');
  // разгон спринта: сначала разбег, потом набор скорости; после спринта — плавное торможение
  if (p.sprinting) p.boost = Math.min(1, p.boost + dt / PC.sprintRamp); else p.boost = Math.max(0, p.boost - dt / PC.sprintFade);
  const ramp = p.boost * p.boost * (3 - 2 * p.boost);
  let top = (PC.walk + (PC.sprint - PC.walk) * (p.sprinting ? ramp : 0)) * (water ? 0.5 : wading ? 0.85 : 1) * (p.held && p.held.def.heavy ? 0.85 : 1);
  if (p.energy > 0) top *= 1.2; else if (p.tired > 0) top *= 0.8;
  if (p.webT > 0) { p.webT -= dt; top *= 0.4; }
  if (p.daze > 0) top *= 0.18;
  if (p.crouch) top = Math.min(top, PC.crouchSpeed);
  if (p.grab) top *= p.grab.kind === 'barrow' ? 0.82 : 0.92;
  if (p.holding) top *= 0.4;
  if (p.heldBy) top *= 0.24;
  if (p.carryCrate) top *= 0.6;
  const cur = Math.hypot(p.vel.x, p.vel.z);
  let acc;
  if (!p.onGround) acc = 6.5;
  else if (slick || p.slipT > 0) acc = 1.2;
  else if (il) acc = PC.accel;
  else acc = cur > PC.walk + 0.5 ? PC.sprintDecel : PC.decel;
  if (p.slideT > 0) {
    // подкат: несёт по инерции, чуть рулится
    p.slideT -= dt; p.slideV = Math.max(3, p.slideV - 11 * dt);
    if (il) { const a = Math.atan2(p.slideDir[0], p.slideDir[1]); let d = Math.atan2(ix, iz) - a; d = Math.atan2(Math.sin(d), Math.cos(d)); const na = a + Math.max(-1.2 * dt, Math.min(1.2 * dt, d)); p.slideDir = [Math.sin(na), Math.cos(na)]; }
    p.vel.x = p.slideDir[0] * p.slideV; p.vel.z = p.slideDir[1] * p.slideV;
    if (random() < dt * 22) smoke(p.pos.x - p.slideDir[0] * 0.3, p.pos.y + 0.12, p.pos.z - p.slideDir[1] * 0.3, { size: 0.16, grow: 0.55, life: 0.55, vy: 0.5, vx: -p.slideDir[0] * 1.2 + (random() - 0.5), vz: -p.slideDir[1] * 1.2 + (random() - 0.5) });
  } else if (p.dive === 'air') { /* в выпаде управление не действует */ }
  else if (p.dive === 'roll') { p.rollT -= dt; p.vel.x *= Math.exp(-dt * 2); p.vel.z *= Math.exp(-dt * 2); if (p.rollT <= 0) p.dive = null; }
  else { p.vel.x += (ix * top - p.vel.x) * damp(acc, dt); p.vel.z += (iz * top - p.vel.z) * damp(acc, dt); }
  // щётки автомойки отбрасывают

  p.vel.x += p.push.x; p.vel.z += p.push.z; p.push.multiplyScalar(0);
  // лестницы (v0.18): плавно «пристёгиваемся» по центру; Shift вверх — быстро (выносливость), Shift вниз — съезжаешь;
  // пробел — отпрыгнуть назад/вбок; другой персонаж на лестнице — твёрдый, сквозь него не пролезть
  const wasClimb = p.climb; p.climb = null;
  if (p.ladderCD > 0) p.ladderCD -= dt;
  for (const l of p.ladderCD > 0 || p.ride ? [] : W.ladders) {
    if (p.pos.x > l.x0 && p.pos.x < l.x1 && p.pos.z > l.z0 && p.pos.z < l.z1 && p.pos.y >= l.y0 - 0.1 && p.pos.y < l.y1) {
      const into = -(ix * l.nx + iz * l.nz), shift = ctrl && (keys.ShiftLeft || keys.ShiftRight);
      let dir = 0;
      if (into > 0.3) dir = 1; else if (into < -0.3 && !p.onGround) dir = -1;
      if (dir || (!p.onGround && p.vel.y <= 0.5) || (wasClimb === l && !p.onGround)) p.climb = l;
      if (l.slide && p.climb && dir <= 0 && !p.onGround) dir = -1; // v0.60: в люке не зависаем: не жмёшь к лестнице — плавно съезжаешь вниз
      if (p.climb) {
        // кто-то на лестнице выше/ниже — дальше не пролезть
        for (const b of actors()) { if (b === p || (b.climb !== l && b.climbing !== l)) continue; const dy = b.pos.y - p.pos.y; if ((dir > 0 && dy > 0 && dy < 1.7) || (dir < 0 && dy < 0 && dy > -1.7)) dir = 0; }
        let v = 0;
        if (dir > 0) { v = PC.climb; if (shift && p.stamina > 0.05 && !p.exhausted) { v *= 1.8; p.stamina = Math.max(0, p.stamina - dt * 0.35); } }
        else if (dir < 0) v = shift || l.slide ? -PC.climb * (l.slide ? 2.2 : 3) : -PC.climb;
        p.vel.y = v;
        const cx = (l.x0 + l.x1) / 2, cz = (l.z0 + l.z1) / 2, k = Math.min(1, dt * 12);
        // плавно к центру лестницы (поперёк) и к стене (вдоль нормали) — не цепляемся за края
        p.vel.x = (cx - p.pos.x) * k / dt * (l.nx ? 0.4 : 1); p.vel.z = (cz - p.pos.z) * k / dt * (l.nz ? 0.4 : 1);
        p.airPeak = p.pos.y;
        // упёрся головой (потолок/люк) — не висим: чуть отталкивает от стены, чтобы выйти на площадку или слезть
        if (dir > 0 && wasClimb === l && p.pos.y - (p.lastClimbY ?? -99) < 0.002) { p.climbStuck = (p.climbStuck || 0) + dt; if (p.climbStuck > 0.3) { p.vel.x -= l.nx * 3; p.vel.z -= l.nz * 3; p.climbStuck = 0; } } else p.climbStuck = 0;
        p.lastClimbY = p.pos.y;
        if (dir < 0 && shift && random() < dt * 20) puff(p.pos.x, p.pos.y + 0.5, p.pos.z, { size: 0.08, life: 0.25, color: 0xd8d0e4 });
      }
      break;
    }
  }
  // прыжок
  // v0.51: отзывчивый прыжок — буфер нажатия (0.13 с) и «койот» (0.12 с после схода с края)
  p.coyote = p.onGround ? 0.12 : Math.max(0, (p.coyote || 0) - dt);
  p.jumpBuf = ctrl && tapped('Space') ? 0.13 : Math.max(0, (p.jumpBuf || 0) - dt);
  if (ctrl && !p.holding && !p.heldBy && p.jumpBuf > 0 && (p.onGround || p.coyote > 0 || p.climb) && !p.dive) {
    p.jumpBuf = 0; p.coyote = 0; p.jumpHeld = true;
    if (p.slideT > 0) { p.slideT = 0; }
    p.vel.y = PC.jump * (water ? 0.75 : 1); sfx('jump'); if (random() < 0.35) voice(p.ch, 'jump');
    // с лестницы: назад от стены + вбок по нажатой стрелке
    if (p.climb) { const l = p.climb, tx = -l.nz, tz = l.nx, side = ix * tx + iz * tz; p.vel.x = l.nx * 4.5 + tx * side * 4; p.vel.z = l.nz * 4.5 + tz * side * 4; p.vel.y = PC.jump * 0.8; p.climb = null; p.ladderCD = 0.4; }
    smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 5, { speed: 1.6, size: 0.14, grow: 0.42, life: 0.5 });
  }
  p.noGrav = !!p.climb && p.vel.y === 0;
  const wasGround = p.onGround;
  // выпадом можно пробить стекло и ящик (вылететь в окно)
  if (p.dive === 'air') hitBreakables({ x: p.pos.x + p.vel.x * 0.05, y: p.pos.y + 0.6, z: p.pos.z + p.vel.z * 0.05 }, 0.6, [p.vel.x, p.vel.y, p.vel.z], 1, ['glass', 'crate']);
  // шарик с водой в руках — как парашют: падаешь медленно и без оглушения
  if (!p.onGround && p.held && p.held.type === 'balloon' && p.vel.y < -2.6) { p.vel.y = -2.6; p.airPeak = p.pos.y + 1; }
  // раскрытый зонтик — парашют
  if (!p.onGround && p.held && p.held.type === 'umbrella' && p.held.open && p.vel.y < -2.2) { p.vel.y = -2.2; p.airPeak = p.pos.y + 1; p.vel.x *= 0.99; p.vel.z *= 0.99; }
  if (p.jetT > 0) { p.jetT -= dt; p.airPeak = p.pos.y; }
  // v0.57: перекат и подкат — лёгкий толчок: задетого отодвигает на 0.5–1 м с маленьким подскоком, без падения и без потери предмета
  if ((p.dive === 'roll' || p.slideT > 0) && p.onGround) for (const b of actors()) { if (b === p || b.hidden || b.heldBy || b.ride || b.bumpT > 0) continue;
    const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z, d = Math.hypot(dx, dz) || .01; if (d > p.r + b.r + .12 || Math.abs(b.pos.y - p.pos.y) > 1) continue;
    const sp = Math.hypot(p.vel.x, p.vel.z) || 1, ux = (dx / d) * .6 + (p.vel.x / sp) * .4, uz = (dz / d) * .6 + (p.vel.z / sp) * .4, ul = Math.hypot(ux, uz) || 1;
    b.vel.x = ux / ul * 3.4; b.vel.z = uz / ul * 3.4; b.vel.y = Math.max(b.vel.y, 2.2); b.onGround = false; b.knockT = Math.max(b.knockT || 0, .18); b.bumpT = .6;
    p.vel.x *= .8; p.vel.z *= .8; sfx('hit', { at: b.pos, v: .35 }); voice(b.ch, 'hurt', b.pos); burst(b.pos.x, b.pos.y + .9, b.pos.z, 3, { color: 0xf1e8ff, size: .12, speed: 1.4, up: 1 }); }
  if (p.dive === 'air') {
    worldHit({ x: p.pos.x + p.vel.x * 0.05, y: p.pos.y + 0.6, z: p.pos.z + p.vel.z * 0.05 }, 4, p.vel);
    // выпад: сбивает толчком (без оглушения), выбивает предмет из рук; закрытую дверь — вышибает
    for (const b of actors()) { if (b === p || b.hidden || b.heldBy || (b.diveHitT > 0)) continue; const dx = b.pos.x - p.pos.x, dz = b.pos.z - p.pos.z; if (Math.hypot(dx, dz) < p.r + b.r + 0.15 && Math.abs(b.pos.y - p.pos.y) < 1.2) { shove(b, p.vel.x, p.vel.z, 7.5, 4.5, true); b.diveHitT = 0.6; voice(b.ch, 'hurt', b.pos); W.onHit && W.onHit(p, b, 'heavy'); sfx('hit', { at: b.pos, v: 0.8 }); shake(0.1); } }
    // выпад в закрытую дверь: распахивается резко, кто стоял за ней — отлетает рэгдоллом
    for (const d of W.doors) if (!d.open && Math.hypot(d.x - p.pos.x, d.z - p.pos.z) < 1.0 && Math.abs(d.y - p.pos.y) < 1.2) { d.open = true; d.slam = 1; sfx('door', { at: d }); shake(0.18); smokeRing(d.x, d.y + 1, d.z, 6, { speed: 2 });
      const vl = Math.hypot(p.vel.x, p.vel.z) || 1, ux = p.vel.x / vl, uz = p.vel.z / vl;
      slamDoor(d, ux, uz, vl);
      for (const b of actors()) { if (b === p || b.hidden) continue; const dx = b.pos.x - d.x, dz = b.pos.z - d.z; if (Math.hypot(dx, dz) < 1.6 && dx * ux + dz * uz > 0 && Math.abs(b.pos.y - d.y) < 1.2) { knockDown(b, ux * 9, uz * 9, 1.4); voice(b.ch, 'hurt', b.pos); W.onHit && W.onHit(p, b, 'heavy'); } } }
  }
  if (p.diveHitT > 0) p.diveHitT -= dt; if (p.bumpT > 0) p.bumpT -= dt;
  applyGripMotion(p, dt);
  // короткое нажатие — низкий прыжок, удержание — полный; вниз падаем быстрее (меньше «лунной» паузы)
  if (p.vel.y <= 0 || p.onGround) p.jumpHeld = false;
  const spaceHeld = ctrl && (keys.Space || keys.space);
  const gK = p.climb || p.zip ? 1 : p.vel.y < 0 ? 1.3 : (p.jumpHeld && !spaceHeld && !p.bounced) ? 2.1 : 1;
  moveBody(p, dt, PC.gravity * gK);
  bumpPushables(p);
  // батут: приземлился на маркизу / крышу машины / матрас — подбросило
  if (p.landed) { const bo = bounceAt(p.pos.x, p.pos.z, p.pos.y,Math.max(0,p.airPeak-p.pos.y)); if (bo) { p.vel.y = bo.power; p.onGround = false; p.airPeak = p.pos.y; p.bounced = 0.3; p.dive = null;
    sfx('bounce'); voice(p.ch, 'happy'); smokeRing(p.pos.x, p.pos.y + 0.05, p.pos.z, 6, { speed: 2, size: 0.14, grow: 0.4, life: 0.4 }); worldHit({ x: p.pos.x, y: p.pos.y - 0.4, z: p.pos.z }, 1.2, p.vel); shake(0.08); } }
  // Любой плоский уступ: геометрия края, опора стоп и свободная траектория тела.
  p.mantleProbe=Math.max(0,(p.mantleProbe||0)-dt);
  if(!p.onGround&&il>.1&&p.vel.y<3&&!p.climb&&!p.dive&&!p.held&&!p.heldBy&&!p.holding&&!p.grab&&!p.ride&&p.mantleProbe<=0){p.mantleProbe=.06;const target=findMantle(p,ix,iz);if(target){beginMantle(p,target);sfx('mantle');}}

  if (p.grab && (p.stun > 0 || p.climb || p.dive || !p.onGround && p.vel.y > 1)) release(p, 0.5);
  updateGrab(p, dt);
  autoMount(p);
  // падение с высоты оглушает
  if (!p.onGround) p.airPeak = Math.max(p.airPeak, p.pos.y);
  if (p.onGround && !wasGround) {
    const drop = p.airPeak - p.pos.y;
    if (p.dive === 'air' && drop <= PC.fallStun) { p.dive = 'roll'; p.rollT = PC.rollTime; p.vel.x *= 0.8; p.vel.z *= 0.8; smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 7, { speed: 2.4 }); }
    else if (p.dive === 'air') p.dive = null;
    if (p.thrown) { p.thrown = false; if (drop > 0.3) { p.stun = Math.max(p.stun, 0.6); smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 8, { speed: 2.4 }); } }
    if (drop > 0.5) sfx('land', { v: Math.min(1.5, drop * 0.3) });
    if (drop > 2.5) { shake(Math.min(0.5, drop * 0.06)); voice(p.ch, drop > PC.fallStun ? 'hurt' : 'land'); }
    if (drop > PC.fallStun) { p.stun = PC.stunTime; smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 12, { speed: 3.2, size: 0.24, grow: 0.8, life: 0.8 }); }
    else if (drop > 0.4) smokeRing(p.pos.x, p.pos.y + 0.1, p.pos.z, 7, { speed: 2, size: 0.16, grow: 0.5, life: 0.55 });
    p.landedNow = true;
  } else p.landedNow = false;
  if (p.onGround) p.airPeak = p.pos.y;
  if (p.stun > 0 || p.getT > 0) { p.vel.x *= 0.85; p.vel.z *= 0.85; }
  // поворот и анимация
  const spd = Math.hypot(p.vel.x, p.vel.z); p.speed = spd;
  if (p.charging && Number.isFinite(p.aimYaw)) p.facing = p.aimYaw;
  else if (spd > 0.6 && !p.climb && !p.dive) p.facing = Math.atan2(p.vel.x, p.vel.z);
  else if (p.climb) p.facing = Math.atan2(-p.climb.nx, -p.climb.nz);
  if (!Number.isFinite(p.facing)) p.facing = p.root.rotation.y;
  let dy = p.facing - p.root.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); p.root.rotation.y += dy * damp(14, dt);
  // дым при беге, брызги в воде
  // дым из-под ног: небольшой, позади персонажа и у самой земли, чтобы не закрывать его
  // бег: объёмные клубы дыма позади; шаг: только редкие крошки пыли из-под ног
  p.smokeT -= dt;
  const running = p.boost > 0.35 && spd > PC.walk + 0.5;
  if (p.onGround && !p.crouch && p.smokeT <= 0 && spd > 2.5) {
    const bx = -p.vel.x / spd, bz = -p.vel.z / spd;
    if (water) { p.smokeT = running ? 0.12 : 0.22; splash(p.pos.x, p.pos.y, p.pos.z, running ? 0.45 : 0.2); }
    else if (running) {
      p.smokeT = 0.055;
      const n = random() < 0.35 ? 2 : 1;
      for (let i = 0; i < n; i++) smoke(p.pos.x + bx * 0.45 + (random() - 0.5) * 0.35, p.pos.y + 0.12 + random() * 0.1, p.pos.z + bz * 0.45 + (random() - 0.5) * 0.35,
        { size: 0.12 + random() * 0.06, grow: 0.45 + random() * 0.25, life: 0.55 + random() * 0.25, vx: bx * 1.4 + (random() - 0.5) * 0.6, vz: bz * 1.4 + (random() - 0.5) * 0.6, vy: 0.35 + random() * 0.4 });
    } else { p.smokeT = 0.22 + random() * 0.2; smoke(p.pos.x + bx * 0.3, p.pos.y + 0.04, p.pos.z + bz * 0.3, { dust: true, vx: bx * 0.8 + (random() - 0.5) * 0.6, vz: bz * 0.8 + (random() - 0.5) * 0.6 }); }
  }
  // шаги: звук зависит от поверхности
  if (p.onGround && spd > 2 && !p.crouch) { p.stepSnd = (p.stepSnd || 0) - dt * spd; if (p.stepSnd <= 0) { p.stepSnd = 2.4; sfx('step', { surf: water || wading || zoneAt(p.pos.x, p.pos.z, p.pos.y, 'puddle') ? 'water' : zoneAt(p.pos.x, p.pos.z, p.pos.y, 'leaves') ? 'grass' : 'stone', v: 0.6 + spd / 22 }); } }
  if (spd < 0.5 && p.onGround) { p.idleV = (p.idleV ?? 6) - dt; if (p.idleV <= 0) { p.idleV = 6 + random() * 8; voice(p.ch, 'idle'); } } else p.idleV = Math.max(p.idleV ?? 6, 3);
  if (p.throwT > 0) p.throwT -= dt;
  if (p.pushing > 0) p.pushing -= dt;
  if (p.slipT > 0) p.slipT -= dt;
  // куча листьев: пробежал — разлетелись
  if (spd > 3 && p.onGround && random() < dt * 12 && zoneAt(p.pos.x, p.pos.z, p.pos.y, 'leaves')) burst(p.pos.x, p.pos.y + 0.2, p.pos.z, 3, { color: [0xc96a25, 0xa8452a, 0xe0902e][(random() * 3) | 0], size: 0.14, speed: 2.2, up: 2.5, g: 5, life: 1.0, grow: 0.1 });
  // вода: стоишь — расходятся круги; приземлился — всплеск; вышел — мокрые следы
  // лужа: брызги под ногами, мокрые следы ~5 с (скользко — см. slick)
  if (!water && p.onGround && (wading || zoneAt(p.pos.x, p.pos.z, p.pos.y, 'puddle'))) { p.wetT = 5; if (spd > 1.5 && random() < dt * 10) burst(p.pos.x, p.pos.y + 0.05, p.pos.z, 2, { color: 0x9ccbec, size: 0.08, speed: 1.2 + spd * 0.15, up: 1.6 }); if (p.landedNow) splash(p.pos.x, p.pos.y, p.pos.z, 0.6); }
  if (water) { p.wetT = 3; p.ripT = (p.ripT || 0) - dt; if (p.ripT <= 0) { p.ripT = 0.7; ripple(p.pos.x, p.pos.y, p.pos.z, 0.8, 1.2); } if (p.landedNow) splash(p.pos.x, p.pos.y, p.pos.z, 1); }
  else if (p.wetT > 0 && p.onGround) { p.wetT -= dt; p.stepT = (p.stepT || 0) - dt;
    if (p.stepT <= 0 && spd > 1.5) { p.stepT = 0.32; p.stepS = -(p.stepS || 1); const f = p.root.rotation.y, sx = Math.cos(f) * 0.14 * p.stepS, sz = -Math.sin(f) * 0.14 * p.stepS;
      const d = decal(T.foot(), p.pos.x + sx, p.pos.y, p.pos.z + sz, 0.32, 4 + p.wetT, 0xffffff); d.rotation.z = f; d.material.opacity = 0.3 + 0.2 * p.wetT / 3; } }
  groundBlob(p);
  p.accel = (spd - p.lastSpd) / Math.max(dt, 1e-3); p.lastSpd = spd;
  p.ch.animate(dt, { t, act: p.chill ? 'smoke' : undefined, smokePh: p.chill ? (p.chill.t > 8.8 ? 'take' : p.chill.t < 0.8 ? 'flick' : 'smoke') : undefined, speed: spd / PC.sprint * 1.4, air: !p.onGround && !p.climb, vy: p.vel.y, stun: p.stun > 0, rag: ragK(p), daze: p.daze > 0, grabbed: p.netT > 0 && !(p.stun > 0), climb: !!p.climb,
    payload:p.carryCrate?0.5:p.carryKitten||p.dogHeld?0.42:p.held?.def.r||0, missionTool: !!p.missionTool, hold: (!!p.hotPotato || !!p.held || !!p.grab || p.pushing > 0 || !!p.carryKitten || !!p.carryCrate || !!p.carryNet || !!p.dogHeld) && !p.holding, zombie: !!p.zombie, charge: p.charging ? p.charge : 0, landed: p.landedNow, throwT: p.throwT, accel: p.accel, sprint: p.boost,
    crouch: p.crouch && !p.dive && p.slideT <= 0, slide: p.slideT > 0, dive: p.dive, roll: p.dive === 'roll' ? 1 - p.rollT / PC.rollTime : null,
    emote: p.emote, emoteT: p.emoteT, held2: !!p.holding, restrained: !!p.heldBy, swat: p.swatT > 0 ? p.swatT : 0, fly: p.flyT > 0 && !p.onGround, vy2: p.vel.y, flySpin: p.flyT > 0 ? 6 : 0 });
  if (p.flyT > 0) { p.flyT -= dt; if (p.onGround) p.flyT = 0; else if (p.vel.lengthSq() > 4) { p.facing = Math.atan2(p.vel.x, p.vel.z); p.root.rotation.y = p.facing; } }
}

// выбить дверь выпадом (v0.22): дверь распахивается в сторону выпада и летит по инерции (игрок и боты)
export function slamDoor(d, ux, uz, speed = 8) {
  if(W.net?.request('slam',d,{ux,uz,speed}))return;
  const sg = d.axis === 'x' ? -Math.sign(uz || 1) : Math.sign(ux || 1); d.open = true; d.slam = 1; d.dirS = sg; d.av = sg * Math.max(7, speed * 1.4);
}
