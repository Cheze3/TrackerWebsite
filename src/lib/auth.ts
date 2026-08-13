import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-dev-secret-key';

/**
 * Hashes a plaintext password for storage.
 */
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

/**
 * Compares a plaintext password against a stored hash.
 */
export async function comparePassword(password: string, hashed: string): Promise<boolean> {
  return await bcrypt.compare(password, hashed);
}

/**
 * Generates a JWT token for standard user sessions.
 */
export function generateToken(payload: { userId: string; email: string } | object): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Mock current user function for development mode.
 */
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