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
  // v0.53: «окружение» для отражений хрома, стекла и мокрого асфальта (небо → горизонт → земля + яркая полоса горизонта)
  envTop: { value: C(0x2a5ad8) }, envMid: { value: C(0xffa050) }, envLow: { value: C(0x04071a) }, envHi: { value: C(0xfff0d8) },
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
    a: 0x05103a, b: 0x2a5ad8, c: 0xffd6a0, rim: 0x9af0ff, rimK: .6, bands: 5, keepHue: .3, k: .95,
    fog: 0x1a2a6a, sky: [0x020418, 0x16247a, 0xff9a4a], hemi: [0xa0c0ff, 0x101a40, .8], env: [0x3a6aff, 0xff9a4a, 0x04071a, 0xfff2dc],
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
  if (v.env) { STYLE.envTop.value.setHex(v.env[0]); STYLE.envMid.value.setHex(v.env[1]); STYLE.envLow.value.setHex(v.env[2]); STYLE.envHi.value.setHex(v.env[3]); }
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
uniform vec3 uEnvTop, uEnvMid, uEnvLow, uEnvHi;
// окружение для отражений: небо, тёплый горизонт с яркой полосой, тёмная земля + две «софтбокс»-полосы (как студийный хром)
vec3 stEnv(vec3 r){ float y = r.y;
  vec3 c = y > 0.0 ? mix(uEnvMid, uEnvTop, smoothstep(0.0, 0.5, y)) : mix(uEnvMid * 0.3, uEnvLow, smoothstep(0.0, -0.3, y));
  c += uEnvHi * exp(-abs(y - 0.03) * 26.0) * 0.9;
  float az = atan(r.z, r.x); c += uEnvHi * 0.55 * smoothstep(0.93, 1.0, cos(az * 2.0 + 0.7)) * smoothstep(-0.05, 0.35, y);
  return c; }
float stHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
vec3 stHue(vec3 c, float h){ if (abs(h) < 0.001) return c; float a = h * 6.2831853; const mat3 toY = mat3(0.299,0.596,0.211, 0.587,-0.274,-0.523, 0.114,-0.322,0.312); const mat3 toR = mat3(1.0,1.0,1.0, 0.956,-0.272,-1.106, 0.621,-0.647,1.703);
  vec3 y = toY * c; float cs = cos(a), sn = sin(a); y.yz = vec2(y.y * cs - y.z * sn, y.y * sn + y.z * cs); return toR * y; }
`;
export const MC_BODY = `
#ifdef MC
  { vec3 wNn = normalize(inverseTransformDirection(normal, viewMatrix)), Vw = normalize(cameraPosition - vWLPos), Rw = reflect(-Vw, wNn);
    float frs = pow(1.0 - clamp(dot(wNn, Vw), 0.0, 1.0), 3.0); vec3 env = stEnv(Rw);
  #if MC == 1
    // хром: почти целиком отражение окружения, цвет материала — оттенок металла
    vec3 tint = mix(vec3(1.0), diffuseColor.rgb / max(max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)), 0.05), 0.6);
    float dl = dot(diffuseColor.rgb, vec3(0.333));
    outgoingLight = mix(outgoingLight, env * tint * (0.55 + dl * 0.6) + wlSpec * 1.4, 0.8);
  #elif MC == 2
    // стекло: тёмное тонированное, отражает окружение по Френелю, диагональные блики
    float st = smoothstep(0.86, 0.9, fract(dot(vWLPos, vec3(0.35, 0.28, 0.35)))) * 0.35;
    outgoingLight = outgoingLight * 0.6 + env * (0.18 + frs * 0.9) + wlSpec * 1.8 + uEnvHi * st * (0.4 + frs);
  #elif MC == 3
    // мокрый асфальт и полированный камень: отражение неба у горизонта и бликующие фонари
    outgoingLight = outgoingLight * (1.0 - 0.25 * MCG) + env * (0.015 + frs * 0.2) * MCG + wlSpec * 0.8 * MCG;
  #elif MC == 4
    // фасад: альфа текстуры = маска стекла (0.55 тёмное стекло, 0.8 горящее окно, 1 стена)
    float a = diffuseColor.a; float gm = 1.0 - smoothstep(0.88, 0.95, a); float litW = smoothstep(0.66, 0.74, a) * gm;
    float st = smoothstep(0.8, 0.86, fract(dot(vWLPos, vec3(0.31, 0.22, 0.31)))) * 0.5;
    vec3 glass = outgoingLight * 0.35 + env * (0.22 + frs * 0.8) + wlSpec * 1.6 + uEnvHi * st * 0.4;
    vec3 litC = diffuseColor.rgb * 1.05 + env * frs * 0.25;
    outgoingLight = mix(outgoingLight, mix(glass, litC, litW), gm);
  #elif MC == 5
    // лак / конфетная краска: прозрачный блестящий слой поверх цвета
    outgoingLight += env * frs * 0.7 + wlSpec * 0.9 + uEnvHi * pow(max(dot(Rw, normalize(vec3(0.3, 0.8, 0.2))), 0.0), 40.0) * 0.4;
  #endif
  }
#endif
`;
export const STYLE_BODY = `
  if (uStOn > 0.5) {
    // зерно по поверхностям (в мировых координатах, крупное «плёночное») и мягкий градиент по высоте
    outgoingLight *= 1.0 + (stHash(floor(vWLPos * 9.0)) - 0.5) * 0.09;
    outgoingLight *= mix(0.9, 1.08, smoothstep(-0.5, 9.0, vWLPos.y));
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
  uStA: STYLE.a, uStB: STYLE.b, uStC: STYLE.c, uStRim: STYLE.rim, uStDist: STYLE.dist,
  uEnvTop: STYLE.envTop, uEnvMid: STYLE.envMid, uEnvLow: STYLE.envLow, uEnvHi: STYLE.envHi });
// классы материалов: задаются у текстуры (texture.userData.mc) или у материала (material.userData.mc)
export const MC_ID = { chrome: 1, glass: 2, wet: 3, facade: 4, lacquer: 5 };
