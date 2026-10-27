import * as THREE from 'three';
/* v0.53 — общий стиль мира «PS1 + желе».
   Один шейдерный слой (gfx.js → ps1) перекрашивает ВСЕ освещённые поверхности сразу:
   яркость пикселя берётся по градиент-рампе из 3 цветов (тени → середина → свет) с мягкой «постерной»
   ступенчатостью, исходный оттенок текстуры частично сохраняется (детали остаются читаемыми).
   У каждого района свой сдвиг оттенка рампы. Плюс цветной туман/небо и параметры пост-обработки.
   Варианты — смелые направления для выбора автором. */
const C = h => new THREE.Color(h);
export const STYLE = {
  on: { value: 1 }, k: { value: 0.85 }, bands: { value: 4 }, keepHue: { value: 0.45 },
  a: { value: C(0x1a0b2e) }, b: { value: C(0xd8452e) }, c: { value: C(0xffe2b0) },
  rim: { value: C(0xff6aa8) }, rimK: { value: 0.35 },
  // районы: ox, oz, сдвиг оттенка (доли круга), насыщенность
  dist: { value: Array.from({ length: 12 }, () => new THREE.Vector4(1e5, 1e5, 0, 1)) }, distN: { value: 0 }, chunk: { value: 32 },
};
export const POST = { grain: { value: 0.07 }, ca: { value: 0.004 }, haloA: { value: C(0xffc890) }, haloB: { value: C(0xff4f9a) }, top: { value: C(0xe0d0ff) }, bot: { value: C(0xffd8b0) }, vig: { value: 0.7 } };

export const VARIANTS = [
  { id: 'sunset', name: 'Неоновый закат',
    // постеры «яблоко»: глубокий пурпур в тенях, горячий оранжево-красный, кремово-розовый свет
    a: 0x1c0a30, b: 0xe2452f, c: 0xffe6c0, rim: 0xff5aa0, rimK: .45, bands: 4, keepHue: .3, k: .95,
    fog: 0x5a1e48, sky: [0x12062a, 0x6a1e5a, 0xff7a3c], hemi: [0xffb08a, 0x3a1040, .8],
    post: { grain: .085, ca: .005, haloA: 0xffc070, haloB: 0xff3f8a, top: 0xd8c0ff, bot: 0xffc8a0, vig: .75 },
    shift: { yard: 0, park: -.04, plaza: .03, shops: .06, construction: -.02, cemetery: .5, gas: .1, market: -.03, school: .08,
      foodcourt: .9, sewer: .45, office: .62, port: .58, skatepark: .82, hospital: .4, factory: -.06, townhall: .05, university: .7, cinema: .88 } },
  { id: 'slime', name: 'Кислотное желе',
    // Slime Rancher / Splatoon: индиго-бирюзовые тени, конфетный розовый и лайм, молочно-белый свет
    a: 0x0d1a3a, b: 0x2fbfa8, c: 0xfff3fb, rim: 0xb6ff5a, rimK: .55, bands: 3, keepHue: .25, k: .95,
    fog: 0x2a3a7a, sky: [0x0a0c2e, 0x3a2a8a, 0x3ae0c8], hemi: [0xb0f0ff, 0x302060, .85],
    post: { grain: .06, ca: .006, haloA: 0xb6ff5a, haloB: 0x5ac8ff, top: 0xc8d8ff, bot: 0xffd0f0, vig: .6 },
    shift: { yard: 0, park: .12, plaza: -.08, shops: .55, construction: .2, cemetery: .3, gas: .62, market: .9, school: .7,
      foodcourt: .58, sewer: .25, office: -.15, port: -.05, skatepark: .8, hospital: .18, factory: .4, townhall: .66, university: .1, cinema: .5 } },
  { id: 'chrome', name: 'Хром и стекло',
    // холодный электрик-синий против янтаря, сильная хроматическая кайма и ореолы, как стеклянные постеры
    a: 0x05103a, b: 0x2a5ad8, c: 0xffc070, rim: 0x9af0ff, rimK: .6, bands: 5, keepHue: .3, k: .95,
    fog: 0x1a2a6a, sky: [0x020418, 0x16247a, 0xff9a4a], hemi: [0xa0c0ff, 0x101a40, .8],
    post: { grain: .07, ca: .009, haloA: 0xffb060, haloB: 0x5ab0ff, top: 0xb8c8ff, bot: 0xffc890, vig: .8 },
    shift: { yard: 0, park: .05, plaza: -.05, shops: .1, construction: .03, cemetery: .45, gas: -.08, market: .07, school: .15,
      foodcourt: .85, sewer: .4, office: -.03, port: .02, skatepark: .9, hospital: .35, factory: .12, townhall: -.1, university: .2, cinema: .8 } },
];
let current = 2; // «Хром и стекло» — выбор автора (27.10)
export const styleState = { get index() { return current; }, get variant() { return VARIANTS[current]; } };
try { const s = localStorage.getItem('friendslop.style2'); if (s != null && VARIANTS[+s]) current = +s; } catch { }

