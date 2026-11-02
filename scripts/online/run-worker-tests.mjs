import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const require=createRequire(new URL('../../worker/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const options={workers:[{modulesRoot:new URL('../../worker/src/',import.meta.url).pathname,modules:['index.js','accounts.js'].map(f=>({type:'ESModule',path:new URL('../../worker/src/'+f,import.meta.url).pathname})),
  compatibilityDate:'2025-06-01',bindings:{DISCORD_CLIENT_ID:'111',DISCORD_CLIENT_SECRET:'test-secret'},
  outboundService:async req=>{const u=new URL(req.url);
   if(u.pathname==='/api/oauth2/token'){const b=new URLSearchParams(await req.text());return Response.json({access_token:'at-'+b.get('code')});}
   if(u.pathname==='/api/users/@me'){const i=req.headers.get('authorization').replace('Bearer at-code','');return Response.json({id:String(100000000000000000n+BigInt(i)),username:'user'+i,global_name:'Игрок '+i,avatar:null});}
   return new Response('not found',{status:404});},
  durableObjects:{ROOMS:{className:'Room',useSQLite:true},ACCOUNTS:{className:'Accounts',useSQLite:true}}}],host:'127.0.0.1',port:8788,cf:false};
const runtime=new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
try{
  const url=await runtime.ready;
  // v0.66: test:online - только сеть (сервер комнат, аккаунты, протокол, синхронизация).
  // Контент районов - отдельный test:game, нагрузка - test:stress.
  const ONLINE=['worker','accounts','state','motion','active-motion','replication-priority','adaptive-replication','cadence-radio','coin-protocol','mission-item-authority','rider-visual','telemetry'];
  const suite=(process.argv.includes('--stress')?['stress']:ONLINE).map(n=>'scripts/online/'+n+'.test.mjs');
  const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--test',...suite],
    {cwd:new URL('../../',import.meta.url),stdio:'inherit',env:{...process.env,ROOMS_TEST_URL:url.href.replace(/^http/,'ws').replace(/\/$/,'')+'/ws'}});p.on('error',reject);p.on('exit',resolve);});
  process.exitCode=code||0;
}finally{await runtime.dispose();}
