// src/lib/auth.ts
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-key';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(password, hashed);
}

export function generateToken(payload: { userId: string; email: string } | object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export async function getCurrentUser() {
  const devUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test Dev User',
      passwordHash: 'dev_mock_password_hash',
    },
  });

  return {
    userId: devUser.id,
    email: devUser.email,
    name: devUser.name,
  };
}