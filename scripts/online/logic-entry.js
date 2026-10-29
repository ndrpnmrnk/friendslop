// Управляемые кадры только в dev CPU-тесте: облачный браузер может душить rAF вложенных вкладок.
if(new URLSearchParams(location.search).has('testFrames')){
 let next=0;const callbacks=new Map();
 globalThis.requestAnimationFrame=fn=>{callbacks.set(++next,fn);return next;};
 globalThis.cancelAnimationFrame=id=>callbacks.delete(id);
 globalThis.__stepTestFrame=()=>{const pending=[...callbacks.values()];callbacks.clear();for(const fn of pending)fn(performance.now());};
}
const boot=document.createElement('pre');boot.id='logic-boot';boot.textContent='Loading CPU modules';document.body.prepend(boot);
addEventListener('error',e=>boot.textContent+='\nERROR '+e.message);
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
try{await import('../../src/main.js?net-logic-test');}catch(e){boot.textContent+='\nBOOT ERROR '+e.stack;throw e;}
boot.textContent='Main ready';
const [net,match,items,missions,physics,ride,drone]=await Promise.all([import('../../src/net/net.js?net-logic-test'),
  import('../../src/net/match-sync.js?net-logic-test'),import('../../src/game/items.js?net-logic-test'),
  import('../../src/missions/missions.js?net-logic-test'),import('../../src/world/physics.js?net-logic-test'),import('../../src/game/ride.js?net-logic-test'),import('../../src/game/drone.js?net-logic-test')
]);
const world=await import('../../src/world/state.js?net-logic-test'),actors=await import('../../src/game/actors.js?net-logic-test');
const grabs=await import('../../src/game/grab.js?net-logic-test');
globalThis.__onlineTestModules={net,match,items,missions,physics,ride,drone,world,actors,grabs};

const[audio,mic,radio,spatial]=await Promise.all([import('../../src/core/sfx.js?net-logic-test'),import('../../src/core/mic.js?net-logic-test'),import('../../src/game/radio.js?net-logic-test'),import('../../src/core/spatial-audio.js?net-logic-test')]);Object.assign(globalThis.__onlineTestModules,{audio,mic,radio,spatial});

const input=await import('../../src/core/input.js?net-logic-test');Object.assign(globalThis.__onlineTestModules,{input});
const camera=await import('../../src/game/camera.js?net-logic-test');Object.assign(globalThis.__onlineTestModules,{camera});
