import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { prisma } from '@/utils/prisma.js';

const trustedOrigins = [
   process.env.FRONTEND_ORIGIN ??
      process.env.FRONTEND_URL ??
      'http://localhost:5173',
   'http://localhost:3000',
   'http://localhost:8000',
];

export const auth = betterAuth({
   baseURL: process.env.BETTER_AUTH_URL,

   database: prismaAdapter(prisma, {
      provider: 'postgresql',
   }),

   emailAndPassword: {
      enabled: true,
   },

   session: {
      updateAge: 60 * 60 * 24,
   },

   trustedOrigins,

   user: {
      additionalFields: {
         status: {
            type: 'string',
            required: false,
            defaultValue: 'ACTIVE',
         },
         role: {
            type: 'string',
            required: false,
            defaultValue: 'CS_AGENT',
         },
      },
   },
});
