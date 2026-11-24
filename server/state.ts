import {get,put,BlobPreconditionFailedError} from '@vercel/blob';
import {randomUUID} from 'node:crypto';
import {defaults,type Settings} from '../src/engine.js';
import {mediaPathValid,type SharedEvent,type SharedPatch,type CloudPhoto} from '../src/sharedTypes.js';
import {parsePrizeRun,parsePreparedPrize,prizePhase} from '../src/prizeEngine.js';
const PATH='state/event.json';
export const emptyEvent=():SharedEvent=>({version:1,revision:'initial',updatedAt:0,settings:{...defaults},photos:[],prizes:[],run:null,prepared:null});
export async function readEvent(){
 const result=await get(PATH,{access:'private',useCache:false});
 if(!result||result.statusCode!==200)return {state:emptyEvent(),etag:undefined};
 const text=await new Response(result.stream).text();const state=JSON.parse(text) as SharedEvent;
 if(state.version!==1||!Array.isArray(state.photos)||!Array.isArray(state.prizes))throw Error('Shared event data is invalid.');
 return {state,etag:result.blob.etag};
}
function fail(message:string):never{throw Object.assign(Error(message),{status:400});}
function records(input:unknown):CloudPhoto[]{
 if(!Array.isArray(input)||input.length>1000)fail('Choose at most 1000 images.');
 const ids=new Set<string>();return input.map((raw,index)=>{
  if(!raw||typeof raw!=='object'||typeof raw.id!=='string'||raw.id.length>120||ids.has(raw.id)||typeof raw.name!=='string'||raw.name.length>240||!mediaPathValid(raw.mediaPath)||raw.thumbnailPath&&!mediaPathValid(raw.thumbnailPath))fail('Invalid photograph information.');
  ids.add(raw.id);const item:CloudPhoto={id:raw.id,name:raw.name,order:index,mediaPath:raw.mediaPath,bytes:Number.isFinite(raw.bytes)?Math.max(0,raw.bytes):0};
  for(const k of ['focalX','focalY','portraitX','portraitY'] as const)if(typeof raw[k]==='number'&&Number.isFinite(raw[k]))item[k]=Math.max(0,Math.min(1,raw[k]));
  if(raw.thumbnailPath)item.thumbnailPath=raw.thumbnailPath;if(typeof raw.sourceFingerprint==='string'&&/^[a-f0-9]{64}$/.test(raw.sourceFingerprint))item.sourceFingerprint=raw.sourceFingerprint;
  if(raw.analysis&&Number.isFinite(raw.analysis.brightness)&&Number.isFinite(raw.analysis.highlights))item.analysis={brightness:Math.max(0,Math.min(1,raw.analysis.brightness)),highlights:Math.max(0,Math.min(1,raw.analysis.highlights))};
  for(const k of ['countdownSeconds','revealSeconds'] as const)if(Number.isSafeInteger(raw[k])&&raw[k]>=(k==='revealSeconds'?0:1))item[k]=Math.min(raw[k],31536000);
  if(typeof raw.revealText==='string')item.revealText=raw.revealText.slice(0,300);
  return item;
 });
}
export function mergeEvent(old:SharedEvent,patch:SharedPatch):SharedEvent{
 if(!patch||typeof patch!=='object'||Object.keys(patch).some(k=>!['settings','photos','prizes','run','prepared'].includes(k)))fail('Invalid event update.');
 const next={...old,settings:{...old.settings},revision:randomUUID(),updatedAt:Date.now()};
 if(patch.settings){for(const key of Object.keys(patch.settings) as (keyof Settings)[]){
  if(!Object.hasOwn(defaults,key))fail('Unknown event setting.');const value=patch.settings[key];
  if(key==='logo'){if(value!==null&&(typeof value!=='string'||!value.startsWith('/api/media?path=')||!mediaPathValid(decodeURIComponent(value.slice(16)))))fail('Upload the original logo before saving.');}
  else if(key==='deadline'){if(value!==null&&(typeof value!=='number'||!Number.isFinite(value)))fail('Invalid deadline.');}
  else if(typeof value!==typeof defaults[key]||typeof value==='number'&&!Number.isFinite(value)||typeof value==='string'&&value.length>500)fail('Invalid setting value.');
  Object.assign(next.settings,{[key]:value});
 }}
 if(patch.photos!==undefined)next.photos=records(patch.photos);if(patch.prizes!==undefined)next.prizes=records(patch.prizes);
 if(patch.run!==undefined){next.run=patch.run===null?null:parsePrizeRun(JSON.stringify(patch.run));if(patch.run!==null&&!next.run)fail('Invalid prize countdown.');}
 if(patch.prepared!==undefined){next.prepared=patch.prepared===null?null:parsePreparedPrize(JSON.stringify(patch.prepared));if(patch.prepared!==null&&!next.prepared)fail('Invalid prepared prize.');}
 if(next.run&&!next.prizes.some(p=>p.id===next.run!.prizeId)){if(prizePhase(next.run,Date.now()).visible)fail('The active prize is not in the gallery.');else next.run=null;}
 if(next.prepared&&!next.prizes.some(p=>p.id===next.prepared!.prizeId))next.prepared=null;
 return next;
}
export async function updateEvent(patch:SharedPatch,expected:string){
 const current=await readEvent();if(current.state.revision!==expected)throw Object.assign(Error('Another device changed the event. Refresh and try again.'),{status:409});
 const state=mergeEvent(current.state,patch);
 try {await put(PATH,JSON.stringify(state),{access:'private',addRandomSuffix:false,allowOverwrite:!!current.etag,...(current.etag?{ifMatch:current.etag}:{}),contentType:'application/json',cacheControlMaxAge:60});}
 catch(error){if(error instanceof BlobPreconditionFailedError||String(error).includes('already exists'))throw Object.assign(Error('Another device changed the event. Try again.'),{status:409});throw error;}
 return state;
}
