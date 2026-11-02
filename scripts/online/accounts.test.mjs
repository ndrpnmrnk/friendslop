import test from 'node:test';
import assert from 'node:assert/strict';
// v0.64-v0.65: вход через Discord (Discord подменён в раннере), профиль, сохранение, выход.
const HTTP=(process.env.ROOMS_TEST_URL||'ws://127.0.0.1:8788/ws').replace(/^ws/,'http').replace(/\/ws$/,'');
const GAME='https://friendslop-6h1.pages.dev/';
const H=t=>({authorization:'Bearer '+t,origin:'https://friendslop-6h1.pages.dev','content-type':'application/json'});
async function login(i){
  const start=await fetch(HTTP+'/auth/discord?return='+encodeURIComponent(GAME),{redirect:'manual'});
  const loc=new URL(start.headers.get('location'));
  const back=(await fetch(HTTP+'/auth/discord/callback?code=code'+i+'&state='+encodeURIComponent(loc.searchParams.get('state')),{redirect:'manual'})).headers.get('location')||'';
  return {loc,back,token:/#fs_auth=([\w-]+)/.exec(back)?.[1]};
}
test('Discord login returns to the game with a session; foreign return and forged state are rejected',async()=>{
  const {loc,back,token}=await login(1);
  assert.equal(loc.host,'discord.com');assert.equal(loc.searchParams.get('scope'),'identify');
  assert.ok(back.startsWith(GAME)&&token);
  assert.equal((await fetch(HTTP+'/auth/discord?return='+encodeURIComponent('https://evil.example/'),{redirect:'manual'})).status,400);
  assert.equal((await fetch(HTTP+'/auth/discord/callback?code=x&state=AAA.BBB',{redirect:'manual'})).status,400);
});
test('profile: Discord name and avatar, progress shared by two browsers, custom name kept, logout',async()=>{
  const a=(await login(2)).token,b=(await login(2)).token;
  let p=await (await fetch(HTTP+'/account',{headers:H(a)})).json();
  assert.equal(p.name,'Игрок 2');assert.match(p.avatar,/^https:\/\/cdn\.discordapp\.com\//);
  const data={'friendslop.collection.v1':JSON.stringify({version:1,coins:120,unlocked:['cat','shark'],selected:'shark'})};
  p=await (await fetch(HTTP+'/account',{method:'PUT',headers:H(a),body:JSON.stringify({data})})).json();assert.equal(p.rev,1);
  p=await (await fetch(HTTP+'/account',{headers:H(b)})).json();assert.equal(JSON.parse(p.data['friendslop.collection.v1']).coins,120);
  await fetch(HTTP+'/account',{method:'PUT',headers:H(b),body:JSON.stringify({name:'Свой ник'})});await login(2);
  assert.equal((await (await fetch(HTTP+'/account',{headers:H(a)})).json()).name,'Свой ник');
  await fetch(HTTP+'/account/logout',{method:'POST',headers:H(a)});
  assert.equal((await fetch(HTTP+'/account',{headers:H(a)})).status,401);
  assert.equal((await fetch(HTTP+'/account',{headers:H(b)})).status,200);
});
test('first login in a browser merges guest progress instead of losing it',async()=>{
  globalThis.localStorage??={getItem:()=>null,setItem(){},removeItem(){}};globalThis.sessionStorage??=globalThis.localStorage;globalThis.location??={search:'',hash:'',pathname:'/',origin:'http://localhost',href:'http://localhost/'};
  const {mergeProgress}=await import('../../src/net/account.js');
  const local={'friendslop.collection.v1':JSON.stringify({version:1,coins:30,unlocked:['cat','frog'],selected:'frog'}),'friendslop.parkourBest':'28.1'};
  const remote={'friendslop.collection.v1':JSON.stringify({version:1,coins:90,unlocked:['cat','shark'],selected:'shark'}),'friendslop.parkourBest':'31.5'};
  const out=mergeProgress(local,remote),c=JSON.parse(out['friendslop.collection.v1']);
  assert.deepEqual([...c.unlocked].sort(),['cat','frog','shark']);assert.equal(c.coins,90);assert.equal(c.selected,'shark');
  assert.equal(out['friendslop.parkourBest'],'28.1');assert.equal(out['friendslop.skin'],'shark');
});
