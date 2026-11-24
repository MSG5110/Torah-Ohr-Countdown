import { createHash,createHmac,timingSafeEqual,randomBytes } from 'node:crypto';
import type { VercelRequest,VercelResponse } from '@vercel/node';
const COOKIE='torah_admin';
function password(){const value=process.env.ADMIN_PASSWORD??'';if(value.length<16)throw Error('Set ADMIN_PASSWORD to at least 16 characters in Vercel.');return value;}
const digest=(value:string)=>createHash('sha256').update(value).digest();
export function configured(){return (process.env.ADMIN_PASSWORD?.length??0)>=16;}
export function authenticated(req:VercelRequest){
 try{const value=req.headers.cookie?.split(';').map(p=>p.trim()).find(p=>p.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!value)return false;const [payload,sig]=value.split('.');const expected=createHmac('sha256',password()).update(payload).digest('base64url');if(!sig||!timingSafeEqual(digest(sig),digest(expected)))return false;const data=JSON.parse(Buffer.from(payload,'base64url').toString());return typeof data.exp==='number'&&data.exp>Date.now();}catch{return false;}
}
export function sameOrigin(req:VercelRequest){
 const origin=req.headers.origin;if(!origin)return req.headers['sec-fetch-site']!=='cross-site';
 try{return new URL(origin).host===req.headers.host;}catch{return false;}
}
export function requireAdmin(req:VercelRequest){if(!sameOrigin(req))throw Object.assign(Error('Request origin is not allowed.'),{status:403});if(!authenticated(req))throw Object.assign(Error('Please sign in again.'),{status:401});}
export function login(req:VercelRequest,res:VercelResponse){
 if(!sameOrigin(req))throw Object.assign(Error('Request origin is not allowed.'),{status:403});
 const supplied=req.body?.password;if(typeof supplied!=='string'||supplied.length>512||!timingSafeEqual(digest(supplied),digest(password())))throw Object.assign(Error('Incorrect admin password.'),{status:401});
 const payload=Buffer.from(JSON.stringify({exp:Date.now()+14*86400000,nonce:randomBytes(16).toString('hex')})).toString('base64url');const sig=createHmac('sha256',password()).update(payload).digest('base64url');
 res.setHeader('Set-Cookie',`${COOKIE}=${payload}.${sig}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=1209600`);
}
export function logout(res:VercelResponse){res.setHeader('Set-Cookie',`${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`);}
export function respondError(res:VercelResponse,error:unknown){const e=error as {message?:string;status?:number};res.status(e.status??503).json({error:e.message??'Shared storage is temporarily unavailable.'});}
