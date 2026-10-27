import * as THREE from 'three';
import { CONFIG } from '../config.js';
import {graphics,onGraphics} from './quality.js';
import {batchBegin,batchEnd} from './batch.js';
import {WL,disableWL} from './wl-uniforms.js';
import {STYLE_HEAD,STYLE_BODY,MC_BODY,MC_ID,styleUniforms,POST} from './style.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

THREE.ColorManagement.enabled = false;
export { THREE };
export const V3 = THREE.Vector3;

/* ---------- Рендер + PS1 ---------- */
export const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setPixelRatio(1);
// Тени: жёсткие пиксельные (как в играх конца 90-х), карта теней ездит за игроком
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.shadowMap.autoUpdate=false;
export const canvas = renderer.domElement;
document.getElementById('game').appendChild(canvas);

const rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
const silhouetteRT=new THREE.WebGLRenderTarget(4,4,{minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter});
export const SNAP = { value: new THREE.Vector2(256, 144) };

// Дрожание вершин в стиле PS1: проекция вершины округляется до сетки экрана
export function ps1(m, stable = false) {
  m.userData.ps1Stable = stable;
  const mcOf = () => { const c = m.userData.mc ?? m.map?.userData?.mc; return c ? [MC_ID[c] || 0, m.userData.gloss ?? m.map?.userData?.gloss ?? 0.6] : null; };
  m.customProgramCacheKey = () => { const c = mcOf(); return (stable ? 'ps1-stable-v53b' : 'ps1-distance-v53b') + (m.userData.jelly ? '-jelly' : '') + (c ? '-mc' + c[0] + '_' + c[1] : ''); };
  m.onBeforeCompile = sh => {
    sh.uniforms.uSnap = SNAP;
    const lit = sh.fragmentShader.includes('#include <lights_fragment_end>');
    sh.vertexShader = 'uniform vec2 uSnap;\n' + (lit ? 'varying vec3 vWLPos;\n' : '') + sh.vertexShader.replace('#include <project_vertex>',
      `#include <project_vertex>
      vec4 sp = gl_Position;
      // Полы и разметка стабильны; вдали дрожание плавно исчезает и на пропсах.
      float jitter = ${stable ? '0.0' : '(1.0 - smoothstep(8.0, 32.0, -mvPosition.z))'};
      if (sp.w > 0.0) sp.xy = mix(sp.xy, floor(sp.xy / sp.w * uSnap + 0.5) / uSnap * sp.w, jitter);
      gl_Position = sp;` + (lit ? `
      vec4 wlp = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
      wlp = instanceMatrix * wlp;
      #endif
      vWLPos = (modelMatrix * wlp).xyz;` : ''));
    if (lit) {
      Object.assign(sh.uniforms, { uWLOn: WL.on, uWLMax: WL.max, uWLGrid: WL.grid, uWLLights: WL.lights, uWLMask: WL.mask, uWLOrigin: WL.origin, uWLGridSize: WL.gridSize, uWLCell: WL.cell,
        uWLMaskInv: WL.maskInv, uWLBase: WL.base, uWLIndoor: WL.indoor, uWLAo: WL.aoK, uWLK: WL.lightK, uDynP: WL.dynP, uDynC: WL.dynC });
      Object.assign(sh.uniforms, styleUniforms());
      const c = mcOf(), def = c ? `#define MC ${c[0]}\n#define MCG ${c[1].toFixed(3)}\n#define MCX ${c[0] === 3 ? '220.0' : c[0] === 1 ? '48.0' : '72.0'}\n` : '';
      sh.fragmentShader = def + WL_HEAD + STYLE_HEAD + sh.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + WL_BODY).replace('#include <opaque_fragment>', MC_BODY + STYLE_BODY + '#include <opaque_fragment>');
      if (m.userData.jelly) { sh.uniforms.uJelly = { value: m.userData.jelly }; sh.uniforms.uTime = WL.time;
        sh.fragmentShader = 'uniform float uJelly; uniform float uTime;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', JELLY + '#include <opaque_fragment>'); }
    }
  };
  return m;
}
/* Свет мира (world/world-light.js): AO у стен и предметов, «небо» внутри зданий слабее,
   до 8 ближайших видимых источников на клетку 1×1 м + 4 вспышки эффектов. */
