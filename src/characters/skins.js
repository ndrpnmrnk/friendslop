import { THREE, G, mesh, tmat, col, lam, frontBack, basic, glow } from '../core/gfx.js';
import { T } from '../core/textures.js';
import { COATS } from '../game/cats.js';

/* Скины меняют только внешний вид. Размеры: котик чуть выше и тоньше,
   телевизор и акула чуть шире и ниже. Хитбокс и скорость у всех одинаковые. */
const ginger = { ...COATS[0], name: 'skinGinger', base: '#d89a5a', light: '#f2cfa0', dark: '#a8682e', eye: '#9aa870' };

let headGeo, sharkGeo, frogGeo;
export const SKINS = {
  cat: {
    name: 'Котик',
    build({ head, torso, handL, handR, footL, footR }) {
      const fur = tmat(T.fur(ginger)), faces = { open: tmat(T.catFace(ginger, 'open')), closed: tmat(T.catFace(ginger, 'closed')) };
      headGeo = headGeo || frontBack(new THREE.SphereGeometry(1, 7, 5), 0.2);
      const h = new THREE.Mesh(headGeo, [faces.open, fur]); h.scale.set(0.6, 0.46, 0.46); h.position.set(0, 1.28, 0.02); head.add(h);
      head.userData = { h, faces };
      // уши торчат в стороны, как на референсе
      for (const s of [-1, 1]) { const e = mesh(G.cone4, fur, s * 0.42, 1.62, 0, 0.22, 0.5, 0.1, head); e.rotation.z = -s * 0.6; mesh(G.cone4, col(0xe8a8a0), s * 0.42, 1.6, 0.06, 0.12, 0.32, 0.04, head).rotation.z = -s * 0.6; }
      const tb = mesh(G.cyl6, fur, 0, 0.62, 0, 0.3, 0.62, 0.24, torso); tb.rotation.y = Math.PI / 6;
      // светлая грудка — плоская накладка на тело, без шаров
      const chest = mesh(G.plane, lam({ map: T.catChest(), transparent: true, alphaTest: 0.05 }), 0, 0.66, 0.225, 0.34, 0.44, 1, torso); chest.userData.noOutline = true;
      // хвост из трёх сегментов, загнут вверх
      const t1 = new THREE.Group(); t1.position.set(0, 0.42, -0.2); torso.add(t1); t1.rotation.x = -0.5;
      mesh(G.box, fur, 0, 0, -0.16, 0.08, 0.08, 0.32, t1);
      const t2 = new THREE.Group(); t2.position.z = -0.3; t1.add(t2); t2.rotation.x = -0.7; mesh(G.box, fur, 0, 0, -0.13, 0.07, 0.07, 0.26, t2);
      const t3 = new THREE.Group(); t3.position.z = -0.24; t2.add(t3); t3.rotation.x = -0.6; mesh(G.box, tmat(T.fur({ ...ginger, name: 'tip', base: '#a8682e' })), 0, 0, -0.08, 0.06, 0.06, 0.16, t3);
      torso.userData.tail = [t1, t2, t3];
      const pad = col(0xe8a0a0);
      for (const hd of [handL, handR]) { mesh(G.box, fur, 0, 0, 0, 0.15, 0.13, 0.17, hd); mesh(G.box, pad, 0, -0.066, 0.02, 0.09, 0.01, 0.08, hd); for (const o of [-0.045, 0, 0.045]) mesh(G.box, col(0x3a2418), o, -0.02, 0.086, 0.012, 0.05, 0.005, hd); }
      for (const ft of [footL, footR]) { mesh(G.box, fur, 0, 0.06, 0.04, 0.17, 0.12, 0.24, ft); mesh(G.box, pad, 0, 0.001, 0.05, 0.1, 0.004, 0.12, ft); }
      return { top: 1.82, handX: 0.43, handY: 0.62, handZ: 0.08, footX: 0.15, footY: 0, holdX: 0.26, holdY: 1.0, holdZ: 0.42, shadow: 0.45 };
    },
    face(c, e) { const u = c.head.userData; u.h.material[0] = e === 'blink' || e === 'dizzy' ? u.faces.closed : u.faces.open; },
  },
  tv: {
    name: 'Телевизор',
    build({ head, handL, handR, footL, footR }) {
      const bodyT = tmat(T.tvBody()), bez = tmat(T.tvBezel()), dk = col(0x22243a);
      mesh(G.box, [bodyT, bodyT, bodyT, dk, bez, bodyT], 0, 0.8, 0.05, 1.12, 0.92, 0.72, head);
      mesh(G.box, bodyT, 0, 0.82, -0.45, 0.82, 0.68, 0.36, head);
      const scr = mesh(G.plane, basic(0xffffff), 0, 0.85, 0.415, 0.86, 0.6, 1, head);
      scr.material = new THREE.MeshBasicMaterial({ map: T.tvScreen('idle') });
      head.userData = { scr };
      // вентиляция по бокам и ручки настройки
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) mesh(G.box, dk, sx * 0.565, 0.98 - i * 0.09, -0.05, 0.01, 0.03, 0.4, head);
      mesh(G.cyl8, col(0x8a8ea8), 0.36, 0.42, 0.42, 0.045, 0.04, 0.045, head).rotation.x = Math.PI / 2;
      mesh(G.cyl8, col(0x8a8ea8), 0.47, 0.42, 0.42, 0.045, 0.04, 0.045, head).rotation.x = Math.PI / 2;
      mesh(G.box, glow(0x9be36b), -0.42, 0.42, 0.43, 0.04, 0.03, 0.01, head);
      for (const s of [-1, 1]) { const a = mesh(G.cyl5, dk, s * 0.18, 1.42, -0.2, 0.025, 0.42, 0.025, head); a.rotation.z = -s * 0.5; mesh(G.sph, col(0xff5a6e), s * 0.29, 1.62, -0.2, 0.05, 0.05, 0.05, head); }
      const glove = tmat(T.glove());
      for (const hd of [handL, handR]) { mesh(G.box, glove, 0, 0, 0, 0.22, 0.22, 0.24, hd); mesh(G.box, glove, 0, 0.04, -0.17, 0.18, 0.16, 0.12, hd); }
      const pencil = mesh(G.cyl6, col(0xe8b030), 0, 0.22, 0.02, 0.04, 0.42, 0.04, handR); pencil.rotation.z = 0.25;
      mesh(G.cone6, col(0xd8b890), -0.06, 0.47, 0.02, 0.04, 0.1, 0.04, handR).rotation.z = 0.25;
      mesh(G.cone6, col(0x1a1a1a), -0.075, 0.53, 0.02, 0.015, 0.04, 0.015, handR).rotation.z = 0.25;
      const sn = tmat(T.sneaker());
      for (const ft of [footL, footR]) { mesh(G.box, sn, 0, 0.1, 0.06, 0.24, 0.18, 0.36, ft); mesh(G.box, col(0xf0f0f0), 0, 0.02, 0.06, 0.26, 0.05, 0.38, ft); }
      return { top: 1.4, handX: 0.72, handY: 0.62, handZ: 0.05, footX: 0.26, footY: 0, holdX: 0.32, holdY: 0.95, holdZ: 0.62, shadow: 0.7 };
    },
    face(c, e) { const s = c.head.userData.scr; s.material.map = T.tvScreen(e === 'idle' ? 'idle' : e); },
  },
  shark: {
    name: 'Акула',
    build({ head, handL, handR, footL, footR }) {
      const face = tmat(T.sharkFace()), skin = tmat(T.sharkSkin());
      sharkGeo = sharkGeo || frontBack(new THREE.SphereGeometry(1, 10, 7), 0.25);
      const b = new THREE.Mesh(sharkGeo, [face, skin]); b.scale.set(0.62, 0.66, 0.58); b.position.y = 0.8; head.add(b);
      const fin = mesh(G.cone4, skin, 0, 1.52, -0.22, 0.12, 0.42, 0.3, head); fin.rotation.x = -0.45;
      // жабры
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) { const gl = mesh(G.box, col(0x3a4a70), sx * 0.555, 0.78 - i * 0.02, 0.12 - i * 0.1, 0.01, 0.22, 0.02, head); gl.rotation.y = sx * 0.5; }
      const tail = mesh(G.cone4, skin, 0, 0.72, -0.72, 0.1, 0.42, 0.3, head); tail.rotation.x = -1.6;
      // наушники
      const hp = tmat(T.headphone());
      const band = mesh(G.halfTorus, hp, 0, 1.0, -0.02, 0.66, 0.6, 0.8, head);
      for (const s of [-1, 1]) { const cup = mesh(G.cyl12, hp, s * 0.64, 1.0, 0, 0.16, 0.14, 0.16, head); cup.rotation.z = Math.PI / 2; mesh(G.cyl12, col(0x22c0a0), s * 0.72, 1.0, 0, 0.1, 0.02, 0.1, head).rotation.z = Math.PI / 2; }
      for (const [hd, s] of [[handL, -1], [handR, 1]]) { const f = mesh(G.cone4, skin, 0, 0, 0, 0.12, 0.38, 0.22, hd); f.rotation.z = s * 2.2; }
      for (const ft of [footL, footR]) { const fl = mesh(G.sph, skin, 0, 0.07, 0.1, 0.17, 0.07, 0.26, ft); }
      return { top: 1.62, handX: 0.78, handY: 0.66, handZ: 0, footX: 0.22, footY: 0, holdX: 0.3, holdY: 0.95, holdZ: 0.72, shadow: 0.7 };
    },
  },
  // Лягушка-рептилоид в камуфляжной кепке: зелёная морда с белыми глазами, рубашка хаки с кожаной портупеей,
  // наплечник, зелёные ладони в рукавах, ботинки с горящими пряжками
  frog: {
    name: 'Рептилоид',
    build({ head, torso, handL, handR, footL, footR }) {
      const skin = tmat(T.frogSkin()), faces = { open: tmat(T.frogFace('open')), closed: tmat(T.frogFace('closed')), wow: tmat(T.frogFace('wow')) };
      frogGeo = frogGeo || frontBack(new THREE.SphereGeometry(1, 8, 6), 0.15);
      const h = new THREE.Mesh(frogGeo, [faces.open, skin]); h.scale.set(0.58, 0.44, 0.5); h.position.set(0, 1.18, 0.02); head.add(h);
      // глаза-бугры сверху морды
      for (const s of [-1, 1]) mesh(G.sph, skin, s * 0.26, 1.42, 0.16, 0.16, 0.12, 0.14, head);
      // камуфляжная кепка с чёрной лентой и козырьком
      const camo = tmat(T.camo()), band = col(0x17111f);
      mesh(G.cyl8, camo, 0, 1.6, -0.02, 0.48, 0.24, 0.44, head); mesh(G.cyl8, camo, 0, 1.73, -0.02, 0.42, 0.06, 0.38, head);
      mesh(G.cyl8, band, 0, 1.5, -0.02, 0.5, 0.06, 0.46, head);
      mesh(G.box, camo, 0, 1.49, 0.44, 0.5, 0.04, 0.22, head).rotation.x = 0.12;
      mesh(G.box, glow(0xff8a1f), -0.2, 1.66, 0.39, 0.08, 0.06, 0.02, head);
      // язык (показывается в idle-«фишке»)
      const tongue = mesh(G.box, col(0xd85a7a), 0, 1.04, 0.44, 0.1, 0.03, 0.3, head); tongue.visible = false;
      head.userData = { h, faces, tongue };
      // тело: рубашка хаки, портупея, наплечник
      const shirt = tmat(T.frogShirt());
      const tb = mesh(G.cyl8, shirt, 0, 0.56, 0, 0.32, 0.6, 0.26, torso); tb.rotation.y = Math.PI / 8;
      mesh(G.box, col(0x3a3440), -0.3, 0.8, -0.02, 0.18, 0.12, 0.3, torso);
      mesh(G.box, col(0x6a6d78), 0, 0.24, 0, 0.6, 0.08, 0.48, torso);
      mesh(G.box, col(0x5a3a24), 0, 0.29, 0, 0.62, 0.05, 0.5, torso);
      for (const hd of [handL, handR]) { mesh(G.box, shirt, 0, 0.07, -0.04, 0.17, 0.1, 0.17, hd); mesh(G.box, skin, 0, -0.03, 0.02, 0.15, 0.12, 0.16, hd); for (const o of [-0.05, 0, 0.05]) mesh(G.box, skin, o, -0.06, 0.12, 0.04, 0.05, 0.06, hd); }
      const boot = tmat(T.boot());
      for (const ft of [footL, footR]) { mesh(G.box, col(0x4a4a52), 0, 0.2, 0.0, 0.16, 0.1, 0.18, ft); mesh(G.box, boot, 0, 0.08, 0.05, 0.19, 0.16, 0.28, ft); mesh(G.box, glow(0xffa030), 0.1, 0.11, 0.06, 0.02, 0.05, 0.06, ft); }
      return { top: 1.78, handX: 0.5, handY: 0.6, handZ: 0.08, footX: 0.17, footY: 0, holdX: 0.28, holdY: 0.98, holdZ: 0.48, shadow: 0.52 };
    },
    face(c, e) { const u = c.head.userData; u.h.material[0] = e === 'blink' || e === 'dizzy' ? u.faces.closed : e === 'wow' ? u.faces.wow : u.faces.open; },
  },
};
export const SKIN_IDS = Object.keys(SKINS);
