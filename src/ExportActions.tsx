import { useMemo, useRef, useState } from "react";
import { downloadEvent, type prepareEvent } from "./eventExport";
export function ExportActions({data,onStatus}:{data:Awaited<ReturnType<typeof prepareEvent>>;onStatus:(s:string)=>void}) {
  const [html,setHtml]=useState(data.html),[showSource,setShowSource]=useState(false),[sharing,setSharing]=useState(false);
  const source=useRef<HTMLTextAreaElement>(null);
  const file=useMemo(()=>new File([data.blob],"torah-ore-ready.html",{type:"text/html"}),[data.blob]);
  let canShare=false;
  try { canShare=!!navigator.canShare?.({files:[file]}); } catch { /* Viewer has no native sharing bridge. */ }
  const appleMobile=/iPhone|iPad|iPod/i.test(navigator.userAgent)||(navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1);
  function selectSource() { source.current?.focus();source.current?.select();source.current?.setSelectionRange(0,html.length); }
  async function getSource() { const text=html||await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error("Could not read export"));reader.readAsText(data.blob)});setHtml(text);return text; }
  async function copy() {
    let text: string;
    try { text=await getSource(); } catch { onStatus("Could not read the prepared HTML. Try Share if available, or prepare again.");return; }
    try { if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(text);onStatus("Complete HTML copied. Paste it into a new HTML document in your editor and save."); }
    catch {setShowSource(true);onStatus("Use Select HTML below, then Copy from your phone’s selection menu. Paste into a new HTML document and save.");}
  }
  return <div className="export-ready-actions">
    <div className="settings-actions">
      {canShare&&<button disabled={sharing} onClick={async()=>{
        setSharing(true);
        try {await navigator.share({files:[file],title:"Torah Ore countdown"});onStatus("Share sheet completed. Keep your original until the saved file has been checked.");}
        catch(error){onStatus(error instanceof DOMException&&error.name==="AbortError"?"Sharing cancelled. Your export is still ready.":"This viewer could not share the file. Use Copy HTML instead.");}
        finally{setSharing(false);}
      }}>{sharing?"Sharing…":"Share HTML file"}</button>}
      {!appleMobile&&<button onClick={()=>downloadEvent(data.blob)}>Download HTML</button>}
      <button onClick={()=>void copy()}>Copy complete HTML</button>
      <button onClick={()=>{if(showSource)setShowSource(false);else void getSource().then(()=>setShowSource(true)).catch(()=>onStatus("Could not open the source text. Your prepared file is still available."))}}>{showSource?"Hide HTML":"Show HTML"}</button>
    </div>
    <p className="settings-note">The export is ready. {appleMobile?"Use Share if available, or copy the complete HTML into a new document in your viewer’s source editor.":"Choose Download, Share if available, or Copy."} Photos, prizes and settings are included.</p>
    {showSource&&<div className="export-source">
      <button onClick={selectSource}>Select HTML</button>
      <textarea ref={source} readOnly aria-label="Complete exported HTML" value={html} spellCheck={false}/>
      <p className="settings-note">Save a new copy with an .html filename. Copy all the text, not only the visible portion. Keep the current configured file until you have checked the new copy.</p>
    </div>}
  </div>;
}