/* «Желе» (v0.52): по краю силуэта перелив оранжевый → розовый → голубой, мягкий блик сверху, лёгкое свечение.
   Интерактивное и персонажи «блестят», фон остаётся матовым. Сила — userData.jelly (0..1). */
const JELLY = `
  { vec3 Vd = normalize(vViewPosition), Nn = normalize(normal); float fr = pow(1.0 - clamp(dot(Nn, Vd), 0.0, 1.0), 2.2);
    float hue = fr * 1.6 + vWLPos.y * 0.35 + uTime * 0.15;
    vec3 iri = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + hue));
    iri = mix(vec3(1.0, 0.55, 0.3), iri, 0.65);
    vec3 H = normalize(Vd + vec3(0.0, 0.8, 0.25)); float sp = pow(max(dot(Nn, H), 0.0), 24.0);
    outgoingLight = outgoingLight * (1.0 + 0.12 * uJelly) + iri * fr * 0.55 * uJelly + vec3(1.0, 0.95, 0.9) * sp * 0.35 * uJelly; }
`;
const WL_HEAD = `varying vec3 vWLPos; uniform float uWLOn, uWLMax, uWLCell, uWLBase, uWLIndoor, uWLAo, uWLK; uniform vec2 uWLOrigin, uWLGridSize, uWLMaskInv;
uniform highp sampler2D uWLGrid; uniform highp sampler2D uWLLights; uniform sampler2D uWLMask; uniform vec4 uDynP[4]; uniform vec3 uDynC[4];
`;
const WL_BODY = `
  vec3 wlSpec = vec3(0.0);
  {
    vec3 wN = inverseTransformDirection(normal, viewMatrix), wP = vWLPos, acc = vec3(0.0);
    #ifdef MC
    vec3 wV = normalize(cameraPosition - wP);
    #endif
    float aoF = 1.0, sky = 1.0; vec3 skyT = vec3(1.0);
    if (uWLOn > 0.5) {
      vec4 mk = texture2D(uWLMask, (wP.xz + wN.xz * 0.22 - uWLOrigin) * uWLMaskInv);
      float hgt = wP.y - uWLBase;
      // затенение у основания стен и предметов, вверх сходит на нет; под землёй своё
      aoF = mix(1.0, mix(mk.r, 1.0, smoothstep(0.1, 1.9, hgt)), step(-0.6, hgt) * uWLAo);
      float roofY = mk.g * 48.0;
      float inside = max(step(0.05, roofY) * step(wP.y, roofY - 0.25), step(hgt, -0.8));
      sky = mix(1.0, uWLIndoor, inside);
      skyT = mix(vec3(1.0), vec3(1.08, 0.9, 0.78), inside);
      ivec2 gc = ivec2(floor((wP.xz - uWLOrigin) / uWLCell));
      if (gc.x >= 0 && gc.y >= 0 && float(gc.x) < uWLGridSize.x && float(gc.y) < uWLGridSize.y) {
        vec4 ia = texelFetch(uWLGrid, ivec2(gc.x * 2, gc.y), 0), ib = texelFetch(uWLGrid, ivec2(gc.x * 2 + 1, gc.y), 0);
        float ids[8] = float[8](ia.x, ia.y, ia.z, ia.w, ib.x, ib.y, ib.z, ib.w);
        for (int k = 0; k < 8; k++) {
          if (ids[k] < 0.0 || float(k) >= uWLMax) break;
          int ii = int(ids[k] + 0.5);
          vec4 lp = texelFetch(uWLLights, ivec2(ii, 0), 0), lb = texelFetch(uWLLights, ivec2(ii, 2), 0);
          if (wP.y < lb.x || wP.y > lb.y) continue;
          vec3 L = lp.xyz - wP; float d = length(L), a = clamp(1.0 - d / lp.w, 0.0, 1.0); a *= a;
          #ifdef MC
          { vec3 Hh = normalize(L / max(d, 1e-3) + wV); float aw = clamp(1.0 - d / (lp.w * 1.8), 0.0, 1.0); wlSpec += texelFetch(uWLLights, ivec2(ii, 1), 0).rgb * aw * pow(max(dot(wN, Hh), 0.0), MCX) * 1.6; }
          #endif
          if (a <= 0.0) continue;
          float nl = clamp(dot(wN, L / max(d, 1e-3)) * 0.85 + 0.15, 0.0, 1.0);
          vec3 lcol = texelFetch(uWLLights, ivec2(ii, 1), 0).rgb;
          acc += lcol * a * nl;
        }
      }
    }
    for (int k = 0; k < 4; k++) { vec4 p = uDynP[k]; vec3 L = p.xyz - wP; float d = length(L), a = clamp(1.0 - d / p.w, 0.0, 1.0); a *= a;
      acc += uDynC[k] * a * clamp(dot(wN, L / max(d, 1e-3)) * 0.7 + 0.3, 0.0, 1.0);
      #ifdef MC
      wlSpec += uDynC[k] * a * pow(max(dot(wN, normalize(L / max(d, 1e-3) + wV)), 0.0), 32.0);
      #endif
    }
    acc /= 1.0 + max(acc.r, max(acc.g, acc.b)) * 0.12; // мягкий потолок: у самой лампы не выжигает
    reflectedLight.indirectDiffuse *= aoF * sky * skyT;
    reflectedLight.directDiffuse *= mix(1.0, aoF, 0.6);
    reflectedLight.directDiffuse += BRDF_Lambert(diffuseColor.rgb) * acc * uWLK * mix(1.0, aoF, 0.45);
  }
`;

