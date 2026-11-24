import {upload} from '@vercel/blob/client';
import {defaults,type Settings}from'./engine';
import{setSharedStorageAdapter}from'./packageContext';
import type{Photo}from'./storage';import type{PrizePhoto}from'./prizeStore';
import{mediaPathValid,type SharedEvent,type SharedPatch,type CloudPhoto}from'./sharedTypes';
export const sharedEnabled=()=>import.meta.env.VITE_SHARED_MODE==='true'&&document.documentElement.dataset.standalone!=='true';
let state:SharedEvent={version:1,revision:'initial',updatedAt:0,settings:{...defaults},photos:[],prizes:[],run:null,prepared:null};
let status={authenticated:false,configured:true,storageConfigured:true,ready:false,saving:false,error:'',lastSync:0,conflicted:false};
const watchers=new Set<()=>void>();let view={state,...status};
export const sharedSubscribe=(f:()=>void)=>{watchers.add(f);return()=>{watchers.delete(f)}};
export const sharedSnapshot=()=>view;
function emit(){view={state,...status};watchers.forEach(f=>f());window.dispatchEvent(new CustomEvent('torah:shared'));}
function cache(){try{localStorage.setItem('torah-shared-cache-v1',JSON.stringify(state))}catch{}}
async function request(path:string,options:RequestInit={}){const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),20000);try{return await fetch(path,{...options,credentials:'same-origin',signal:controller.signal})}finally{clearTimeout(timer)}}
async function json(response:Response){const data=await response.json().catch(()=>({error:'Unexpected server response.'}));if(!response.ok)throw Object.assign(Error(data.error??'Shared update failed.'),{status:response.status});return data;}
const queue:{patch:SharedPatch;resolve:()=>void;reject:(error:unknown)=>void}[]=[];let generation=0,refreshing=false;let running=false,timer:ReturnType<typeof setTimeout>|undefined;
const merge=(base:SharedEvent,patch:SharedPatch):SharedEvent=>({...base,...patch,settings:{...base.settings,...patch.settings}});
export function commitShared(patch:SharedPatch){
 if(!status.authenticated)return Promise.reject(Error('Sign in to change the shared event.'));
 if(status.conflicted)return Promise.reject(Error('Another device changed the event. Reload shared data before saving again.'));
 generation++;state=merge(state,patch);status={...status,saving:true,error:''};emit();
 const task=new Promise<void>((resolve,reject)=>queue.push({patch,resolve,reject}));
 if(!timer&&!running)timer=setTimeout(()=>void flush(),250);return task;
}
async function flush(){
 timer=undefined;if(running)return;running=true;
 while(queue.length){const jobs=queue.splice(0);let patch:SharedPatch={};for(const j of jobs)patch={...patch,...j.patch,settings:{...patch.settings,...j.patch.settings}};
  try{const reply=await request('/api/event',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:state.revision,patch})});const server=await json(reply) as SharedEvent;state=server;for(const j of queue)state=merge(state,j.patch);status={...status,error:'',lastSync:Date.now()};cache();jobs.forEach(j=>j.resolve());}
  catch(error){const e=error as Error&{status?:number};status={...status,error:e.message,conflicted:true};if(e.status===401)status.authenticated=false;jobs.forEach(j=>j.reject(error));queue.splice(0).forEach(j=>j.reject(error));}
  emit();
 }
 running=false;status={...status,saving:false};emit();
}
export async function refreshShared(){
 if(running||queue.length||refreshing)return;
 refreshing=true;const started=generation;
 try{const response=await request('/api/event',{headers:{'If-None-Match':`"${state.revision}"`},cache:'no-store'});if(started!==generation)return;if(response.status!==304){state=await json(response);cache();emit();}status={...status,ready:true,lastSync:Date.now(),error:status.conflicted?status.error:''};emit();}
 catch(error){if(started===generation){status={...status,ready:true,error:(error as Error).message};emit();}}finally{refreshing=false}
}
export async function session(){try{const data=await json(await request('/api/auth'));status={...status,...data};emit()}catch(error){status={...status,error:(error as Error).message};emit()}}
export async function signIn(password:string){const data=await json(await request('/api/auth',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password})}));status={...status,...data,error:''};emit();await refreshShared();}
export async function signOut(){await json(await request('/api/auth',{method:'DELETE'}));status={...status,authenticated:false};emit();}
export function adminAuthenticated(){return status.authenticated;}
export function sharedState(){return state;}
const photosCache=new Map<string,{raw:string;photo:Photo}>();
export const mediaURL=(path:string)=>`/api/media?path=${encodeURIComponent(path)}`;
export function hydrateCloud(rows:CloudPhoto[]):Photo[]{return rows.map(raw=>{const key=JSON.stringify(raw),cached=photosCache.get(raw.id);if(cached?.raw===key)return cached.photo;const p:Photo={...raw,blob:cached?.photo.blob??new Blob([]),remoteUrl:mediaURL(raw.mediaPath),thumbnailUrl:raw.thumbnailPath?mediaURL(raw.thumbnailPath):undefined};photosCache.set(raw.id,{raw:key,photo:p});return p})}
export function cloudPhotos(){return hydrateCloud(state.photos)}
export function cloudPrizes(){return hydrateCloud(state.prizes) as PrizePhoto[]}
const uploadedImages=new WeakMap<Blob,Promise<string>>();
async function uploadNewImage(blob:Blob){
 if(!status.authenticated)throw Error('Sign in before uploading.');
 const ext=blob.type==='image/png'?'png':blob.type==='image/svg+xml'?'svg':blob.type==='image/jpeg'?'jpg':'webp',path=`media/${crypto.randomUUID()}.${ext}`;
 const result=await upload(path,blob,{access:'private',handleUploadUrl:'/api/upload',multipart:blob.size>4*1024*1024});
 if(!mediaPathValid(result.pathname))throw Error('Unexpected image upload path.');return result.pathname;
}
export function uploadImage(blob:Blob){
 let task=uploadedImages.get(blob);if(!task){task=uploadNewImage(blob);uploadedImages.set(blob,task);void task.catch(()=>uploadedImages.delete(blob));}return task;
}
export async function toCloud(rows:Photo[]):Promise<CloudPhoto[]>{
 const result:CloudPhoto[]=[];
 for(const photo of rows){const {blob,thumbnail,remoteUrl:_url,thumbnailUrl:_thumb,...metadata}=photo;
 const replaced=!!photo.remoteUrl&&blob.size>0;
 const mediaPath=!replaced&&photo.mediaPath?photo.mediaPath:await uploadImage(blob);
 const thumbnailPath=!replaced&&photo.thumbnailPath?photo.thumbnailPath:thumbnail?await uploadImage(thumbnail):undefined;
 result.push({...metadata,mediaPath,thumbnailPath,bytes:replaced?blob.size:photo.bytes??blob.size});}
 return result;
}
export async function saveCloudPhotos(rows:Photo[],prizes=false){const records=await toCloud(rows);await commitShared(prizes?{prizes:records}:{photos:records});}
export async function saveCloudSettings(next:Settings){
 const changed:Partial<Settings>={};for(const key of Object.keys(defaults)as(keyof Settings)[])if(next[key]!==state.settings[key])Object.assign(changed,{[key]:next[key]});
 if(typeof changed.logo==='string'&&changed.logo.startsWith('data:')){const blob=await(await fetch(changed.logo)).blob();changed.logo=mediaURL(await uploadImage(blob));}
 if(Object.keys(changed).length)await commitShared({settings:changed});
}
export async function initializeShared(){
 if(!sharedEnabled())return;
 try{const cached=localStorage.getItem('torah-shared-cache-v1');if(cached){const parsed=JSON.parse(cached);if(parsed.version===1)state=parsed;}}catch{}
 setSharedStorageAdapter({get(key){if(key==='torah-ore-settings-v1')return JSON.stringify(state.settings);if(key==='torah-ore-prize-run-v1')return state.run?JSON.stringify(state.run):null;if(key==='torah-ore-prepared-prize-v1')return state.prepared?JSON.stringify(state.prepared):null;return null},set(key,value){if(!status.authenticated)throw Error('Sign in to edit the shared event.');const data=value?JSON.parse(value):null;const task=key==='torah-ore-settings-v1'?saveCloudSettings(data):commitShared(key==='torah-ore-prize-run-v1'?{run:data}:{prepared:data});void task.catch(error=>{status={...status,error:(error as Error).message};emit()})}});
 await Promise.allSettled([refreshShared(),session()]);
 setInterval(()=>{if(document.visibilityState!=='hidden')void refreshShared()},10000);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')void refreshShared()});window.addEventListener('online',()=>void refreshShared());
}
