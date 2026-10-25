import {buildCarwash} from '../carwash.js';
import { THREE, G, tmat, col, glow, lam,compose } from '../../core/gfx.js';
import { T } from '../../core/textures.js';
import { W } from '../state.js';
import { addZone } from '../physics.js';

// Заправка и стоянка: на навес — по лестнице на колонне, на магазин — по лестнице сбоку,
// витрина бьётся, автомойка отбрасывает, масляные лужи скользкие. Южная часть — автостоянка:
// по машинам можно прыгать, шлагбаум и будка охраны с креслом на колёсиках, кирпичная ограда ломается.
export default {
  id: 'gas', name: 'Заправка', ground: 'asphalt',
  build(b) {
    b.ground(3, 5, 19, 17, T.concrete(), 3);
    for (const [x, z] of [[4.5, 6], [17.5, 6], [4.5, 16], [17.5, 16]]) b.box(x, z, 0.45, 0.45, 4, col(0xd8d8e0));
    // Общий навес: фриз собран непересекающимися полосами, без ряби на красной вставке.
    const roof=b.prop(11,11),roofModel=compose('gas46-canopy',a=>{
      const red=lam({color:0xd8243a},'gas46-red',true),white=lam({color:0xf1e8ff},'gas46-white',true);a(G.box,red,0,4.225,0,14.5,.45,11.5);
      for(const[x,z,w,d]of[[0,-5.8,14.7,.14],[0,5.8,14.7,.14],[-7.3,0,.14,11.46],[7.3,0,.14,11.46]]){a(G.box,white,x,3.99,z,w,.28,d);a(G.box,red,x,4.21,z,w,.16,d);a(G.box,white,x,4.445,z,w,.31,d);}
      for(const z of[-3.5,3.5])a(G.box,white,0,4.50,z,14,.025,.5);
    });roof.add(roofModel);const roofMats=new Map();roofModel.traverse(o=>{if(!o.isMesh)return;const old=o.material;if(!roofMats.has(old)){const m=old.clone();m.onBeforeCompile=old.onBeforeCompile;m.customProgramCacheKey=old.customProgramCacheKey;roofMats.set(old,m);W.mapResources.add(m);}o.material=roofMats.get(old);});W.keep.push(roof);W.occluders.push({mats:[...roofMats.values()],boxes:[b.aabb(11,11,14.7,11.74,3.85,.75)],op:1,inside:null});
    b.solid(11,11,14.5,11.5,4,.45);
    for(const[x,z]of[[6.5,9.5],[15.5,12.5]]){b.box(x,z,1.2,1.2,.5,tmat(T.metal()),{y:4.45});b.m(G.box,col(0x2b2533),x,4.97,z,.9,.04,.9);}
    b.box(11,5.6,4.2,.3,1.1,tmat(T.sign('АЗС 24','#d8243a','#f1e8ff')),{y:4.45});
    const lightMat=new THREE.MeshBasicMaterial({color:0xffffff}),lights=new THREE.InstancedMesh(G.box,lightMat,12),matrix=new THREE.Object3D();lights.name='gas-edge-lights';lights.position.set(b.X(4),b.Y+4.33,b.Z(5.13));for(let i=0;i<12;i++)lights.setColorAt(i,new THREE.Color(i%2?0xf5c542:0xf1e8ff));b.g.add(lights);W.keep.push(lights);W.mapResources.add(lightMat);W.mapResources.add(lights);let lastLight=-1;W.animated.push((dt,t)=>{const phase=Math.floor(t*4)%2;if(phase===lastLight)return;lastLight=phase;for(let i=0;i<12;i++){matrix.position.set(i*1.27,0,0);matrix.scale.set(.12,(i+phase)%2===0?.08:0,.04);matrix.updateMatrix();lights.setMatrixAt(i,matrix.matrix);}lights.instanceMatrix.needsUpdate=true;});
    b.box(18.3, 16, 0.1, 0.7, 4, col(0x6a6d78)); b.ladder(18.35, 16, 'e', 4.45);
    b.zone('roof', 4.6, 6, 17.4, 16, 4.45);
    for (const z of [7.5, 14.5]) b.m(G.box, glow(0xfff1d0), 11, 3.94, z, 8, 0.035, 0.4);
    b.light(11, 11, 6);
    for (const z of [8.5, 13.5]) {
      b.box(11, z, 5, 1, 0.18, tmat(T.concrete()));
      for (const x of [9.4, 12.6]) {
        const mt = col(0xd8d8e0); b.box(x, z, 0.8, 0.55, 1.5, [mt, mt, mt, mt, tmat(T.fuelPump()), mt], { y: 0.18 }); b.m(G.box, col(0xd8243a), x, 1.75, z, 0.82, 0.12, 0.57);
        const curve = new THREE.CatmullRomCurve3([[0, 1.4, 0], [0.35, 0.9, 0], [0.32, 0.35, 0.03], [0.05, 0.38, 0.1], [0.05, 1.05, 0.2]].map(a => new THREE.Vector3(...a)));
        const hose = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.035, 4, false), col(0x1b1721)); hose.position.set(b.X(x + 0.43), b.Y, b.Z(z)); b.g.add(hose);W.mapResources.add(hose.geometry);
        const nozzle = b.m(G.box, col(0x24212b), x + 0.48, 1.12, z + 0.2, 0.08, 0.25, 0.1); nozzle.rotation.z = -0.3;
      }
    }
    b.car(11, 11, 0, 0x4a7ac8, 'hatch');
    b.house({ x: 20, z: 1, w: 10, d: 6, h: 3.2, wall: 0xd8d0c0, brick: false, lit: 0.9, door: { side: 's', at: 0.25 }, sign: ['МАГАЗИН', '#d8243a', '#f1e8ff'], floor: T.floorTile(),
      ladder: { side: 'e', at: 0.5 }, roof: true,
      interior(b, r) { b.shelf(r.x0 + 5, r.z0 + 2, 4, 0); b.box(r.x1 - 0.6, r.z1 - 1.8, 0.8, 2.4, 1.0, tmat(T.wood())); b.cabinet(r.x0 + 0.5, r.z0 + 0.4, 0.6, 0.6, 1.5, 0x3a3a40); b.safe(r.x1 - 0.5, r.z0 + 0.5, -Math.PI / 2); } });
    buildCarwash(b);
    b.slip(7, 26.3, 1.2); b.slip(17, 27, 1.0);
    for (let i = 0; i < 4; i++) b.m(G.cyl12, col(0x17111f), 19.2, 0.17 + i * 0.32, 25.6, 0.45, 0.3, 0.45);
    b.solid(19.2, 25.6, 0.9, 0.9, 0, 1.3);
    b.barrel(1.8, 2.5); b.barrel(2.8, 2.2); b.crate(2.3, 4.2, 1);
    b.tires(19.2, 8.4, 4); b.puddle(14, 20, 1); b.tires(19.2, 9.4, 3); b.trashBags(30.6, 8.6, 2); b.planter(23, 9.2, 2.2, 0.9, 0.4, 'flowers'); b.bollard(4.5, 17.5); b.bollard(17.5, 17.5);
    b.m(G.cyl6, col(0x2b2533), 2, 2.5, 9, 0.1, 5, 0.1); b.solid(2, 9, 0.3, 0.3, 0, 5);
    b.box(2, 9, 1.6, 0.2, 1.4, col(0xd8243a), { y: 4.2, solid: false }); b.sign(2, 4.9, 9.12, 0, '95  59.90', '#17111f', '#f5c542', 1.4, 0.4);
    b.lamp(19.6, 28.4, Math.PI);
    // автостоянка: ряд машин (по ним можно прыгать), будка охраны с креслом, шлагбаум, кирпичная ограда ломается
    for (let x = 1.5; x <= 16.5; x += 3) b.marking(x, 21.6, 0.12, 4.4);
    [[3, 0xf5c542, 'taxi'], [6, 0x3a7ac8, 'sedan'], [12, 0x6a8a5a, 'pickup'], [15, 0xc83a3a, 'hatch']].forEach(([x, c, ty], i) => b.car(x, 21.6, Math.PI / 2 + (i % 2 ? Math.PI : 0), c, ty));
    b.house({ x: 1, z: 27.6, w: 3.6, d: 3.4, h: 2.7, wall: 0xd8d0c0, brick: false, lit: 1, door: { side: 'n', at: 0.5 }, parapet: false,
      interior(b, r) { b.box((r.x0 + r.x1) / 2, r.z1 - 0.4, 2.4, 0.6, 0.85, tmat(T.wood())); b.m(G.box, tmat(T.screen()), (r.x0 + r.x1) / 2, 1.15, r.z1 - 0.3, 0.6, 0.45, 0.3); b.ride('chair', (r.x0 + r.x1) / 2, r.z1 - 1.4, 0); } });
    b.box(5.4, 29.6, 0.4, 0.4, 1.1, col(0x6a6d78)); b.m(G.box, glow(0xd8243a), 5.4, 1.25, 29.6, 0.15, 0.15, 0.15);
    b.m(G.box, tmat(T.stripe()), 8.4, 1.0, 29.6, 5.6, 0.12, 0.12); b.solid(8.4, 29.6, 5.6, 0.2, 0.92, 0.16);
    b.brickWall(16.5, 31.3, 7, 1.0, 'x', 0, { bw: 1, bh: 0.5 });
    { const mt = col(0x2a7ac8); b.box(16.5, 20.5, 0.7, 0.5, 1.4, [mt, mt, mt, mt, tmat(T.sign('ВОЗДУХ', '#2a7ac8', '#f1e8ff')), mt]); b.m(G.box, col(0x17111f), 16.85, 0.9, 20.5, 0.06, 0.06, 0.6); }
    { const ice = col(0xe8f0ff); b.box(27.5, 8.1, 1.6, 0.8, 1.1, [ice, ice, ice, ice, tmat(T.sign('ЛЁД', '#4ab0f0', '#f1e8ff')), ice]); }
    { const cage = lam({ map: T.chainlink(), alphaTest: 0.5, side: THREE.DoubleSide }, 'cageLink'); b.m(G.box, cage, 30.4, 0.75, 12.5, 1.0, 1.5, 2.4); b.solid(30.4, 12.5, 1.0, 2.4, 0, 1.5);
      for (const z of [11.7, 12.3, 12.9, 13.5]) { b.m(G.cyl8, col(0xd8243a), 30.4, 0.45, z, 0.18, 0.7, 0.18); b.m(G.sph, col(0xd8243a), 30.4, 0.82, z, 0.17, 0.12, 0.17); } }
    b.ground(21, 12.4, 31, 17.6, T.grass(), 2); b.tree(29.4, 16.2); b.picnic(25, 15, 0.1); b.bin(22.2, 16.8); b.planter(27.5, 12.8, 2.4, 0.8, 0.4, 'flowers');
    b.vending(19.45, 3, -Math.PI / 2); b.hydrant(19.6, 19.2);
    b.bin(11.8, 30.6); b.cone(12.5, 27.2); b.cone(13.5, 27.6);
    b.zone('floor', 5, 24.5, 20, 28.5); b.zone('floor', 17, 18, 20, 24); b.zone('floor', 20, 8.5, 31, 12);
    b.spawn(15, 26.5); b.spawn(9, 18.6);
    b.hw(() => { b.pumpkin(21, 8); b.web(4.5, 3.6, 6.3, 0, 1); });
  },
};