// Постобработка: дизеринг Bayer 4x4 и урезанная палитра
const post = new THREE.ShaderMaterial({
  uniforms: { t: { value: rt.texture },silhouette:{value:silhouetteRT.texture},outlineOn:{value:0}, px: { value: new THREE.Vector2(1 / 256, 1 / 144) }, glowK: { value: 1 },glowSteps:{value:4},punch:{value:0},velocity:{value:0},time:{value:0},style:{value:1},grainK:POST.grain,caK:POST.ca,haloA:POST.haloA,haloB:POST.haloB,gTop:POST.top,gBot:POST.bot,vigK:POST.vig },
  vertexShader: 'varying vec2 v; void main(){ v = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
  fragmentShader: `uniform sampler2D t;uniform sampler2D silhouette;uniform float outlineOn; uniform vec2 px; uniform float glowK;uniform float glowSteps;uniform float punch;uniform float velocity;uniform float time;uniform float style;uniform float grainK,caK,vigK;uniform vec3 haloA,haloB,gTop,gBot; varying vec2 v;
    float b2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
    float b4(vec2 a){ return b2(0.5 * a) * 0.25 + b2(a); }
    vec3 bright(vec2 o){ vec3 s = texture2D(t, v + o).rgb; return max(s - 0.74, 0.0); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main(){
      // v0.52 «PS1 + желе»: RGB-сдвиг растёт к краям кадра и на ударах (как на постерах)
      vec2 q0 = v - 0.5; float ca = (caK + punch * 0.006 + velocity * 0.002) * style * smoothstep(0.1, 0.75, length(q0));
      vec3 c = vec3(texture2D(t, v + q0 * ca * 1.6).r, texture2D(t, v).g, texture2D(t, v - q0 * ca * 1.6).b);
      // свечение ярких мест (фонари, окна, огоньки)
      vec3 g = vec3(0.0);
      for (int i = 0; i < 8; i++) { if(float(i)>=glowSteps)break;float a = float(i) * 6.2831853/glowSteps; vec2 d = vec2(cos(a), sin(a));
        g += bright(d * px * 3.0) * 0.6 + bright(d * px * 7.0) * 0.4; }
      // ореол: свечение тёплое в центре и розово-пурпурное по краю (халация плёнки)
      vec3 halo = mix(haloA, haloB, clamp(length(g) * 0.6, 0.0, 1.0));
      c += g * (0.24*8.0/glowSteps) * glowK * mix(vec3(1.0, 0.85, 0.7), halo, style);
      // сумеречная цветокоррекция: тени в сливовый, свет в тёплый
      float l = dot(c, vec3(0.299, 0.587, 0.114));
      c = mix(c * vec3(0.92, 0.9, 1.06), c * vec3(1.06, 1.0, 0.92), smoothstep(0.2, 0.8, l)) + vec3(0.012, 0.006, 0.02);
      // v0.51: киношный контраст — мягкая S-кривая, тени холоднее, свет теплее и чуть насыщеннее
      vec3 sc = clamp(c, 0.0, 1.0); c = mix(c, sc * sc * (3.0 - 2.0 * sc), 0.32);
      float l2 = dot(c, vec3(0.299, 0.587, 0.114)); c = mix(vec3(l2), c, 1.0 + 0.18 * smoothstep(0.25, 0.7, l2));
      // градиентная тонировка кадра: сверху холодный пурпур, снизу тёплый янтарь (мягко, как радиальный градиент постера)
      c *= mix(vec3(1.0), mix(gBot, gTop, smoothstep(0.05, 0.95, v.y)) * 1.08, style * 0.6);
      // виньетка
      vec2 q = v - 0.5; c *= 1.0 - dot(q, q) * vigK;
      // Мягкий подъём тёмных деталей, без плоской общей засветки.
      c += vec3(.015,.012,.014)*(1.0-smoothstep(.0,.22,l));
      float edge=smoothstep(.25,.68,length(q));c+=edge*punch*vec3(.09,.035,.012);
      c+=edge*velocity*.018*vec3(.42,.57,.75);
      // плёночное зерно: сильнее в полутонах, слабее в чёрном и белом
      { float gn = hash(floor(v / px) + fract(time * 7.13) * 91.7) - 0.5; float lm = dot(c, vec3(0.3, 0.59, 0.11)); c += gn * grainK * style * (0.35 + lm * (1.0 - lm) * 2.4); }
      // палитра как у PS1: 5 бит на канал (32 уровня) с дизерингом Bayer 4×4
      c += (b4(floor(v / px)) - 0.46875) / 32.0; c = floor(c * 31.0 + 0.5) / 31.0;
      if(outlineOn>0.5){float center=texture2D(silhouette,v).r;float edge=0.0;for(int i=0;i<8;i++){float a=float(i)*0.785398;edge=max(edge,texture2D(silhouette,v+vec2(cos(a),sin(a))*px*1.4).r);}c=mix(c,vec3(.96,.77,.26),step(.5,edge)*(1.0-step(.5,center)));}
      gl_FragColor = vec4(c, 1.0); }`,
  depthTest: false, depthWrite: false,
});
const postScene = new THREE.Scene(), postCam = new THREE.Camera();
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post); quad.frustumCulled = false; postScene.add(quad);

