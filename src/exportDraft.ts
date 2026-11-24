import { storageName } from "./packageContext";
export type ExportDraft = { blob: Blob; bytes: number; photos: number; prizes: number; savedAt: number };
async function database() {
  return new Promise<IDBDatabase>((resolve,reject)=>{
    let done=false;
    const timer=setTimeout(()=>{done=true;reject(Error("Recovery storage unavailable"))},3000);
    try {
      const request=indexedDB.open(storageName("torah-ore-export-recovery"),1);
      request.onupgradeneeded=()=>request.result.createObjectStore("drafts");
      request.onsuccess=()=>{clearTimeout(timer);if(done)request.result.close();else{done=true;resolve(request.result)}};
      request.onerror=request.onblocked=()=>{clearTimeout(timer);done=true;reject(Error("Recovery storage unavailable"))};
    }catch(error){clearTimeout(timer);done=true;reject(error)}
  });
}
export async function saveExportDraft(data:Omit<ExportDraft,"savedAt">) {
  const db=await database();
  try {return await new Promise<boolean>((resolve,reject)=>{
    const tx=db.transaction("drafts","readwrite"),timer=setTimeout(()=>{try{tx.abort()}catch{}reject(Error("Recovery save timed out"))},5000);
    tx.oncomplete=()=>{clearTimeout(timer);resolve(true)};tx.onerror=tx.onabort=()=>{clearTimeout(timer);reject(tx.error)};
    tx.objectStore("drafts").put({blob:data.blob,bytes:data.bytes,photos:data.photos,prizes:data.prizes,savedAt:Date.now()},"latest");
  })}finally{db.close()}
}
export async function readExportDraft() {
  const db=await database();
  try{return await new Promise<ExportDraft|null>((resolve,reject)=>{
    const tx=db.transaction("drafts"),request=tx.objectStore("drafts").get("latest"),timer=setTimeout(()=>reject(Error("Recovery read timed out")),3000);
    request.onsuccess=()=>{clearTimeout(timer);const v=request.result;resolve(v?.blob instanceof Blob?v:null)};request.onerror=()=>{clearTimeout(timer);reject(request.error)};
  })}finally{db.close()}
}
