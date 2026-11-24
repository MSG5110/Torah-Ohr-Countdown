import type{VercelRequest,VercelResponse}from'@vercel/node';import{presignUrl,issueSignedToken,del}from'@vercel/blob';import{mediaPathValid}from'../src/sharedTypes.js';import{requireAdmin,respondError}from'../server/auth.js';import{readEvent}from'../server/state.js';
let signing:Awaited<ReturnType<typeof issueSignedToken>>|undefined;
export default async function handler(req:VercelRequest,res:VercelResponse){try{
 const path=req.query.path;if(!mediaPathValid(path))return res.status(400).end();
 if(req.method==='DELETE'){requireAdmin(req);const{state}=await readEvent();const used=[...state.photos,...state.prizes].some(p=>p.mediaPath===path||p.thumbnailPath===path)||state.settings.logo===`/api/media?path=${encodeURIComponent(path)}`;if(used)return res.status(409).json({error:'The image is still in use.'});await del(path);return res.status(204).end();}
 if(req.method!=='GET')return res.status(405).end();
 if(!signing||signing.validUntil-Date.now()<20*60000)signing=await issueSignedToken({operations:['get'],validUntil:Date.now()+60*60000});
 const{presignedUrl}=await presignUrl(signing,{pathname:path,operation:'get',access:'private',validUntil:Date.now()+15*60000});
 res.setHeader('Cache-Control','public,max-age=300');res.setHeader('X-Content-Type-Options','nosniff');res.redirect(302,presignedUrl);
}catch(error){respondError(res,error)}}