const silhouetteMat=ps1(new THREE.MeshBasicMaterial({color:0xffffff,fog:false,side:THREE.DoubleSide}));
const overlays=new Set();
export function registerOverlay(root){root.traverse(o=>{o.layers.set(31);o.userData.noOcc=true;});overlays.add(root);return()=>overlays.delete(root);}
let lastShadow=-Infinity,qualityRevision=0;
const sceneQuality=new WeakMap();
onGraphics(()=>{qualityRevision++;lastShadow=-Infinity;resize();});
export function setActionVisuals(speed=0,impact=0){post.uniforms.velocity.value=Math.min(1,Math.max(0,speed));post.uniforms.punch.value=Math.min(1,Math.max(0,impact));}
// Компиляция шейдеров заранее (после генерации карты): без подвисаний при первом появлении предметов и эффектов.
export function warmup(scene,camera){batchBegin(scene,camera,true);try{renderer.compile(scene,camera);}finally{batchEnd();}}
export function present(scene, camera, outlineTarget=null) {
  const quality=graphics.current,now=performance.now();
  if(sceneQuality.get(scene)!==qualityRevision){scene.traverse(o=>{if(o.isLight&&o.shadow){const sh=o.shadow;if(sh.mapSize.x!==quality.shadow){sh.mapSize.set(quality.shadow,quality.shadow);sh.map?.dispose();sh.map=null;}}});sceneQuality.set(scene,qualityRevision);}
  renderer.shadowMap.needsUpdate=now-lastShadow>1000/quality.shadowHz;if(renderer.shadowMap.needsUpdate)lastShadow=now;
  post.uniforms.glowSteps.value=graphics.key==='low'?2:graphics.key==='medium'?4:8;post.uniforms.time.value=now*.001;WL.time.value=now*.001;
  if(scene.userData.wl)scene.userData.wl.apply();else disableWL();WL.max.value=quality.wl??8;
  renderer.setRenderTarget(rt); batchBegin(scene,camera); try{renderer.render(scene, camera);}finally{batchEnd();}
  post.uniforms.outlineOn.value=outlineTarget?1:0;
  if(outlineTarget){const marked=[],layers=camera.layers.mask,bg=scene.background,override=scene.overrideMaterial,shadow=renderer.shadowMap.autoUpdate;
    outlineTarget.traverse(o=>{if(o.isMesh&&o.visible&&!o.userData.noOutline&&o.name!=='character-shadow'){marked.push([o,o.layers.mask]);o.layers.enable(2);}});
    try{camera.layers.set(2);scene.background=new THREE.Color(0);scene.overrideMaterial=silhouetteMat;renderer.shadowMap.autoUpdate=false;renderer.setRenderTarget(silhouetteRT);renderer.render(scene,camera);}
    finally{camera.layers.mask=layers;scene.background=bg;scene.overrideMaterial=override;renderer.shadowMap.autoUpdate=shadow;for(const[o,mask]of marked)o.layers.mask=mask;}
  }
  renderer.setRenderTarget(null); renderer.render(postScene, postCam);
  // Отдельный последний проход: ни прозрачность мира, ни частицы не перекрывают фото.
  if(overlays.size){const layers=camera.layers.mask,bg=scene.background,auto=renderer.autoClear;
    try{camera.layers.set(31);scene.background=null;renderer.autoClear=false;renderer.clearDepth();renderer.render(scene,camera);}
    finally{camera.layers.mask=layers;scene.background=bg;renderer.autoClear=auto;}
  }
}

