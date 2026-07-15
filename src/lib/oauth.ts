import {db} from './db'; import {decrypt} from './encryption';
type Provider='github'|'google';
const keys=(p:Provider)=>({enabled:`${p.toUpperCase()}_ENABLED`,id:`${p.toUpperCase()}_CLIENT_ID`,secret:`${p.toUpperCase()}_CLIENT_SECRET`});
export async function getProvider(p:Provider){const k=keys(p);const values=await db.systemSetting.findMany({where:{key:{in:[k.enabled,k.id,k.secret]}}});const get=(key:string)=>values.find(x=>x.key===key)?.value;const secret=get(k.secret);return {enabled:get(k.enabled)==='true',clientId:get(k.id)||'',clientSecret:secret?decrypt(secret):''}}
