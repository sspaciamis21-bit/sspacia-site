import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
dotenv.config();

try {
  console.log('Generating Prisma Client with custom script...');
  console.log('Using DATABASE_URL:', process.env.DATABASE_URL?.split('@')[0] + '@...');
  execSync('npx prisma generate', { stdio: 'inherit', env: process.env });
  console.log('Success!');
} catch (e) {
  console.error('Prisma generation failed!');
  process.exit(1);
}
