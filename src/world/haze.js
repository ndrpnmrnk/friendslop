import { THREE } from '../core/gfx.js';
/* v0.57 — лёгкая дымка у земли: три огромных горизонтальных слоя (0.5, 1.3 и 2.4 м) с мягким шумом в мировых
   координатах, медленно плывут. Почти прозрачные, рядом с камерой исчезают (нет «полосы» при проходе сквозь слой),
   вдали растворяются в тумане. 3 вызова отрисовки на весь мир. */
const VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const FS = `varying vec3 vW; uniform float uT, uA, uK, uR; uniform vec3 uC, uCam;
  float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
  void main(){ vec2 p = vW.xz * uK + vec2(uT * .021, uT * .013);
    float m = n(p) * .55 + n(p * 2.3 + 7.1 - uT * .015) * .3 + n(p * 5.1 - 3.7) * .15;
    float d = distance(vW, uCam), near = smoothstep(2.5, 11.0, d), far = 1.0 - smoothstep(70.0, 120.0, d);
    float a = uA * smoothstep(.32, .78, m) * near * far * (1.0 - smoothstep(uR - 10.0, uR, length(vW.xz))); if (a < .004) discard; gl_FragColor = vec4(uC, a); }`;
// radius — дымка только в круге вокруг (0,0): в хабе это летающий остров, за краем дымки нет
export function createHaze(scene, color = 0x8a80b0, strength = 1, radius = 1e5) {
  const g = new THREE.Group(); g.name = 'haze'; scene.add(g); const mats = [];
  for (const [y, a, k] of [[.5, .085, .045], [1.3, .06, .03], [2.4, .04, .022]]) {
    const m = new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, fog: false,
      uniforms: { uT: { value: 0 }, uA: { value: a * strength }, uK: { value: k }, uR: { value: radius }, uC: { value: new THREE.Color(color) }, uCam: { value: new THREE.Vector3() } } });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(260, 260), m); mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.renderOrder = 1; mesh.frustumCulled = false; mesh.userData.noOcc = true; mesh.userData.noBatch = true;
    g.add(mesh); mats.push(m);
  }
  return {
    group: g,
    update(t, camera, base = 0) { g.position.set(Math.round(camera.position.x / 20) * 20, base, Math.round(camera.position.z / 20) * 20);
      for (const m of mats) { m.uniforms.uT.value = t; m.uniforms.uCam.value.copy(camera.position); } },
    set(k) { g.visible = k > 0; },
  };
}
