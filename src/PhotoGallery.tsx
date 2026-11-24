import {acquirePhoto} from "./photoResources";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Upload, Play, ArrowUp, ArrowDown, Trash2, Search, X, RotateCcw } from "lucide-react";
import type { GalleryController } from "./usePhotoLibrary";
import type { Photo } from "./storage";
import { FocalEditor } from "./FocalEditor";
function sizeLabel(bytes: number) { return bytes < 1048576 ? `${Math.round(bytes/1024)} KB` : `${(bytes/1048576).toFixed(1)} MB`; }
export function PhotoGallery({ gallery, photoStatus, onTestPhotos, children }: {
  gallery: GalleryController; photoStatus: string; onTestPhotos: () => void; children?: ReactNode;
}) {
  const { library, photos, ready, progress, saving, storageError, issues, summary } = gallery;
  const [query, setQuery] = useState(""), [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<string | null>(null), [confirm, setConfirm] = useState<"all" | "selected" | null>(null);
  const [skipDuplicates, setSkipDuplicates] = useState(true), [draggingFiles, setDraggingFiles] = useState(false);
  const dragPhoto = useRef<string | null>(null), input = useRef<HTMLInputElement>(null), dragDepth = useRef(0);
  const busy = !!progress;
  const shown = photos.filter(p => p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  const chosen = selected.filter(id => photos.some(p => p.id === id));
  useEffect(() => { setConfirm(null); }, [photos.length]);
  const importFiles = (files: Iterable<File>) => { setConfirm(null); void library.importFiles(Array.from(files), skipDuplicates); };
  useEffect(() => {
    const over = (event: DragEvent) => { if (Array.from(event.dataTransfer?.types ?? []).includes("Files")) event.preventDefault(); };
    const drop = (event: DragEvent) => {
      if (!event.dataTransfer?.files.length || event.defaultPrevented) return;
      event.preventDefault();
      if (ready && !busy) void library.importFiles(Array.from(event.dataTransfer.files), skipDuplicates);
    };
    window.addEventListener("dragover", over); window.addEventListener("drop", drop);
    return () => { window.removeEventListener("dragover", over); window.removeEventListener("drop", drop); };
  }, [library, ready, busy, skipDuplicates]);
  const select = (id: string) => setSelected(old => old.includes(id) ? old.filter(x => x !== id) : [...old, id]);
  return <>
    <div className="settings-title-row">
      <h2>Photos</h2>
      <div className="settings-actions">
        <label className="button settings-upload" aria-disabled={!ready || busy}>
          <Upload size={15}/>{busy ? "Adding…" : "Add photos"}
          <input ref={input} disabled={!ready || busy} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple hidden onChange={e => {
            const files = Array.from(e.target.files ?? []); e.target.value = ""; importFiles(files);
          }}/>
        </label>
        <button disabled={!photos.length || !ready} onClick={onTestPhotos}><Play size={15}/>Test photos now</button>
      </div>
    </div>
    <div className={`photo-drop-zone${draggingFiles ? " is-dragging" : ""}`} aria-label="Photo upload area"
      onDragEnter={e => { if (!Array.from(e.dataTransfer.types).includes("Files")) return; e.preventDefault(); dragDepth.current++; setDraggingFiles(true); }}
      onDragOver={e => { if (Array.from(e.dataTransfer.types).includes("Files")) { e.preventDefault(); e.dataTransfer.dropEffect = busy ? "none" : "copy"; } }}
      onDragLeave={e => { e.preventDefault(); if (--dragDepth.current <= 0) { dragDepth.current=0;setDraggingFiles(false); } }}
      onDrop={e => { e.preventDefault();dragDepth.current=0;setDraggingFiles(false);if(ready&&!busy&&e.dataTransfer.files.length)importFiles(Array.from(e.dataTransfer.files)); }}>
      <Upload size={23}/>
      <div><strong>{busy ? "Adding your photos" : "Drop photos here"}</strong><span>JPG, PNG or WebP · up to 60 MB each</span></div>
      <button disabled={!ready || busy} onClick={() => input.current?.click()}>Choose files</button>
    </div>
    <label className="photo-duplicate-option"><input type="checkbox" checked={skipDuplicates} disabled={busy} onChange={e=>setSkipDuplicates(e.target.checked)}/>Skip identical uploads</label>
    {progress && <div className="photo-import-progress" role="status" aria-live="polite">
      <div><strong>{progress.done} / {progress.total}</strong><span>{progress.name}</span><button onClick={library.cancel}><X size={13}/>Stop</button></div>
      <progress max={progress.total} value={progress.done} aria-label="Photo import progress"/>
      <small>{progress.added} added · {progress.skipped} skipped</small>
    </div>}
    <div className="photo-library-status" role="status" aria-live="polite">
      <span>{!ready ? "Opening gallery…" : saving ? "Saving gallery…" : storageError ? "Session only" : "Saved on this device"}</span>
      {summary && <strong>{summary}</strong>}
    </div>
    {storageError && <div className="photo-import-errors" role="alert"><p>{storageError}</p><button disabled={saving} onClick={()=>void library.save()}><RotateCcw size={14}/>Retry saving</button></div>}
    {issues.length>0 && <div className="photo-import-errors" role="status">
      <strong>{issues.length} photo{issues.length===1?"":"s"} could not be added</strong>
      <ul>{issues.map((issue,i)=><li key={i}><b>{issue.name}</b><span>{issue.message}</span></li>)}</ul>
      <button disabled={busy || !library.canRetry} onClick={()=>void library.retry()}><RotateCcw size={14}/>Retry failed photos</button>
    </div>}
    <p className="settings-note" role="status">{photoStatus}</p>
    {children}
    <div className="photo-library-heading"><h3>Gallery <span>{photos.length}</span></h3><span>{sizeLabel(photos.reduce((n,p)=>n+(p.bytes??p.blob.size),0))}</span></div>
    {photos.length>0 && <div className="photo-organize-tools">
      <label className="photo-search"><Search size={15}/><input type="search" placeholder="Find a photo…" aria-label="Search photos" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <div className="settings-actions">
        <button onClick={()=>setSelected(shown.map(p=>p.id))}>Select {query ? "results" : "all"}</button>
        {chosen.length>0 && <button onClick={()=>setSelected([])}>Deselect</button>}
        <button disabled={busy || photos.length<2} onClick={library.sortByName}>Sort A–Z</button>
        <button disabled={busy || photos.length<2} onClick={library.reverse}>Reverse</button>
      </div>
      {chosen.length>0 && <button className="danger subtle" disabled={busy} onClick={()=>setConfirm("selected")}><Trash2 size={14}/>Remove selected ({chosen.length})</button>}
    </div>}
    <div className="gallery photo-library-rows">
      {shown.map(p => {
        const index=photos.findIndex(x=>x.id===p.id);
        return <div className={`photo-row${chosen.includes(p.id)?" is-selected":""}`} key={p.id} draggable={!busy&&editing!==p.id}
          onDragStart={e=>{if(busy)return;dragPhoto.current=p.id;e.dataTransfer.setData("text/plain",p.id);e.dataTransfer.effectAllowed="move";}}
          onDragEnd={()=>{dragPhoto.current=null;}}
          onDragOver={e=>{if(dragPhoto.current){e.preventDefault();e.dataTransfer.dropEffect="move";}}}
          onDrop={e=>{if(!dragPhoto.current)return;e.preventDefault();e.stopPropagation();if(!busy&&dragPhoto.current)library.move(dragPhoto.current,index);dragPhoto.current=null;}}>
          <input type="checkbox" aria-label={`Select ${p.name}`} checked={chosen.includes(p.id)} onChange={()=>select(p.id)}/>
          <span className="photo-position">{index+1}</span>
          <PhotoThumb photo={p}/>
          <span className="photo-name"><b>{p.name}</b><small>{sizeLabel(p.bytes??p.blob.size)}</small></span>
          <div className="photo-row-actions">
            <button disabled={busy} onClick={()=>setEditing(editing===p.id?null:p.id)} aria-expanded={editing===p.id}>Frame photo</button>
            <button aria-label={`Move ${p.name} up`} disabled={busy||index===0} onClick={()=>library.move(p.id,index-1)}><ArrowUp size={15}/></button>
            <button aria-label={`Move ${p.name} down`} disabled={busy||index===photos.length-1} onClick={()=>library.move(p.id,index+1)}><ArrowDown size={15}/></button>
            <button aria-label={`Remove ${p.name}`} disabled={busy} onClick={()=>library.remove([p.id])}><Trash2 size={15}/></button>
          </div>
          {editing===p.id && <FocalEditor photo={p} onSave={next=>{library.replace(next);setEditing(null);}}/>}
        </div>;
      })}
    </div>
    {(!photos.length || !shown.length) && <p className="settings-note">{photos.length ? "No photos match your search." : "No photos in the gallery."}</p>}
    {photos.length>0 && !confirm && <button className="danger subtle" disabled={busy} onClick={()=>setConfirm("all")}>Clear gallery ({photos.length})</button>}
    {confirm && <div className="gallery-clear-confirm" role="group" aria-label="Clear gallery confirmation">
      <p>{confirm==="all"?`Remove all ${photos.length} photos?`:`Remove ${chosen.length} selected photos?`}</p>
      <div className="settings-actions"><button className="danger" disabled={busy} onClick={()=>{setEditing(null);if(confirm==="all")library.clear();else library.remove(chosen);setSelected([]);setConfirm(null);}}>{confirm==="all"?"Clear all photos":"Remove photos"}</button><button onClick={()=>setConfirm(null)}>Cancel</button></div>
    </div>}
  </>;
}
function PhotoThumb({photo}:{photo:Photo}) {
  const [url,setUrl]=useState("");
  useEffect(()=>{const lease=acquirePhoto(photo,true);setUrl(lease.url);return lease.release;},[photo.blob,photo.thumbnail,photo.remoteUrl,photo.thumbnailUrl]);
  return url ? <img loading="lazy" decoding="async" src={url} alt=""/> : <span className="photo-thumb-loading"/>;
}
