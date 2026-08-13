import { scrapeProduct } from './src/lib/scrape.js';

async function test() {
  const url = 'https://www.adidas.com.vn/vi/giay-adizero-boston-13/JS4940.html';
  console.log(`Scraping: ${url}...`);

  try {
    const data = await scrapeProduct(url);
    console.log('✅ Scraped Data Ready for Database Insertion:');
    console.log(data);
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

test();