export const cameras = [];
export function makeCamera(fov) { const c = new THREE.PerspectiveCamera(fov, 1, 0.12, 220); cameras.push(c); resize(); return c; }
export function resize() {
  const quality=graphics.current,s=Math.max(quality.scale,innerWidth/quality.width),w=Math.ceil(innerWidth/s),h=Math.ceil(innerHeight/s);
  renderer.setSize(w, h, false); rt.setSize(w, h);silhouetteRT.setSize(w,h); SNAP.value.set(w, h); post.uniforms.px.value.set(1 / w, 1 / h);
  for (const c of cameras) { c.aspect = innerWidth / innerHeight; c.updateProjectionMatrix(); }
}
addEventListener('resize', resize);

/* ---------- Материалы ---------- */
const MC = new Map();
export function lam(opts, key, stable = false) {
  if (key && MC.has(key)) return MC.get(key);
  const m = ps1(new THREE.MeshLambertMaterial(opts), stable);
  if (key) MC.set(key, m);
  return m;
}
// v0.53: плоский цвет сам выбирает класс материала: тёмное «железо» и яркая краска — лак, светлые серые — хром
const DARKS = new Set([0x2b2533, 0x17111f, 0x3a3440, 0x17141c, 0x2a2232, 0x23202a, 0x292331, 0x241a30, 0x3a3046, 0x272332]);
const _hsl = {};
export function mcOfColor(c) {
  if (DARKS.has(c)) return 'lacquer';
  new THREE.Color(c).getHSL(_hsl);
  if (_hsl.s < 0.12 && _hsl.l > 0.3 && _hsl.l < 0.92) return 'chrome';
  if (_hsl.s > 0.45 && _hsl.l > 0.2) return 'lacquer';
  return null;
}
export const col = c => { const k = 'c' + c; if (MC.has(k)) return MC.get(k); const m = lam({ color: c }, k), mc = mcOfColor(c); if (mc) m.userData.mc = mc; return m; };
export const tmat = (t,extra)=>{const m=lam({map:t,...(extra||{})},extra||t.userData.transient?null:'t'+t.uuid);if(t.userData.transient)t.mapResources?.add(m);return m;};
// «стабильный» материал для больших стен и полов: без дрожания вершин (иначе длинные стены «плывут» рябью)
export const smat=t=>{const m=lam({map:t},t.userData.transient?null:'s'+t.uuid,true);if(t.userData.transient)t.mapResources?.add(m);return m;};
export const basic = c => MC.get('b' + c) || (MC.set('b' + c, ps1(new THREE.MeshBasicMaterial({ color: c }))), MC.get('b' + c));
export const glow = c => lam({ color: c, emissive: c, emissiveIntensity: 0.9 }, 'g' + c);
export const alphaMat = (t, opts = {}) => ps1(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, ...opts }));
// Плоскости, лежащие на других поверхностях (пол, дорожки), чтобы не мерцали
export const flat = t => lam({ map: t, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }, 'f' + t.uuid, true);
export const paint = c => lam({ color: c, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 }, 'paint' + c, true);
// v0.52: «желейная» копия материала (перелив по краю, блик). Кешируется по исходному материалу и силе.
const JM = new Map();
// градиент с зерном вместо плоского цвета: светлее сверху, глубже и насыщеннее снизу, лёгкий «перелив» оттенка
const GT = new Map();
function gradTex(hex) {
  let t = GT.get(hex); if (t) return t;
  const c = document.createElement('canvas'); c.width = 16; c.height = 32; const g = c.getContext('2d');
  const base = new THREE.Color(hex), hi = base.clone().lerp(new THREE.Color(1, .93, .82), .28), lo = base.clone().multiplyScalar(.62); const hsl = {}; lo.getHSL(hsl); lo.setHSL((hsl.h + .97) % 1, Math.min(1, hsl.s * 1.25), hsl.l);
  const gr = g.createLinearGradient(0, 0, 0, 32); gr.addColorStop(0, '#' + hi.getHexString()); gr.addColorStop(.55, '#' + base.getHexString()); gr.addColorStop(1, '#' + lo.getHexString());
  g.fillStyle = gr; g.fillRect(0, 0, 16, 32);
  const im = g.getImageData(0, 0, 16, 32); for (let i = 0; i < im.data.length; i += 4) { const n = (Math.random() - .5) * 26; im.data[i] += n; im.data[i + 1] += n; im.data[i + 2] += n; } g.putImageData(im, 0, 0);
  t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.NoColorSpace; GT.set(hex, t); return t;
}
export function jellyMat(m, k = 0.8, grad = false) {
  if (!m || Array.isArray(m) || !m.isMeshLambertMaterial || m.userData.jelly) return m;
  const key = m.uuid + '|' + k + '|' + grad; let j = JM.get(key);
  if (!j) { j = m.clone(); j.userData = { ...m.userData, jelly: k };
    if (grad && !m.map && !m.vertexColors && !(m.emissive && m.emissiveIntensity > .4)) { j.map = gradTex(m.color.getHex()); j.color.setRGB(1, 1, 1); }
    ps1(j, !!m.userData.ps1Stable); JM.set(key, j); }
  return j;
}
export function jellify(root, k = 0.8, grad = false) { root.traverse(o => { if (o.isMesh && !o.userData.noJelly && o.geometry.attributes.uv) o.material = Array.isArray(o.material) ? o.material.map(x => jellyMat(x, k, grad)) : jellyMat(o.material, k, grad); }); return root; }
// v0.53 «Хром и стекло»: готовые материалы классов
const mcMat = (m, mc) => { m.userData.mc = mc; return m; };
export const chrome = (c = 0xdfe4ff) => mcMat(lam({ color: c }, 'chrome53' + c), 'chrome');
export const glassMC = (c = 0x8ab0f0, op = 0.45) => mcMat(lam({ color: c, transparent: true, opacity: op, depthWrite: false }, 'glass53' + c + '_' + op), 'glass');
export const lacq = c => mcMat(lam({ color: c }, 'lacq53' + c), 'lacquer');
// Уникальный материал (для объектов, которые затухают, когда закрывают игрока)
export const own = (opts) => ps1(new THREE.MeshLambertMaterial(opts));

