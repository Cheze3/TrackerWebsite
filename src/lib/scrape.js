// src/lib/scrape.js
import { URL } from 'url';
import chromium from '@sparticuz/chromium';

const SITE_SELECTORS = {
  'adidas.com.vn': {
    store: 'Adidas',
    title: 'h1[data-testid="product-title"]',
    price: '[data-testid="main-price"]',
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

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// Extract domain key (e.g. "adidas.com.vn" or "nike.com")
const getDomain = (url) => {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    if (host.includes('nike.com')) return 'nike.com';
    if (host.includes('adidas.com.vn')) return 'adidas.com.vn';
    if (host.includes('uniqlo.com')) return 'uniqlo.com';
    return host;
  } catch {
    return null;
  }
};

// "4.200.000₫" -> 4200000. Strips all non-digits, so prices with decimals
// (e.g. "$120.00") would be wrong. Fine for VND.
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
      args: [...chromium.args, '--disable-blink-features=AutomationControlled'],
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
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(USER_AGENT);

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

    if (config.waitTarget) {
      try {
        await page.waitForSelector(config.waitTarget, { timeout: 15000 });
      } catch {
        // Report what the browser actually received (block page, captcha, etc.)
        const title = await page.title();
        const body = (
          await page.evaluate(() => document.body?.innerText || '')
        ).slice(0, 300);
        throw new Error(
          `Selector not found on ${domain}. Page title: "${title}". Body: "${body}"`
        );
      }
    }

    const rawData = await page.evaluate((selectors) => {
      const titleEl = document.querySelector(selectors.title);

      // Scope the price search to the container holding the main title so
      // recommended-product cards lower on the page are not matched.
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

      // If several spans exist (hidden label, crossed-out price, sale price),
      // take the last span that contains a digit: the active selling price.
      if (priceEl && priceEl.querySelectorAll('span').length > 0) {
        const spans = Array.from(priceEl.querySelectorAll('span')).filter(
          (s) => /\d/.test(s.innerText)
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
      throw new Error(
        `Could not parse numerical value from price: "${rawData.rawPrice}"`
      );
    }

    return {
      productName: rawData.productName,
      price: numericPrice,
      currency: 'VND',
      store: config.store,
    };
  } finally {
    await page.close().catch(() => {});
    // Only close a browser this call launched; a shared one is closed by the caller.
    if (!sharedBrowser) await browser.close();
  }
}