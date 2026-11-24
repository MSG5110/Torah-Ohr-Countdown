import { afterEach, describe, expect, it, vi } from "vitest";
import { displayIsFullscreen, toggleDisplayFullscreen, fullscreenHelp } from "./fullscreen";
afterEach(()=>vi.useRealTimers());
function screen() {
 const doc=Object.assign(new EventTarget(), {fullscreenElement:null as Element|null,webkitFullscreenElement:null as Element|null,documentElement:{requestFullscreen:undefined as undefined|((options?:FullscreenOptions)=>Promise<void>),webkitRequestFullscreen:undefined as undefined|(()=>void)},exitFullscreen:undefined as undefined|(()=>Promise<void>)});
 return doc;
}
describe('browser fullscreen control',()=>{
 it('requests the complete document with browser navigation hidden immediately on click',async()=>{
  const doc=screen(),request=vi.fn(async()=>{doc.fullscreenElement={} as Element;doc.dispatchEvent(new Event("fullscreenchange"))});doc.documentElement.requestFullscreen=request;const task=toggleDisplayFullscreen(doc as unknown as Document);expect(request).toHaveBeenCalledWith({navigationUI:'hide'});await expect(task).resolves.toBe('entered');
 });
 it('exits an active fullscreen session instead of requesting it again',async()=>{
  const doc=screen();doc.fullscreenElement={} as Element;doc.exitFullscreen=vi.fn(async()=>{doc.fullscreenElement=null;doc.dispatchEvent(new Event("fullscreenchange"))});await expect(toggleDisplayFullscreen(doc as unknown as Document)).resolves.toBe('exited');expect(doc.exitFullscreen).toHaveBeenCalledOnce();
 });
 it('propagates denied requests so settings can stay open and show recovery guidance',async()=>{
  const doc=screen();doc.documentElement.requestFullscreen=async()=>{throw new DOMException('Denied','NotAllowedError')};await expect(toggleDisplayFullscreen(doc as unknown as Document)).rejects.toThrow('Denied');
 });
 it('waits for prefixed browser confirmation on entry and exit',async()=>{
  const doc=screen();doc.documentElement.webkitRequestFullscreen=()=>{queueMicrotask(()=>{doc.webkitFullscreenElement={} as Element;doc.dispatchEvent(new Event('webkitfullscreenchange'))})};await expect(toggleDisplayFullscreen(doc as unknown as Document)).resolves.toBe('entered');expect(displayIsFullscreen(doc as unknown as Document)).toBe(true);
  Object.assign(doc,{webkitExitFullscreen:()=>{queueMicrotask(()=>{doc.webkitFullscreenElement=null;doc.dispatchEvent(new Event('webkitfullscreenchange'))})}});await expect(toggleDisplayFullscreen(doc as unknown as Document)).resolves.toBe('exited');
 });
 it('recovers from missing APIs and silent prefixed failures without hanging',async()=>{
  const doc=screen();await expect(toggleDisplayFullscreen(doc as unknown as Document)).rejects.toThrow('not supported');vi.useFakeTimers();doc.documentElement.webkitRequestFullscreen=()=>{};const task=expect(toggleDisplayFullscreen(doc as unknown as Document)).rejects.toThrow('blocked');await vi.advanceTimersByTimeAsync(5001);await task;
 });
 it('unlocks a native request that never settles',async()=>{
  vi.useFakeTimers();const doc=screen();doc.documentElement.requestFullscreen=()=>new Promise(()=>{});const task=expect(toggleDisplayFullscreen(doc as unknown as Document)).rejects.toThrow('blocked');await vi.advanceTimersByTimeAsync(5001);await task;
 });
 it('gives platform-specific browser shortcut help',()=>{
  expect(fullscreenHelp('Windows NT 10.0')).toContain('F11');expect(fullscreenHelp('Macintosh')).toContain('Control + Command + F');expect(fullscreenHelp('iPhone')).toContain('Add to Home Screen');
 });
});
