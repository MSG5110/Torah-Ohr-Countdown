import type{VercelRequest,VercelResponse}from'@vercel/node';import{handleUpload}from'@vercel/blob/client';
import{requireAdmin,respondError}from'../server/auth.js';import{mediaPathValid}from'../src/sharedTypes.js';
export default async function handler(req:VercelRequest,res:VercelResponse){res.setHeader('Cache-Control','no-store');if(req.method!=='POST')return res.status(405).end();try{
 const result=await handleUpload({request:req,body:req.body,onBeforeGenerateToken:async(path)=>{requireAdmin(req);if(!mediaPathValid(path))throw Error('Invalid image path.');return{allowedContentTypes:['image/jpeg','image/png','image/webp','image/svg+xml'],maximumSizeInBytes:60*1024*1024,addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+15*60000}}});res.json(result);
}catch(error){respondError(res,error)}}
