import { THREE, canvas } from './gfx.js';

export const keys = {};
const pressed = new Set();
export const mouse = { x: innerWidth / 2, y: innerHeight / 2, left: false, right: false, nx: 0, ny: 0 };
// Захват мыши для камеры: движение мыши крутит камеру, прицел — в центре экрана
export const look = { dx: 0, dy: 0 };
export const lock = { want: () => false };
export const locked = () => document.pointerLockElement === canvas;
export function unlock() { mouse.left=mouse.right=false;look.dx=look.dy=0;if (locked()) document.exitPointerLock(); }
// захват мыши без отдельного клика: вызывается из любого действия пользователя (клик по кнопке, нажатие клавиши)
export function requestLock() { if (!lock.want() || locked()) return; try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (_) {} }
const handlers = { down: [], up: [], move: [], key: [], wheel: [] };
// колёсико мыши (сила броска); страницу не прокручиваем
addEventListener('wheel', e => { if (!handlers.wheel.length) return; e.preventDefault(); handlers.wheel.forEach(f => f(Math.sign(e.deltaY))); }, { passive: false });
export const on = (ev, fn) => handlers[ev].push(fn);

addEventListener('keydown', e => {
  if (!keys[e.code]) pressed.add(e.code);
  keys[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  // во время игры клавиши достаются только игре (кроме F5/F11/F12)
  if (lock.want() && !/^F(5|11|12)$/.test(e.code)) e.preventDefault();
  // захват потерян (Alt-Tab и т.п.) — любая клавиша, кроме Esc, возвращает его
  if (lock.want() && !locked() && e.code !== 'Escape') requestLock();
  handlers.key.forEach(f => f(e.code));
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.left = mouse.right = false; });
export const tapped = code => pressed.has(code);
export const endFrame = () => pressed.clear();

function setPos(e) {
  if (locked()) { mouse.x = innerWidth / 2; mouse.y = innerHeight / 2; mouse.nx = 0; mouse.ny = 0; return; }
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.nx = e.clientX / innerWidth * 2 - 1; mouse.ny = -(e.clientY / innerHeight) * 2 + 1;
}
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', e => {
  if (!locked() && lock.want()) { requestLock(); return; }
  setPos(e);
  if (e.button === 0) mouse.left = true;
  if (e.button === 2) mouse.right = true;
  try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
  handlers.down.forEach(f => f(e.button));
});
addEventListener('pointermove', e => { if (locked()) { look.dx += e.movementX || 0; look.dy += e.movementY || 0; } setPos(e);
  // вторая кнопка, нажатая при уже зажатой первой («аккорд»), приходит только как pointermove — ловим её здесь
  // (например, ЛКМ во время замаха ПКМ — отмена броска)
  if ((mouse.left || mouse.right) && (e.target === canvas || locked())) { const L = (e.buttons & 1) !== 0, Rb = (e.buttons & 2) !== 0;
    if (L !== mouse.left) { mouse.left = L; handlers[L ? 'down' : 'up'].forEach(f => f(0)); }
    if (Rb !== mouse.right) { mouse.right = Rb; handlers[Rb ? 'down' : 'up'].forEach(f => f(2)); } }
  handlers.move.forEach(f => f(e)); });
export const takeLook = () => { const d = { dx: look.dx, dy: look.dy }; look.dx = look.dy = 0; return d; };
addEventListener('pointerup', e => {
  setPos(e);
  // кнопку уже «отпустили» через аккорд в pointermove — второй раз не шлём
  if ((e.button === 0 && !mouse.left) || (e.button === 2 && !mouse.right)) return;
  if (e.button === 0) mouse.left = false;
  if (e.button === 2) mouse.right = false;
  handlers.up.forEach(f => f(e.button));
});

export const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
export function aim(camera) { ndc.set(mouse.nx, mouse.ny); ray.setFromCamera(ndc, camera); return ray; }
