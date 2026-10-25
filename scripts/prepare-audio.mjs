import {readFileSync,writeFileSync,readdirSync,mkdirSync} from 'node:fs';
const source=new URL('../audio-src/dinner/',import.meta.url);
const parts=readdirSync(source).filter(name=>/^part-\d{2}\.bin$/.test(name)).sort();
if(!parts.length)throw new Error('DINNER audio source is missing');
const audio=Buffer.concat(parts.map(name=>readFileSync(new URL(name,source))));
const destination=new URL('../public/audio/',import.meta.url);
mkdirSync(destination,{recursive:true});
writeFileSync(new URL('dinner-femtanyl.mp3',destination),audio);
