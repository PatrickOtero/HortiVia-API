import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { seedTraining } from '../prisma/training-seed';

// Separate entry point: no author reset or existing article seed side effects.
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required.');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
seedTraining(prisma).then(result => console.log(result)).catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
