import * as THREE from 'three';
// Общие uniform-ы «света мира» (world/world-light.js). Сцена без своей карты света (хаб, меню) выключает их.
const empty = new THREE.DataTexture(new Float32Array([-1, -1, -1, -1]), 1, 1, THREE.RGBAFormat, THREE.FloatType); empty.needsUpdate = true;
const white = new THREE.DataTexture(new Uint8Array([255, 0, 0, 255]), 1, 1, THREE.RGBAFormat); white.needsUpdate = true;
export const WL = {
  on: { value: 0 }, max: { value: 8 }, grid: { value: empty }, lights: { value: empty }, mask: { value: white },
  origin: { value: new THREE.Vector2() }, gridSize: { value: new THREE.Vector2(1, 1) }, cell: { value: 1 }, maskInv: { value: new THREE.Vector2(1, 1) },
  count: { value: 1 }, base: { value: 0.15 },
  // сколько «неба» остаётся внутри зданий и под навесами
  indoor: { value: 0.32 }, aoK: { value: 1 }, lightK: { value: 1 },
  // до 4 вспышек (взрывы, фейерверки, огонь): xyz + радиус, цвет * сила
  dynP: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, -999, 0, 1)) }, dynC: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) },
};
export function disableWL() { WL.on.value = 0; WL.grid.value = empty; WL.lights.value = empty; WL.mask.value = white; }
