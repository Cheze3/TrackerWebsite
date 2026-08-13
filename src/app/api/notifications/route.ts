import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// GET /api/notifications - Retrieve user's price drop alerts
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    // Build filter query
    const whereClause: any = {
      userId: user.userId,
    };

    if (unreadOnly) {
      whereClause.isRead = false;
    }

    // Retrieve notifications with product context
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: whereClause,
        include: {
          trackedProduct: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  url: true,
                  currentPrice: true,
                  currency: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc', // Newest alerts first
        },
      }),
      prisma.notification.count({
        where: {
          userId: user.userId,
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({ notifications, unreadCount }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH /api/notifications - Mark ALL notifications as read
export async function PATCH(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: user.userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    return NextResponse.json(
      { message: 'All notifications marked as read', count: result.count },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}