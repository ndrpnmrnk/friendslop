// Индивидуальный PS1-дизеринг: общие материалы других персонажей не затрагиваются.
const states=new WeakMap();
export function characterFade(root,value){
 let state=states.get(root);if(!state){const uniform={value:1},cache=new Map();
  root.traverse(o=>{if(!o.isMesh||o.name==='character-shadow')return;const clone=m=>{if(cache.has(m))return cache.get(m);const n=m.clone(),before=m.onBeforeCompile,key=m.customProgramCacheKey();n.onBeforeCompile=shader=>{before.call(n,shader);shader.uniforms.uModelFade=uniform;shader.fragmentShader='uniform float uModelFade;\n'+shader.fragmentShader.replace(/void main\(\)\s*\{/,`void main() {
    vec2 fp=floor(gl_FragCoord.xy),hp=floor(fp*.5);float threshold=fract(dot(hp,vec2(.5,hp.y*.75)))*.25+fract(dot(fp,vec2(.5,fp.y*.75)));
    if(uModelFade<=threshold)discard;`);};n.customProgramCacheKey=()=>key+'-model-fade48';cache.set(m,n);return n;};o.material=Array.isArray(o.material)?o.material.map(clone):clone(o.material);});
  state={uniform};states.set(root,state);
 }state.uniform.value=Math.max(0,Math.min(1,value));
}