/* ---------- Геометрия ---------- */
export const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl5: new THREE.CylinderGeometry(1, 1, 1, 5), cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8), cyl12: new THREE.CylinderGeometry(1, 1, 1, 12),
  cone4: new THREE.ConeGeometry(1, 1, 4), cone6: new THREE.ConeGeometry(1, 1, 6), cone8: new THREE.ConeGeometry(1, 1, 8),
  sph: new THREE.SphereGeometry(1, 8, 6), sphL: new THREE.SphereGeometry(1, 7, 5), sph10: new THREE.SphereGeometry(1, 10, 7),
  ico: new THREE.IcosahedronGeometry(1, 0), plane: new THREE.PlaneGeometry(1, 1),
  ring: new THREE.RingGeometry(0.8, 1, 16), beam: new THREE.CylinderGeometry(1, 1, 1, 12, 1, true),
  disc: new THREE.CircleGeometry(1, 12), torus: new THREE.TorusGeometry(1, 0.3, 4, 10),
  pipe: new THREE.CylinderGeometry(1, 1, 1, 8, 1, true), pipeRim: new THREE.RingGeometry(0.8, 1, 8),
  halfTorus: new THREE.TorusGeometry(1, 0.12, 4, 10, Math.PI),
};

/* v0.53: «игрушечная» коробка со скошенными рёбрами (44 треугольника, плоские грани) — у предметов вместо
   острых кубов; глянец и перелив «желе» ложатся на фаски. UV как у BoxGeometry, чтобы надписи не отражались. */
