import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
const require=createRequire(new URL('../../worker/package.json',import.meta.url));
const {Miniflare,convertV4MiniflareOptions}=require('miniflare');
const options={workers:[{modules:true,scriptPath:new URL('../../worker/src/index.js',import.meta.url).pathname,
  compatibilityDate:'2025-06-01',durableObjects:{ROOMS:{className:'Room',useSQLite:true}}}],host:'127.0.0.1',port:8788,cf:false};
const runtime=new Miniflare(convertV4MiniflareOptions?convertV4MiniflareOptions(options):options);
try{
  const url=await runtime.ready;
  const code=await new Promise((resolve,reject)=>{const p=spawn(process.execPath,['--test','scripts/online/state.test.mjs','scripts/online/active-motion.test.mjs','scripts/online/rider-visual.test.mjs','scripts/online/cadence-radio.test.mjs','scripts/online/worker.test.mjs'],
    {cwd:new URL('../../',import.meta.url),stdio:'inherit',env:{...process.env,ROOMS_TEST_URL:url.href.replace(/^http/,'ws').replace(/\/$/,'')+'/ws'}});p.on('error',reject);p.on('exit',resolve);});
  process.exitCode=code||0;
}finally{await runtime.dispose();}
