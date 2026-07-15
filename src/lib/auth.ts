import {cookies} from 'next/headers'; import {db} from './db'; import {SignJWT,jwtVerify} from 'jose';
const secret=new TextEncoder().encode(process.env.AUTH_SECRET||'dev-secret-change-me');
export async function createSession(userId:string){const token=await new SignJWT({userId}).setProtectedHeader({alg:'HS256'}).setExpirationTime('7d').sign(secret);await db.session.create({data:{token,userId,expires:new Date(Date.now()+604800000)}});return token;}
export async function getUser(){const token=cookies().get('aphelion_session')?.value;if(!token)return null;try{const {payload}=await jwtVerify(token,secret);return db.user.findUnique({where:{id:String(payload.userId)}})}catch{return null;}}
