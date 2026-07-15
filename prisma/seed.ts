import { PrismaClient } from '@prisma/client'; import bcrypt from 'bcryptjs';
const db=new PrismaClient();
async function main(){const email=process.env.INITIAL_ADMIN_EMAIL||'admin@aphelion.local';const password=process.env.INITIAL_ADMIN_PASSWORD||'ChangeMe123!';await db.user.upsert({where:{email},update:{role:'ADMIN'},create:{email,password:await bcrypt.hash(password,12),name:'Aphelion Admin',role:'ADMIN'}});}
main().finally(()=>db.$disconnect());
