// Только CPU-сцена теста: настоящие THREE-геометрия, raycast, физика и DOM; GPU отсутствует.
globalThis.__fsMockRenderer = class {
  domElement = document.createElement('canvas');
  capabilities = { getMaxAnisotropy: () => 1, maxTextureSize: 4096 };
  shadowMap = {};
  info = { memory: { geometries: 0, textures: 0 }, render: { calls: 0, triangles: 0 }, programs: [], reset() {} };
  setPixelRatio() {} setSize(w,h) { this.domElement.width=w;this.domElement.height=h; }
  compile() {} render(s,c) {s.updateMatrixWorld(true);c.updateMatrixWorld(true);}
  setRenderTarget(t) {this.target=t;} getRenderTarget() {return this.target;}
  readRenderTargetPixels(_t,_x,_y,_w,_h,p) {p.fill(0);}
  clearDepth() {} getScissorTest() {return false;} setScissorTest() {} setViewport() {} setScissor() {}
  getViewport(v) {return v.set(0,0,480,300);} getScissor(v) {return v.set(0,0,480,300);}
  getContext() {return{isContextLost:()=>false,getExtension:()=>null,getParameter:()=>''};}
};
globalThis.__noRender=true;
await import('../../src/main.js?net-logic-test');
const [net,match,items,missions,physics,ride,drone]=await Promise.all([import('../../src/net/net.js?net-logic-test'),
  import('../../src/net/match-sync.js?net-logic-test'),import('../../src/game/items.js?net-logic-test'),
  import('../../src/missions/missions.js?net-logic-test'),import('../../src/world/physics.js?net-logic-test'),import('../../src/game/ride.js?net-logic-test'),import('../../src/game/drone.js?net-logic-test')
]);
globalThis.__onlineTestModules={net,match,items,missions,physics,ride,drone};
