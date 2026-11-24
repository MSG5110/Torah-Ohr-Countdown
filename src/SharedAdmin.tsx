import {useState,useSyncExternalStore,type ReactNode}from'react';
import{sharedSubscribe,sharedSnapshot,signIn,signOut,commitShared,toCloud,uploadImage,mediaURL}from'./sharedClient';
import{parseEventPackage,blobFromData}from'./packageContext';
import type{CloudPhoto}from'./sharedTypes';
export function SharedAdminGate({children,close}:{children:ReactNode;close:()=>void}){
 const info=useSyncExternalStore(sharedSubscribe,sharedSnapshot),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(info.authenticated)return children;
 return <div className="admin-backdrop"><section className="shared-login" role="dialog" aria-label="Admin sign in"><h1>Torah Ore</h1><p>Event control</p>{!info.configured?<p>The owner needs to set the admin password in Vercel before signing in.</p>:<form onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{await signIn(password);setPassword('')}catch(err){setError((err as Error).message)}finally{setBusy(false)}}}><label>Admin password<input autoFocus type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} required/></label><button className="primary" disabled={busy}>{busy?'Signing in…':'Sign in'}</button></form>}{error&&<p role="alert">{error}</p>}<button onClick={close}>Return to display</button></section></div>;
}
export function SharedStatus(){const info=useSyncExternalStore(sharedSubscribe,sharedSnapshot);return <section className="shared-status"><div><strong>{info.saving?'Saving shared event…':info.error?'Shared connection needs attention':'Shared event connected'}</strong><p>{info.error||'Phone changes appear on the TV automatically, usually within 10 seconds.'}</p></div>{info.error&&<button onClick={()=>location.reload()}>Reload shared data</button>}<button onClick={()=>void signOut()}>Sign out</button></section>}
export function ImportSharedEvent(){
 const [file,setFile]=useState<File|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function run(){if(!file)return;setBusy(true);setMessage('Reading your saved event…');try{
  if(file.size>180*1024*1024)throw Error('Choose an HTML file smaller than 180 MB.');
  const text=await file.text(),match=text.match(/<script\b(?=[^>]*\bid=["']torah-ore-package["'])[^>]*>([\s\S]*?)<\/script>/i);
  if(!match)throw Error('Choose an exported countdown HTML containing saved photos and settings.');
  const pack=parseEventPackage(match[1]);let count=0;
  const unpack=async(rows:typeof pack.photos)=>{const out:CloudPhoto[]=[];for(const {data,thumbnailData,...meta}of rows){setMessage(`Uploading image ${++count} / ${pack.photos.length+pack.prizes.length}`);const photo={...meta,blob:blobFromData(data),thumbnail:thumbnailData?blobFromData(thumbnailData):undefined};out.push(...await toCloud([photo]));}return out;};
  const photos=await unpack(pack.photos),prizes=await unpack(pack.prizes);const settings={...pack.settings};
  if(settings.logo?.startsWith('data:'))settings.logo=mediaURL(await uploadImage(await(await fetch(settings.logo)).blob()));
  else if(settings.logo)throw Error('The saved logo is not embedded. Upload the original logo after importing.');
  await commitShared({settings,photos,prizes,run:pack.run,prepared:pack.prepared});setFile(null);setMessage('Shared event imported. Open the same site URL on the TV.');
 }catch(error){setMessage((error as Error).message)}finally{setBusy(false)}}
 return <section className="shared-import"><h3>Move your saved event online</h3><p>Select your exported HTML. Images upload separately; the TV does not download the large HTML.</p><input type="file" accept=".html,.htm,text/html" disabled={busy} onChange={e=>{setFile(e.target.files?.[0]??null);setMessage('');e.target.value=''}}/>{file&&<div><p>Replace the shared event with <strong>{file.name}</strong>? Current shared settings, photos and prizes will be replaced after every image uploads.</p><button className="primary" disabled={busy} onClick={()=>void run()}>{busy?'Importing…':'Import and replace shared event'}</button><button disabled={busy} onClick={()=>setFile(null)}>Cancel</button></div>}{message&&<p role="status">{message}</p>}</section>;
}
