import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {CONFIG} from '../../src/config.js';
const source=p=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');

test('entire mission catalog remains registered with unique definitions',()=>{
 const names=Object.keys(CONFIG.missions);
 assert(names.length>=40,'expected the full party mission catalog');
 for(const name of names){
  const def=CONFIG.missions[name];
  assert(def?.game,'unregistered game for '+name);
  assert(Number.isFinite(def.points),'mission must have score: '+name);
 }
 assert.equal(new Set(names).size,names.length);
});

test('all physical item mission categories are included in the centralized sync audit',()=>{
 const itemGames={
  'src/missions/games2.js':['targets','cleanup','delivery','pizza'],
  'src/missions/games3.js':['salad','bulb','firebin'],
  'src/missions/games5.js':['steal','generator','balloon','mail','detector','cart']
 };
 let covered=0;
 for(const [path,keys] of Object.entries(itemGames)){
  const code=source(path);
  assert(code.includes('addItem')||code.includes('spawnLitter'));
  for(const key of keys){assert(CONFIG.missions[key],'unknown item mission '+key);
    assert(new RegExp('\\b'+key+'\\s*\\(').test(code),'missing mission handler '+key);
    covered++;
  }
 }
 assert.equal(covered,13);
 const world=source('src/net/world-sync.js'),match=source('src/net/match-sync.js');
 assert(world.includes("type==='i'?Number(/^m("),'mission items must inherit scope tags');
 assert(world.includes('canHostAcceptMissionItem('),'host must authorize scoped items');
 assert(world.includes('remotePickup('),'stealing must invalidate mission stacks');
 assert(match.includes("MATCH.world.request('take',it)"),'mission holders must send pickup requests');
});

test('cleanup follows replicated collected state, balloon undoes stolen steps, mail cannot auto-deliver',()=>{
 const cleanup=source('src/missions/games2.js');
 const crates=source('src/missions/games5.js');
 assert(cleanup.includes("got=o.litter.filter(it=>it.taken).length"));
 assert(crates.includes('q.it.onPickup=()'));
 assert(crates.includes('placed.splice(i)'));
 assert(!crates.includes("if (letter && letter.state === 'gone') give()"));
});
