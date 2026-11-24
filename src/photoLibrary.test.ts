import { describe, it, expect, vi } from "vitest";
import { PhotoLibrary } from "./photoLibrary";
import type { Photo } from "./storage";
const file = (name: string, bytes=name) => new File([bytes], name, {type:"image/png"});
const photo = (id:string, order=0):Photo => ({id,name:id,order,blob:new Blob([id])});
function deferred<T>() { let resolve!:(value:T)=>void;let reject!:(reason:unknown)=>void;const promise=new Promise<T>((r,j)=>{resolve=r;reject=j});return {promise,resolve,reject}; }
function setup(initial:Photo[]=[]) {
 let serial=0;
 const service={read:vi.fn(async()=>initial),write:vi.fn(async(_photos:Photo[],_clear:boolean)=>{}),prepare:vi.fn(async(f:File,_signal?:AbortSignal)=>({blob:new Blob([f.name])})),fingerprint:vi.fn(async(f:File)=>f.text()),id:()=>`new-${++serial}`};
 const library=new PhotoLibrary(service);return {library,service};
}
describe("resilient photo library",()=>{
 it("adds successful photos progressively and continues after a bad file",async()=>{
  const {library,service}=setup();service.prepare.mockImplementation(async(f)=>{if(f.name==='bad.png')throw Error('Corrupt image');return {blob:f}});
  const counts:number[]=[];library.subscribe(()=>counts.push(library.getSnapshot().photos.length));const onFirstAdded=vi.fn();library.onFirstAdded=onFirstAdded;
  await library.importFiles([file('a.png'),file('bad.png'),file('b.png')]);
  expect(library.getSnapshot().photos.map(p=>p.name)).toEqual(['a.png','b.png']);expect(counts).toContain(1);expect(onFirstAdded).toHaveBeenCalledOnce();expect(library.getSnapshot().issues).toEqual([{name:'bad.png',message:'Corrupt image'}]);expect(library.getSnapshot().progress).toBeNull();
 });
 it("snapshots selected files and rejects overlapping import requests",async()=>{
  const {library,service}=setup(),wait=deferred<{blob:Blob}>();service.prepare.mockReturnValueOnce(wait.promise);
  const files=[file('a.png')], importing=library.importFiles(files);files.push(file('later.png'));await vi.waitFor(()=>expect(service.prepare).toHaveBeenCalledOnce());
  await library.importFiles([file('overlap.png')]);wait.resolve({blob:new Blob(['a'])});await importing;
  expect(library.getSnapshot().photos.map(p=>p.name)).toEqual(['a.png']);
 });
 it("stops an in-flight decode without adding a late result and can import again",async()=>{
  const {library,service}=setup(),wait=deferred<{blob:Blob}>();service.prepare.mockReturnValueOnce(wait.promise);const importing=library.importFiles([file('late.png')]);await vi.waitFor(()=>expect(service.prepare).toHaveBeenCalledOnce());library.cancel();wait.resolve({blob:new Blob(['late'])});await importing;
  expect(library.getSnapshot().photos).toHaveLength(0);expect(library.getSnapshot().summary).toContain('Stopped');await library.importFiles([file('next.png')]);expect(library.getSnapshot().photos[0].name).toBe('next.png');
 });
 it("merges an arriving photo into the latest reordered and removed gallery",async()=>{
  const {library,service}=setup([photo('one'),photo('two',1)]);await library.load();const wait=deferred<{blob:Blob}>();service.prepare.mockReturnValueOnce(wait.promise);const importing=library.importFiles([file('new.png')]);await vi.waitFor(()=>expect(service.prepare).toHaveBeenCalledOnce());
  library.move('two',0);library.remove(['one']);wait.resolve({blob:new Blob(['new'])});await importing;
  expect(library.getSnapshot().photos.map(p=>p.name)).toEqual(['two','new.png']);expect(library.getSnapshot().photos.map(p=>p.order)).toEqual([0,1]);
 });
 it("skips matching source bytes and allows intentional duplicates",async()=>{
  const {library,service}=setup();await library.importFiles([file('a.png','same'),file('renamed.png','same')]);expect(service.prepare).toHaveBeenCalledOnce();expect(library.getSnapshot().summary).toContain('1 duplicate');
  await library.importFiles([file('again.png','same')],false);expect(library.getSnapshot().photos).toHaveLength(2);
 });
 it("retries only failed files and clears successful error feedback",async()=>{
  const {library,service}=setup();service.prepare.mockRejectedValueOnce(Error('Temporary failure'));await library.importFiles([file('a.png'),file('b.png')]);expect(library.canRetry).toBe(true);await library.retry();expect(service.prepare.mock.calls.map(c=>c[0].name)).toEqual(['a.png','b.png','a.png']);expect(library.getSnapshot().photos).toHaveLength(2);expect(library.getSnapshot().issues).toEqual([]);expect(library.canRetry).toBe(false);
 });
 it("keeps changes after failed storage, then retries the complete current snapshot",async()=>{
  const {library,service}=setup();service.write.mockRejectedValueOnce(new DOMException('Full','QuotaExceededError'));await library.importFiles([file('a.png')]);expect(library.getSnapshot().storageError).toContain('Retry saving');expect(library.getSnapshot().photos).toHaveLength(1);await library.save();expect(library.getSnapshot().storageError).toBe('');expect(service.write.mock.calls.at(-1)?.[0]).toHaveLength(1);
 });
 it("serializes pending saves and never restores an earlier gallery",async()=>{
  const {library,service}=setup([photo('one'),photo('two',1)]),wait=deferred<void>();await library.load();service.write.mockReturnValueOnce(wait.promise);library.move('two',0);await vi.waitFor(()=>expect(service.write).toHaveBeenCalledOnce());library.clear();expect(library.getSnapshot().photos).toEqual([]);wait.resolve();await library.snapshot();expect(service.write.mock.calls.at(-1)?.[0]).toEqual([]);expect(library.getSnapshot().photos).toEqual([]);
 });
 it("retains session imports when initial storage loading fails",async()=>{
  const {library,service}=setup();service.read.mockRejectedValueOnce(Error('Blocked'));await library.importFiles([file('a.png')]);expect(library.getSnapshot().ready).toBe(true);expect(library.getSnapshot().photos).toHaveLength(1);expect(service.read).toHaveBeenCalledTimes(2);
 });
 it("recovers unread stored photos before saving new session imports",async()=>{
  const {library,service}=setup([photo('already-saved')]);service.read.mockRejectedValueOnce(Error('Temporarily blocked'));
  await library.importFiles([file('new.png')]);expect(library.getSnapshot().photos.map(p=>p.name)).toEqual(['already-saved','new.png']);expect(service.write.mock.calls.at(-1)?.[0].map(p=>p.name)).toEqual(['already-saved','new.png']);
 });
 it("does not overwrite an unread stored gallery while reads keep failing",async()=>{
  const {library,service}=setup();service.read.mockRejectedValue(Error('Blocked'));await library.importFiles([file('new.png')]);expect(service.write).not.toHaveBeenCalled();expect(library.getSnapshot().photos).toHaveLength(1);expect(library.getSnapshot().storageError).toContain('Retry saving');
 });
 it("an explicit clear cannot be undone by late storage recovery",async()=>{
  const {library,service}=setup(),wait=deferred<Photo[]>();service.read.mockRejectedValueOnce(Error('Blocked')).mockReturnValueOnce(wait.promise);
  const importing=library.importFiles([file('new.png')]);await vi.waitFor(()=>expect(service.read).toHaveBeenCalledTimes(2));library.clear();wait.resolve([photo('old')]);await importing;await library.snapshot();expect(library.getSnapshot().photos).toEqual([]);expect(service.write.mock.calls.at(-1)?.[0]).toEqual([]);
 });
 it("sorts naturally, reverses, edits framing, and removes a selected group",async()=>{
  const {library}=setup([photo('Photo 10'),photo('Photo 2',1),photo('Photo 1',2)]);await library.load();library.sortByName();expect(library.getSnapshot().photos.map(p=>p.id)).toEqual(['Photo 1','Photo 2','Photo 10']);library.reverse();const current=library.getSnapshot().photos[0];library.replace({...current,focalX:.8});expect(library.getSnapshot().photos[0].focalX).toBe(.8);library.remove(['Photo 2','Photo 1']);expect(library.getSnapshot().photos.map(p=>p.order)).toEqual([0]);await library.snapshot();
 });
 it("reports HEIC with a useful conversion hint and keeps supported photos",async()=>{
  const {library}=setup();await library.importFiles([new File(['heic'],'Phone.HEIC',{type:'image/heic'}),file('ok.png')]);expect(library.getSnapshot().issues[0].message).toContain('export this photo as JPG');expect(library.getSnapshot().photos).toHaveLength(1);
 });
});
