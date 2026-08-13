import { prisma } from '@/lib/prisma';

export async function getCurrentUser() {
  // -------------------------------------------------------------
  // 🛠️ TEMPORARY DEV MODE: Mock User
  // Create or fetch a default test user directly from the database
  // -------------------------------------------------------------
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

  /* 
  // Restore your real auth logic once you build the login page:
  // const session = await getSession();
  // return session?.user || null;
  */
}