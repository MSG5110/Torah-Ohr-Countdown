import type{VercelRequest,VercelResponse}from'@vercel/node';
import{requireAdmin,respondError}from'../server/auth.js';import{readEvent,updateEvent}from'../server/state.js';
export default async function handler(req:VercelRequest,res:VercelResponse){res.setHeader('Cache-Control','no-store');try{
 if(req.method==='GET'){const{state}=await readEvent();if(req.headers['if-none-match']===`"${state.revision}"`)return res.status(304).end();res.setHeader('ETag',`"${state.revision}"`);return res.json(state);}
 if(req.method==='PATCH'){requireAdmin(req);if(JSON.stringify(req.body??{}).length>1000000)return res.status(413).json({error:'The update is too large. Upload images separately.'});if(typeof req.body?.revision!=='string')return res.status(400).json({error:'Missing event revision.'});return res.json(await updateEvent(req.body.patch,req.body.revision));}
 res.status(405).end();
}catch(error){respondError(res,error)}}
