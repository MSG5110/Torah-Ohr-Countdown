import { describe, it, expect, vi, afterEach } from "vitest";
import type { Photo } from "./storage";
afterEach(()=>vi.unstubAllGlobals());
const photo=(id:string):Photo=>({id,name:id,order:0,blob:new Blob([id])});
async function setup() {
 vi.resetModules();let records=new Map<string,unknown>(),quota=false,active=0,maxActive=0;const puts:string[]=[];
 const database={objectStoreNames:{contains:()=>true},close:vi.fn(),onclose:null,onversionchange:null,transaction:vi.fn((_name:string,mode='readonly')=>{
  active++;maxActive=Math.max(active,maxActive);let aborted=false,done=false;const working=new Map(records);
  const transaction:any={error:null,oncomplete:null,onabort:null,onerror:null,abort(){if(done)return;aborted=true;queueMicrotask(()=>{active--;done=true;transaction.onabort?.()})},objectStore:()=>({
   getAllKeys(){const request:any={result:[],error:null,readyState:'pending'};queueMicrotask(()=>{request.result=[...working.keys()];request.readyState='done';request.onsuccess?.();finish()});return request},
   getAll(){const request:any={result:[],error:null,readyState:'pending'};queueMicrotask(()=>{request.result=[...working.values()];request.readyState='done';request.onsuccess?.();finish()});return request},
   put(value:any){if(quota)throw new DOMException('Full','QuotaExceededError');puts.push(value.id);working.set(value.id,value)},delete(id:string){working.delete(id)},
  })};
  function finish(){queueMicrotask(()=>{if(aborted||done)return;done=true;active--;if(mode==='readwrite')records=working;transaction.oncomplete?.()})}
  return transaction;
 })};
 const open=vi.fn(()=>{const r:any={result:database,error:null,readyState:'pending'};queueMicrotask(()=>{r.readyState='done';r.onsuccess?.()});return r});vi.stubGlobal('indexedDB',{open});
 const storage=await import('./storage');return {storage,open,puts,quota:(value:boolean)=>{quota=value},rows:()=>records,maxActive:()=>maxActive};
}
describe('serialized incremental photo persistence',()=>{
 it('appends without rewriting unchanged original photo blobs',async()=>{
  const {storage,puts,rows}=await setup(),a=photo('a'),b=photo('b');await storage.writePhotos([a],true);await storage.writePhotos([a,b],true);expect(puts).toEqual(['a','b']);expect([...rows().keys()]).toEqual(['a','b']);
 });
 it('serializes overlapping edits and the final clear wins',async()=>{
  const {storage,rows,maxActive}=await setup(),a=photo('a');await Promise.all([storage.writePhotos([a],true),storage.writePhotos([{...a,order:1}],true),storage.writePhotos([],true)]);expect(rows().size).toBe(0);expect(maxActive()).toBe(1);
 });
 it('can reopen after a synchronous IndexedDB startup failure',async()=>{
  const {storage,open,rows}=await setup();open.mockImplementationOnce(()=>{throw new DOMException('Blocked','SecurityError')});await expect(storage.getPhotos()).rejects.toThrow('Blocked');await storage.writePhotos([photo('new')],true);expect(rows().has('new')).toBe(true);expect(open).toHaveBeenCalledTimes(2);
 });
 it('rolls back quota failures and retries without poisoning future saves',async()=>{
  const {storage,quota,rows}=await setup(),a=photo('a');await storage.writePhotos([a],true);quota(true);await expect(storage.writePhotos([photo('b')],true)).rejects.toThrow('storage is full');expect([...rows().keys()]).toEqual(['a']);quota(false);await storage.writePhotos([photo('b')],true);expect([...rows().keys()]).toEqual(['b']);
 });
});
