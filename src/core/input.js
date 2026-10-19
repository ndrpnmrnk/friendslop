import { THREE, canvas } from './gfx.js';

export const keys = {};
const pressed = new Set();
export const mouse = { x: innerWidth / 2, y: innerHeight / 2, left: false, right: false, nx: 0, ny: 0 };
const handlers = { down: [], up: [], move: [], key: [] };
export const on = (ev, fn) => handlers[ev].push(fn);

addEventListener('keydown', e => {
  if (!keys[e.code]) pressed.add(e.code);
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  handlers.key.forEach(f => f(e.code));
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.left = mouse.right = false; });
export const tapped = code => pressed.has(code);
export const endFrame = () => pressed.clear();

function setPos(e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.nx = e.clientX / innerWidth * 2 - 1; mouse.ny = -(e.clientY / innerHeight) * 2 + 1; }
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  setPos(e);
  if (e.button === 0) mouse.left = true;
  if (e.button === 2) mouse.right = true;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  handlers.down.forEach(f => f(e.button));
});
addEventListener('pointermove', e => { setPos(e); handlers.move.forEach(f => f()); });
addEventListener('pointerup', e => {
  setPos(e);
  if (e.button === 0) mouse.left = false;
  if (e.button === 2) mouse.right = false;
  handlers.up.forEach(f => f(e.button));
});

export const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
export function aim(camera) { ndc.set(mouse.nx, mouse.ny); ray.setFromCamera(ndc, camera); return ray; }
