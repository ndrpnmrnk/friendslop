import test from 'node:test';
import assert from 'node:assert/strict';
import { ActiveMotion, validMotion } from '../../src/net/active-motion.js';

const object=(x=0)=>({x,y:0,z:0,vx:1,vy:0,vz:0,mesh:{rotation:{x:0,y:0,z:0}}});

test('moving objects transmit changes and retry after buffer rejection',()=>{
 const m=new ActiveMotion(),objects=new Map([['p:0',object()]]);
 assert.equal(m.capture(objects).length,1);
 assert.deepEqual(m.capture(objects),[]);
 objects.get('p:0').x=.5;assert.equal(m.capture(objects).length,1);
 m.retry();assert.equal(m.capture(objects).length,1);
 m.reset();assert.equal(m.capture(objects).length,1);
});

test('motion packets stay within 32 objects / 8 KiB and drain fairly',()=>{
 const m=new ActiveMotion(),objects=new Map();
 for(let i=0;i<76;i++)objects.set('p:'+i,object(i));
 const all=new Set();
 for(let i=0;i<3;i++){
  const rows=m.capture(objects);
  assert(rows.length<=32);
  assert(Buffer.byteLength(JSON.stringify(rows))<=8192);
  for(const row of rows){assert(validMotion(row));all.add(row[0]);}
 }
 assert.equal(all.size,76);
 assert.equal(m.capture(objects).length,0);
 for(const b of objects.values())b.x++;
 const short=m.capture(objects,32,100);
 assert(short.length>0);
 assert(Buffer.byteLength(JSON.stringify(short))<=100);
});

test('bad or incomplete motion rows cannot change physics',()=>{
 assert(!validMotion(['p:0',Infinity,0,0,0,0,0,0,0,0]));
 assert(!validMotion(['p:0',0,0,0,0,0,0,0,0]));
 assert(!validMotion(['v:0',0,0,0,0,0,0,0,0,0]));
 assert(validMotion(['p:0',0,0,0,0,0,0,0,0,0]));
});