function chamferBox(b) {
  const pts = [], h = .5, i = .5 - b;
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) pts.push(new THREE.Vector3(x * i, y * i, z * h), new THREE.Vector3(x * i, y * h, z * i), new THREE.Vector3(x * h, y * i, z * i));
  const g = new ConvexGeometry(pts), p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let k = 0; k < p.count; k++) { const nx = n.getX(k), ny = n.getY(k), nz = n.getZ(k), ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz), x = p.getX(k), y = p.getY(k), z = p.getZ(k); let u, v;
    if (ax >= ay && ax >= az) { u = nx > 0 ? .5 - z : z + .5; v = y + .5; } else if (ay >= az) { u = x + .5; v = ny > 0 ? .5 - z : z + .5; } else { u = nz > 0 ? x + .5 : .5 - x; v = y + .5; }
    uv[k * 2] = u; uv[k * 2 + 1] = v; }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
export const CHAMFER = chamferBox(.12);
export const ROUND = { on: false };
let parent = null;
export const setParent = p => { parent = p; };
export function mesh(geo, m, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, p = parent) {
  if (ROUND.on && geo === G.box && !Array.isArray(m)) geo = CHAMFER;
  const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  if (p) p.add(o);
  return o;
}

// Проекция «фото» спереди: передняя половина берёт материал 0, задняя — материал 1
export function frontBack(geo, split = 0) {
  geo = geo.clone();
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  geo.computeBoundingBox();
  const bb = geo.boundingBox, w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - bb.min.x) / w, (pos.getY(i) - bb.min.y) / h);
  const idx = geo.index.array, front = [], back = [];
  for (let t = 0; t < idx.length; t += 3) {
    const cz = (pos.getZ(idx[t]) + pos.getZ(idx[t + 1]) + pos.getZ(idx[t + 2])) / 3;
    (cz > split ? front : back).push(idx[t], idx[t + 1], idx[t + 2]);
  }
  geo.setIndex([...front, ...back]); geo.clearGroups();
  geo.addGroup(0, front.length, 0); geo.addGroup(front.length, back.length, 1);
  return geo;
}

/* Сборка детальной модели из примитивов в одну геометрию на материал.
   Модель собирается один раз (по ключу), дальше копии делят геометрию: десятки деталей —
   всего несколько отрисовок. add(geo, mat, x, y, z, sx, sy, sz, rx, ry, rz) */
const COMP = new Map(), _m4 = new THREE.Matrix4(), _q4 = new THREE.Quaternion(), _e4 = new THREE.Euler(), _p4 = new THREE.Vector3(), _s4 = new THREE.Vector3();
export function compose(key, fn) {
  let parts = COMP.get(key);
  if (!parts) {
    const by = new Map();
    fn((geo, mat, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => {
      if (ROUND.on && geo === G.box) geo = CHAMFER;
      let g = geo.index ? geo.toNonIndexed() : geo.clone();
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
      g.clearGroups();
      _m4.compose(_p4.set(x, y, z), _q4.setFromEuler(_e4.set(rx, ry, rz)), _s4.set(sx, sy, sz)); g.applyMatrix4(_m4);
      if (sx * sy * sz < 0) { const a = g.attributes; for (const k of ['position', 'normal', 'uv']) { const at = a[k], it = at.itemSize, arr = at.array; for (let i = 0; i < at.count; i += 3) for (let j = 0; j < it; j++) { const t = arr[(i + 1) * it + j]; arr[(i + 1) * it + j] = arr[(i + 2) * it + j]; arr[(i + 2) * it + j] = t; } } }
      let l = by.get(mat); if (!l) by.set(mat, l = []); l.push(g);
    });
    parts = [...by].map(([mat, list]) => ({ mat, geo: mergeGeometries(list, false) }));
    COMP.set(key, parts);
  }
  const g = new THREE.Group();
  for (const p of parts) { const m = new THREE.Mesh(p.geo, p.mat); m.castShadow = !p.mat.transparent; m.receiveShadow = true; g.add(m); }
  return g;
}

export function sprite(tex, size, opts = {}) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, ...opts }));
  s.scale.set(size, size, 1); return s;
}

// сила свечения ярких мест: в мини-играх ослабляем (v0.21 — стол с напёрстками не «светится»)
export function setGlow(k) { post.uniforms.glowK.value = k*graphics.current.bloom; }
