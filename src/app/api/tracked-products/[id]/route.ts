import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

interface Params {
  params: Promise<{ id: string }>;
}

// PATCH /api/tracked-products/[id] - Update target price or active status
export async function PATCH(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const { targetPrice, isActive } = await request.json();

    // Verify ownership before updating
    const existing = await prisma.trackedProduct.findFirst({
      where: { id, userId: user.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tracked product not found.' }, { status: 404 });
    }

    const updated = await prisma.trackedProduct.update({
      where: { id },
      data: {
        ...(targetPrice !== undefined && { targetPrice: parseFloat(targetPrice) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
      },
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/tracked-products/[id] - Delete a tracked product entry
export async function DELETE(request: Request, { params }: Params) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Ensure the tracked product belongs to the authenticated user
    const existing = await prisma.trackedProduct.findFirst({
      where: { id, userId: user.userId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Tracked product not found.' }, { status: 404 });
    }

    await prisma.trackedProduct.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Tracked product removed successfully.' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}