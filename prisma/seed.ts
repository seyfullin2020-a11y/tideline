import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';
const db=new PrismaClient();
async function seed(){if(process.env.NODE_ENV==='production')throw new Error('Development seed must not run in production.');const email=process.env.DEMO_EMAIL,password=process.env.DEMO_PASSWORD;if(!email||!password||password.length<12)throw new Error('Set DEMO_EMAIL and DEMO_PASSWORD (12+ chars) explicitly.');await db.user.upsert({where:{email},update:{},create:{email,username:'demo_captain',passwordHash:await hash(password,12)}});console.log('Development account created; no fabricated matches or ratings.');}
seed().catch(()=>{console.error('Seed failed. Check development credentials and database.');process.exitCode=1;}).finally(()=>db.$disconnect());
