// src/app/api/tracked-products/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { scrapeProduct } from '@/lib/scrape';

// Helper function to round a number to 3 significant figures
function roundToThreeSigFigs(num: number): number {
  if (num === 0) return 0;
  return Number(num.toPrecision(3));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('q') || '';
    const tagFilter = searchParams.get('tag') || '';

    // Fetch tracked products with search/filter query applied
    const products = await prisma.trackedProduct.findMany({
      where: {
        ...(searchQuery && {
          product: {
            name: {
              contains: searchQuery,
              mode: 'insensitive',
            },
          },
        }),
        ...(tagFilter && {
          product: {
            tags: {
              some: {
                tag: {
                  name: {
                    contains: tagFilter,
                    mode: 'insensitive',
                  },
                },
              },
            },
          },
        }),
      },
      include: {
        product: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
            priceHistory: {
              orderBy: { checkedAt: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching tracked products:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tracked products' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    // Fallback ID for single-user mode if auth isn't enforced
    const userId = user?.userId || 'default-user-id';

    const body = await request.json();
    const { url, targetType = 'FIXED', targetValue, tags = [] } = body;

    if (!url || targetValue === undefined || targetValue === null) {
      return NextResponse.json(
        { error: 'URL and target value are required' },
        { status: 400 }
      );
    }

    // 1. Scrape current product info first to get the initial baseline price
    const scrapedData = await scrapeProduct(url);

    if (!scrapedData?.price) {
      return NextResponse.json(
        { error: 'Failed to scrape product price from URL' },
        { status: 400 }
      );
    }

    // 2. Compute targetPrice based on targetType with 3 significant figures rounding
    let finalTargetPrice: number;
    let finalTargetPercent: number | null = null;

    if (targetType === 'PERCENTAGE') {
      finalTargetPercent = parseFloat(targetValue);
      // Math: Current Price * (1 - discount%)
      const rawTargetPrice = scrapedData.price * (1 - finalTargetPercent / 100);
      finalTargetPrice = roundToThreeSigFigs(rawTargetPrice);
    } else {
      finalTargetPrice = roundToThreeSigFigs(parseFloat(targetValue));
    }

    // 3. Process and upsert Tags if provided
    const tagIds: string[] = [];
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagInput of tags) {
        const cleanName = tagInput.toString().trim().toLowerCase();
        if (!cleanName) continue;

        const tagRecord = await prisma.tag.upsert({
          where: { name: cleanName },
          update: {},
          create: { name: cleanName },
        });
        tagIds.push(tagRecord.id);
      }
    }

    // 4. Upsert Product record and manage ProductTag relations
    const product = await prisma.product.upsert({
      where: { url },
      update: {
        currentPrice: scrapedData.price,
        ...(tagIds.length > 0 && {
          tags: {
            deleteMany: {},
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
      create: {
        url,
        name: scrapedData.productName,
        currentPrice: scrapedData.price,
        currency: scrapedData.currency || 'VND',
        store: scrapedData.store,
        ...(tagIds.length > 0 && {
          tags: {
            create: tagIds.map((tagId) => ({ tagId })),
          },
        }),
      },
    });

    // 5. Record Price History
    await prisma.priceHistory.create({
      data: {
        productId: product.id,
        price: scrapedData.price,
        currency: scrapedData.currency || 'VND',
      },
    });

    // 6. Create Tracked Product entry with nested product, tags, and price history included
    const trackedProduct = await prisma.trackedProduct.create({
      data: {
        userId,
        productId: product.id,
        targetType: targetType as 'FIXED' | 'PERCENTAGE',
        targetPrice: finalTargetPrice,
        targetPercent: finalTargetPercent,
        isActive: true,
      },
      include: {
        product: {
          include: {
            tags: {
              include: {
                tag: true,
              },
            },
            priceHistory: true,
          },
        },
      },
    });

    return NextResponse.json(trackedProduct, { status: 201 });
  } catch (error: any) {
    console.error('[POST Tracked Product Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Server error' },
      { status: 500 }
    );
  }
}