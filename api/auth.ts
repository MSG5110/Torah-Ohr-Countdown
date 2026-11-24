import type{VercelRequest,VercelResponse}from'@vercel/node';
import{authenticated,configured,login,logout,requireAdmin,respondError}from'../server/auth.js';
export default function handler(req:VercelRequest,res:VercelResponse){res.setHeader('Cache-Control','no-store');try{
 if(req.method==='POST')login(req,res);else if(req.method==='DELETE'){requireAdmin(req);logout(res);}else if(req.method!=='GET')return res.status(405).end();
 res.json({authenticated:req.method==='POST'||req.method==='GET'&&authenticated(req),configured:configured(),storageConfigured:!!(process.env.BLOB_READ_WRITE_TOKEN||process.env.BLOB_STORE_ID)});
}catch(error){respondError(res,error)}}
