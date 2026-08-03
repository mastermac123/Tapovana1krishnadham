import { handlers } from '@/lib/auth';

export const { GET, POST } = handlers;

// argon2 and Prisma are native; this route cannot run on the edge.
export const runtime = 'nodejs';
