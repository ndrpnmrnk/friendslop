import { random } from '../core/random.js';
import { updateOcclusion } from './occlusion.js';
import { THREE, V3 } from '../core/gfx.js';
import { W } from '../world/state.js';
import { solidsNear, groundAt } from '../world/physics.js';
import { clamp, damp } from '../core/rng.js';
import { CONFIG } from '../config.js';

export function castCamera(o, d, maxT, radius, ignore = null, floorY = -Infinity) {
  let best = maxT;
  const ex = o.x + d.x * maxT, ez = o.z + d.z * maxT;
  for (const s of solidsNear(Math.min(o.x, ex) - radius, Math.min(o.z, ez) - radius, Math.max(o.x, ex) + radius, Math.max(o.z, ez) + radius)) {
    if (!s.on || s === ignore || s.y1 <= floorY) continue;
    let t0 = 0, t1 = best, ok = true;
    for (let a = 0; a < 3; a++) {
      const oo = a === 0 ? o.x : a === 1 ? o.y : o.z, dd = a === 0 ? d.x : a === 1 ? d.y : d.z;
      const mn = (a === 0 ? s.x0 : a === 1 ? s.y0 : s.z0) - radius, mx = (a === 0 ? s.x1 : a === 1 ? s.y1 : s.z1) + radius;
      if (Math.abs(dd) < 1e-6) { if (oo < mn || oo > mx) { ok = false; break; } continue; }
      let ta = (mn - oo) / dd, tb = (mx - oo) / dd; if (ta > tb) { const q = ta; ta = tb; tb = q; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb; if (t0 > t1) { ok = false; break; }
    }
    if (ok && t1 >= 0 && t0 < best) best = Math.max(0, t0 - 0.01);
  }
  return best;
}

export function createCameraRig(){
/* Камера из-за плеча. Стены и потолки не пускают её внутрь себя, по полу она скользит.
   Поза мини-игры фиксирована, обычная камера следует за игроком без автоповорота. */
const cam = { pose: null, yaw: 0, pitch: 0.45, curDist: 6, sens: 0.0024, aimK: 0, idle: 0,
  normal: { dist: 6.4, shoulder: 1.15, height: 2.05 }, aim: { dist: 3.5, shoulder: 1.15, height: 2.1 } };
const pos = new V3(), look = new V3(), tgt = new V3(), want = new V3(), dir = new V3(), hit = new V3(), piv = new V3(), sh = new V3(), eye = new V3(), pv = new V3(), delta = new V3();
const ray = new THREE.Ray();
let following = false, orbitPitch = 0.45, orbitYaw = 0, handoff=null;

function resetCamera(yaw) { cam.pose=cam.free=cam.ret=cam.orbit=cam.dronePos=cam.retP=cam.retL=null;cam.yaw = orbitYaw = yaw; cam.pitch = orbitPitch = 0.45; cam.curDist = cam.normal.dist; cam.aimK = 0; cam.blend = 1; following = false;handoff=null; }


// Луч по расширенным AABB = движение камеры с запасом по всем трём осям.
// floorY: твёрдое, чей верх ниже этой высоты, не мешает (по полу и низким предметам камера скользит сверху)

function constrain(from, to, radius, ignore, floorY) {
  delta.subVectors(to, from); const len = delta.length();
  if (len > 1e-6) to.copy(from).addScaledVector(delta.multiplyScalar(1 / len), castCamera(from, delta, len, radius, ignore, floorY));
  return to;
}
// камера не уходит под пол: поднимается над землёй/низким предметом под собой
function aboveGround(v, maxY, clear = 0.35) {
  const g = groundAt(v.x, v.z, 0.2, maxY);
  if (v.y < g + clear) v.y = g + clear;
  return v;
}

/* Камера свободно наклоняется мышью: от взгляда снизу вверх (камера у самой земли) до вида
   почти сверху. Стены и потолки её останавливают, а по полу и низким объектам она скользит. */
function updateCamera(camera, p, dt, snap, lookDelta, aiming) {
  if (!cam.pose) updateOcclusion(camera, null);
  if (cam.free) { camera.position.copy(cam.free.p); camera.lookAt(cam.free.l); return; } // отладка: свободная камера
  const clearanceFov = cam.pose ? 105 : camera.fov;
  const radius = Math.max(0.2, camera.near * Math.hypot(1, Math.tan(clearanceFov * Math.PI / 360) * Math.hypot(camera.aspect, 1)) + 0.02);
  if (lookDelta && !cam.pose && !cam.orbit) {
    cam.yaw -= lookDelta.dx * cam.sens * (aiming ? 0.75 : 1);
    cam.pitch = clamp(cam.pitch + lookDelta.dy * cam.sens * (aiming ? 0.75 : 1), -0.75, 1.5);
  }
  /* возвращение после дрона (v0.23): камера плавно отъезжает назад-вверх за спину точки высадки — видно, как
     персонаж спускается на тросе, — и, когда он встал, так же плавно переходит в обычную камеру (без рывков) */
  if (cam.ret) {
    const dr = new V3(Math.sin(cam.yaw) * Math.cos(0.35), Math.sin(0.35), Math.cos(cam.yaw) * Math.cos(0.35));
    const l = cam.ret.l, want = l.clone().addScaledVector(dr, 7.5).add(new V3(0, 0.6, 0)); aboveGround(want, want.y + 20);
    if (!cam.retP) { cam.retP = camera.position.clone(); cam.retL = l.clone().add(new V3(0, 2, 0)); }
    cam.retP.lerp(want, damp(2.2, dt)); cam.retL.lerp(l, damp(3, dt));
    camera.position.copy(cam.retP); camera.lookAt(cam.retL); pos.copy(cam.retP); look.copy(cam.retL); following = false; cam.dronePos = null; return;
  }
  if (cam.retP) { cam.retP = null; cam.retL = null; orbitPitch = cam.pitch; orbitYaw = cam.yaw; }
  if (p.drone) {
    // вертушка — камера от третьего лица, как за персонажем: сзади-сверху, плавно
    const dir = new V3(-Math.sin(cam.yaw) * Math.cos(cam.pitch), -Math.sin(cam.pitch), -Math.cos(cam.yaw) * Math.cos(cam.pitch));
    // плечевая камера как у персонажа: сзади, чуть правее и выше
    const right = new V3(-Math.cos(cam.yaw), 0, Math.sin(cam.yaw));
    const want = p.pos.clone().addScaledVector(dir, -3.6).addScaledVector(right, 0.9).add(new V3(0, 0.9, 0));
    if (!cam.dronePos || snap) cam.dronePos = want.clone(); cam.dronePos.lerp(want, damp(8, dt));
    camera.position.copy(cam.dronePos); camera.lookAt(p.pos.clone().addScaledVector(dir, 6).addScaledVector(right, 0.9).add(new V3(0, 0.3, 0))); return;
  }
  let P, L;
  if (cam.orbit && !cam.pose) {
    // свободная камера вокруг крана: мышь вращает, стены не пускают
    if (lookDelta) { cam.yaw -= lookDelta.dx * cam.sens; cam.pitch = clamp(cam.pitch + lookDelta.dy * cam.sens, 0.05, 1.45); }
    orbitPitch += (cam.pitch - orbitPitch) * damp(20, dt); orbitYaw += (cam.yaw - orbitYaw) * damp(20, dt);
    dir.set(Math.sin(orbitYaw) * Math.cos(orbitPitch), Math.sin(orbitPitch), Math.cos(orbitYaw) * Math.cos(orbitPitch));
    piv.lerp(cam.orbit.c, snap ? 1 : damp(6, dt));
    want.copy(piv).addScaledVector(dir, cam.orbit.dist); aboveGround(want, want.y + 50); constrain(piv, want, radius);
    P = want; L = look.copy(piv); following = false;
    if (Math.abs(camera.fov - CONFIG.camera.fov) > 0.01) { camera.fov = CONFIG.camera.fov; camera.updateProjectionMatrix(); }
    camera.position.lerp(P, snap ? 1 : damp(10, dt)); camera.lookAt(L); pos.copy(camera.position); look.copy(L); cam.blend = 0;
    return;
  }
  if (cam.pose) {
    // луч от объекта к камере начинаем чуть впереди объекта, чтобы сам объект не «прилипал» камеру
    const st = delta.subVectors(cam.pose.p, cam.pose.l), sl = st.length(); const from = eye.copy(cam.pose.l).addScaledVector(st.normalize(), Math.min(0.5, sl * 0.4));
    P = want.copy(cam.pose.p); L = cam.pose.l;
  }
  else {
    // приближение к плечу при замахе — слабое и очень плавное (v0.19)
    cam.aimK += ((aiming ? 1 : 0) - cam.aimK) * damp(2.5, dt);
    const k = cam.aimK * 0.5, N = p.bus?{dist:11.5,shoulder:.25,height:3.5}:cam.normal, A = cam.aim,anchor=p.bus?.g.position||p.pos;
    if (snap) { orbitPitch = cam.pitch; orbitYaw = cam.yaw; }
    else { orbitPitch += (cam.pitch - orbitPitch) * damp(30, dt); orbitYaw += (cam.yaw - orbitYaw) * damp(30, dt); }
    const dist = N.dist + (A.dist - N.dist) * k, shoulder = (N.shoulder + (A.shoulder - N.shoulder) * k) * Math.cos(Math.max(0, orbitPitch) * 0.8);
    const height = p.bus?3.5:Math.min(N.height + (A.height - N.height) * k, p.h + 0.3);
    eye.set(anchor.x,anchor.y+(p.bus?2.4:Math.min(1.35,p.h*.72)),anchor.z);
    const floorY = p.pos.y + 0.45; // всё ниже колен — «пол»: камера над ним скользит, а не упирается
    tgt.set(anchor.x,anchor.y+height,anchor.z); constrain(eye, tgt, radius, null, floorY);
    if (snap || !following) { piv.copy(tgt); following = true; } else piv.lerp(tgt, damp(18, dt));
    constrain(eye, piv, radius, null, floorY);
    dir.set(Math.sin(orbitYaw) * Math.cos(orbitPitch), Math.sin(orbitPitch), Math.cos(orbitYaw) * Math.cos(orbitPitch));
    sh.set(Math.cos(orbitYaw), 0, -Math.sin(orbitYaw));
    pv.copy(piv).addScaledVector(sh, castCamera(piv, sh, shoulder, radius, null, floorY));
    const d = castCamera(pv, dir, dist, radius, null, floorY);
    cam.curDist = d < cam.curDist ? d : cam.curDist + (d - cam.curDist) * damp(7, dt);
    want.copy(pv).addScaledVector(dir, cam.curDist);
    aboveGround(want, pv.y);
    constrain(eye, want, radius, null, floorY);
    P = want; L = tgt.copy(want).addScaledVector(dir, -20);
  }
  // Если стена придвинула камеру, сохраняем размер игровой области в кадре.
  const baseFov = CONFIG.camera.fov + (cam.pose ? 0 : (cam.fovAdd || 0));
  const fov = cam.pose
    ? Math.min(105, Math.atan(Math.tan(baseFov * Math.PI / 360) * cam.pose.p.distanceTo(L) / Math.max(0.1, P.distanceTo(L))) * 360 / Math.PI)
    : snap ? baseFov : camera.fov + (baseFov - camera.fov) * damp(10, dt);
  if (Math.abs(camera.fov - fov) > 0.001) { camera.fov = fov; camera.updateProjectionMatrix(); }
  // после миссии/крана камера плавно возвращается, дальше следует напрямую (сглаживание уже в piv)
  if (cam.pose) cam.blend = 0; else cam.blend = Math.min(1, (cam.blend ?? 1) + dt * 1.5);
  if (snap || cam.pose || cam.blend >= 1) { pos.copy(P); look.copy(L); }
  else { const f = damp(6, dt); pos.lerp(P, f); look.lerp(L, f); constrain(eye, pos, radius, null, p.pos.y + 0.45); }
  camera.position.copy(pos); camera.lookAt(look);
  if(snap||cam.pose)handoff=null;
  else if(handoff){handoff.t=Math.min(1,handoff.t+dt/1.2);const k=handoff.t*handoff.t*handoff.t*(handoff.t*(handoff.t*6-15)+10),q=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(P,L,camera.up));camera.position.lerpVectors(handoff.p,P,k);camera.quaternion.slerpQuaternions(handoff.q,q,k);pos.copy(camera.position);look.copy(pos).addScaledVector(camera.getWorldDirection(dir),20);if(handoff.t===1)handoff=null;}
  updateOcclusion(camera, cam.pose && cam.pose.l);
  // тряска: короткие пиксельные рывки, затухают сами
  if (cam.shake > 0.001 && !cam.pose) { const k = Math.min(.8,cam.shake) * 0.45; camera.position.x += (random() - 0.5) * k; camera.position.y += (random() - 0.5) * k; camera.rotation.z += (random() - 0.5) * k * 0.15; }

  // затухание зданий
  const target = cam.pose ? cam.pose.l : hit.set(p.pos.x, p.pos.y + 1.1, p.pos.z).clone();
  const rd = new V3().subVectors(target, camera.position), dist = rd.length(); rd.normalize();
  ray.set(camera.position, rd);
  const hp = new V3();
  for (const o of W.occluders) {
    if (o.inside) continue; // здания не просвечиваем: камера сама заходит внутрь
    let block = false;
    const ins = o.inside;
    if (ins && target.x > ins.x0 && target.x < ins.x1 && target.z > ins.z0 && target.z < ins.z1 && target.y > ins.y0 && target.y < ins.y1) block = true;
    else for (const b of o.boxes) { const q = ray.intersectBox(b, hp); if (q && camera.position.distanceTo(q) < dist - 0.3) { block = true; break; } }
    const w2 = block ? 0.18 : 1;
    if (o.op === w2) continue;
    o.op = Math.abs(o.op - w2) < 0.02 ? w2 : o.op + (w2 - o.op) * Math.min(1, (dt || 0.016) * 10);
    const tr = o.op < 0.99;
    for (const m of o.mats) { m.opacity = o.op; if (m.transparent !== tr) { m.transparent = tr; m.depthWrite = !tr; m.needsUpdate = true; } }
  }
}

return {state:cam,reset:resetCamera,update:updateCamera,
  resume(camera,{settled=false,distance=cam.normal.dist}={}){pos.copy(camera.position);look.copy(camera.position).addScaledVector(camera.getWorldDirection(dir),20);following=false;cam.curDist=distance;orbitPitch=cam.pitch;orbitYaw=cam.yaw;cam.blend=1;handoff=settled?null:{p:pos.clone(),q:camera.quaternion.clone(),t:0};if(settled){cam.aimK=0;cam.fovAdd=0;}}
};
}
const mainRig=createCameraRig();
export const cam=mainRig.state;
export const resetCamera=mainRig.reset;
export const resumeCamera=mainRig.resume;
export const updateCamera=mainRig.update;
export const camForward=()=>[-Math.sin(cam.yaw),-Math.cos(cam.yaw)];
