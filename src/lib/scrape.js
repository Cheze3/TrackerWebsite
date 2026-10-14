// src/lib/scrape.js
import puppeteer from 'puppeteer';
import { URL } from 'url';
import chromium from '@sparticuz/chromium';

// 1. HARDCODED SITE SELECTORS MAP
const SITE_SELECTORS = {
  'adidas.com.vn': {
    store: 'Adidas',
    title: '[data-testid="product-title"]',
    // Target the last span to get the selling price when on sale (ignores strike-through original price)
    price: '[data-testid="main-price"] span:last-child, [data-testid="main-price"]',
    waitTarget: '[data-testid="product-title"]',
  },
  'nike.com': {
    store: 'Nike',
    title: 'h1[data-test="product-title"], #pdp_product_title',
    price: '[data-testid="currentPrice-container"]',
    waitTarget: '[data-testid="currentPrice-container"]',
  },
  'uniqlo.com': {
    store: 'Uniqlo',
    title: 'h1[data-testid="ITOTypography"]',
    price: '.fr-ec-price-text, .fr-ec-price',
    waitTarget: '.fr-ec-price-text',
  },
};

// Extract domain key (e.g., "adidas.com.vn" or "nike.com")
const getDomain = (url) => {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.replace(/^www\./, '');
    if (host.includes('nike.com')) return 'nike.com';
    if (host.includes('adidas.com.vn')) return 'adidas.com.vn';
    return host;
  } catch {
    return null;
  }
};

// Convert string prices like "2.950.000₫" or "$120.00" to numeric Float (2950000 or 120)
const parsePrice = (priceStr) => {
  if (!priceStr) return null;
  const digitsOnly = priceStr.replace(/[^0-9]/g, '');
  const parsed = parseFloat(digitsOnly);
  return isNaN(parsed) ? null : parsed;
};

export async function launchBrowser() {
  if (process.env.VERCEL) {
    const puppeteer = (await import('puppeteer-core')).default;
    return puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: 'shell',
    });
  }
  const puppeteer = (await import('puppeteer')).default;
  return puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
    ],
  });
}

export async function scrapeProduct(url, sharedBrowser) {
  const domain = getDomain(url);
  const config = SITE_SELECTORS[domain];

  if (!config) {
    throw new Error(`No selector configuration found for domain: ${domain}`);
  }

  const browser = sharedBrowser ?? (await launchBrowser());
  const page = await browser.newPage();

  try {
    const page = await browser.newPage();

    await page.setViewport({ width: 1280, height: 800 });

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    );

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    if (config.waitTarget) {
      await page.waitForSelector(config.waitTarget, { timeout: 15000 });
    }

    const rawData = await page.evaluate((selectors) => {
      const titleEl = document.querySelector(selectors.title);

      // 1. Scope search inside the container holding the main title
      // This prevents matching recommended product cards or carousels lower down the page
      const mainContainer = titleEl
        ? titleEl.closest('main') ||
          titleEl.closest('section') ||
          titleEl.closest('div[class*="sidebar"]') ||
          titleEl.parentElement?.parentElement?.parentElement
        : document;

      let priceEl = mainContainer
        ? mainContainer.querySelector(selectors.price)
        : document.querySelector(selectors.price);

      if (!priceEl) {
        priceEl = document.querySelector(selectors.price);
      }

      // 2. If multiple price spans exist (e.g. original crossed-out price + current sale price),
      // pick the last non-empty span which contains the actual active selling price
      if (priceEl && priceEl.querySelectorAll('span').length > 0) {
        const spans = Array.from(priceEl.querySelectorAll('span')).filter(
          (s) => s.innerText.trim().length > 0
        );
        if (spans.length > 0) {
          priceEl = spans[spans.length - 1];
        }
      }

      return {
        productName: titleEl ? titleEl.innerText.trim() : null,
        rawPrice: priceEl ? priceEl.innerText.trim() : null,
      };
    }, config);

    if (!rawData.productName || !rawData.rawPrice) {
      throw new Error(`Failed to locate title or price element on ${domain}`);
    }

    const numericPrice = parsePrice(rawData.rawPrice);
    if (!numericPrice) {
      throw new Error(`Could not parse numerical value from price: "${rawData.rawPrice}"`);
    }

    return {
      productName: rawData.productName,
      price: numericPrice,
      currency: 'VND',
      store: config.store,
    };
  } finally {
    await browser.close();
    if (!sharedBrowser) await browser.close();
  }
}