export function applyStyle(i = current, { scene, sky, hemi } = {}) {
  current = Math.max(0, Math.min(VARIANTS.length - 1, i | 0)); const v = VARIANTS[current];
  try { localStorage.setItem('friendslop.style2', String(current)); } catch { }
  STYLE.a.value.setHex(v.a); STYLE.b.value.setHex(v.b); STYLE.c.value.setHex(v.c); STYLE.rim.value.setHex(v.rim);
  STYLE.rimK.value = v.rimK; STYLE.bands.value = v.bands; STYLE.keepHue.value = v.keepHue; STYLE.k.value = v.k;
  for (const [k, val] of Object.entries(v.post)) { const u = POST[k]; if (!u) continue; if (u.value.isColor) u.value.setHex(val); else u.value = val; }
  if (scene?.fog) scene.fog.color.setHex(v.fog);
  if (scene?.background?.isColor) scene.background.setHex(v.fog);
  sky?.setColors?.(v.sky[0], v.sky[1], v.sky[2], v.fog, v.hemi[0]);
  if (hemi) { hemi.color.setHex(v.hemi[0]); hemi.groundColor.setHex(v.hemi[1]); }
  return v;
}
// районы текущей карты → сдвиги оттенка
export function setDistricts(list, chunk = 32) {
  const v = VARIANTS[current]; STYLE.chunk.value = chunk;
  list.slice(0, 12).forEach((d, i) => STYLE.dist.value[i].set(d.ox, d.oz, v.shift?.[d.id] ?? 0, 1));
  for (let i = list.length; i < 12; i++) STYLE.dist.value[i].set(1e5, 1e5, 0, 1);
  STYLE.distN.value = Math.min(12, list.length);
}

// GLSL: вставляется перед opaque_fragment во все освещённые материалы ps1
export const STYLE_HEAD = `uniform float uStOn, uStK, uStBands, uStKeep, uStRimK, uStDistN, uStChunk; uniform vec3 uStA, uStB, uStC, uStRim; uniform vec4 uStDist[12];
vec3 stHue(vec3 c, float h){ if (abs(h) < 0.001) return c; float a = h * 6.2831853; const mat3 toY = mat3(0.299,0.596,0.211, 0.587,-0.274,-0.523, 0.114,-0.322,0.312); const mat3 toR = mat3(1.0,1.0,1.0, 0.956,-0.272,-1.106, 0.621,-0.647,1.703);
  vec3 y = toY * c; float cs = cos(a), sn = sin(a); y.yz = vec2(y.y * cs - y.z * sn, y.y * sn + y.z * cs); return toR * y; }
`;
export const STYLE_BODY = `
  if (uStOn > 0.5) {
    float l = dot(outgoingLight, vec3(0.299, 0.587, 0.114));
    float lc = clamp(l * 1.15, 0.0, 1.0);
    float lb = mix(lc, floor(lc * uStBands + 0.5) / uStBands, 0.5);
    vec3 A = uStA, B = uStB, Cc = uStC; float sh = 0.0;
    for (int i = 0; i < 12; i++) { if (float(i) >= uStDistN) break; vec4 d = uStDist[i];
      if (vWLPos.x >= d.x && vWLPos.x < d.x + uStChunk && vWLPos.z >= d.y && vWLPos.z < d.y + uStChunk) { sh = d.z; break; } }
    if (sh != 0.0) { A = stHue(A, sh); B = stHue(B, sh); Cc = stHue(Cc, sh * 0.5); }
    vec3 ramp = lb < 0.5 ? mix(A, B, lb * 2.0) : mix(B, Cc, (lb - 0.5) * 2.0);
    // свой цвет объекта сохраняется в середине тонов (насыщеннее), а тени и свет уходят в цвета рампы —
    // как раздельное тонирование на постерах: тыква остаётся оранжевой, но тени у неё пурпурные
    vec3 hue = outgoingLight / max(l, 0.02); hue = clamp(mix(vec3(1.0), hue, 1.45), 0.0, 3.0);
    vec3 own = hue * lb * 1.05;
    float w = mix(uStKeep, 0.85, pow(abs(lb - 0.5) * 2.0, 1.2));
    vec3 styled = mix(own, ramp, w);
    // окрашенный ободок: силуэты читаются на фоне, как глянец на постерах
    vec3 Vd = normalize(vViewPosition); float fr = pow(1.0 - clamp(dot(normalize(normal), Vd), 0.0, 1.0), 3.0);
    styled += uStRim * fr * uStRimK * (0.3 + lb);
    outgoingLight = mix(outgoingLight, styled, uStK);
  }
`;
export const styleUniforms = () => ({ uStOn: STYLE.on, uStK: STYLE.k, uStBands: STYLE.bands, uStKeep: STYLE.keepHue, uStRimK: STYLE.rimK, uStDistN: STYLE.distN, uStChunk: STYLE.chunk,
  uStA: STYLE.a, uStB: STYLE.b, uStC: STYLE.c, uStRim: STYLE.rim, uStDist: STYLE.dist });
