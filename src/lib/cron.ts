import cron from 'node-cron';
import { prisma } from '@/lib/prisma';
// @ts-ignore
import { scrapeProduct } from '@/lib/scrape';

/**
 * Executes a single batch price check across all active products.
 * Can be called by the node-cron scheduler OR via an API route.
 */
export async function runPriceCheck() {
  console.log('[CRON] Starting price check...');
  const results = [];

  try {
    const activeProducts = await prisma.product.findMany({
      where: { trackedProducts: { some: { isActive: true } } },
      include: { trackedProducts: { where: { isActive: true } } },
    });

    if (activeProducts.length === 0) {
      console.log('[CRON] No active tracked products found.');
      return { message: 'No active tracked products found.', processed: 0, results: [] };
    }

    for (const product of activeProducts) {
      try {
        const scraped = await scrapeProduct(product.url);
        if (!scraped?.price) {
          results.push({ id: product.id, status: 'failed', error: 'No price returned from scraper' });
          continue;
        }

        const newPrice = Number(scraped.price);
        const currency = scraped.currency || 'VND';
        const previousPrice =
          product.currentPrice !== null && product.currentPrice !== undefined
            ? Number(product.currentPrice)
            : null;

        // Check if price has strictly dropped relative to the stored current price
        const isPriceDrop = previousPrice !== null && newPrice < previousPrice;

        if (isPriceDrop) {
          // 1. Record new price history entry
          await prisma.priceHistory.create({
            data: {
              productId: product.id,
              price: newPrice,
              currency,
            },
          });

          // 2. Update current product price in DB
          await prisma.product.update({
            where: { id: product.id },
            data: { currentPrice: newPrice },
          });

          // 3. Process notifications for all active trackers
          for (const tracker of product.trackedProducts) {
            const targetPrice = Number(tracker.targetPrice);

            // TYPE 1: PRICE_DROP (Triggers on ANY price decrease)
            await prisma.notification.create({
              data: {
                userId: tracker.userId,
                trackedProductId: tracker.id,
                type: 'PRICE_DROP',
                message: `Price drop for "${product.name}"! Decreased from ${previousPrice.toLocaleString()} ${currency} to ${newPrice.toLocaleString()} ${currency}.`,
              },
            });

            // TYPE 2: TARGET_REACHED (Triggers when the decreased price reaches or drops below target)
            if (newPrice <= targetPrice) {
              await prisma.notification.create({
                data: {
                  userId: tracker.userId,
                  trackedProductId: tracker.id,
                  type: 'TARGET_REACHED',
                  message: `Target reached! "${product.name}" is now ${newPrice.toLocaleString()} ${currency} (Target: ${targetPrice.toLocaleString()} ${currency}).`,
                },
              });
            }
          }
        } else if (previousPrice === null || newPrice !== previousPrice) {
          // Price increased or initial run — update database records without triggering notifications
          await prisma.priceHistory.create({
            data: {
              productId: product.id,
              price: newPrice,
              currency,
            },
          });

          await prisma.product.update({
            where: { id: product.id },
            data: { currentPrice: newPrice },
          });
        }

        results.push({ id: product.id, name: product.name, status: 'success', price: newPrice });
      } catch (err: any) {
        console.error(`[CRON] Error scraping ${product.id}:`, err.message);
        results.push({ id: product.id, status: 'failed', error: err.message });
      }
    }

    console.log('[CRON] Price check complete.');
    return { message: 'Price check completed successfully', processed: results.length, results };
  } catch (error: any) {
    console.error('[CRON] Fatal error in cron job:', error.message);
    throw error;
  }
}

/**
 * Initializes the background node-cron schedule (Runs every hour).
 */
export function startPriceUpdateCron() {
  cron.schedule('0 * * * *', async () => {
    try {
      await runPriceCheck();
    } catch (err: any) {
      console.error('[CRON] Scheduled execution error:', err.message);
    }
  });
}