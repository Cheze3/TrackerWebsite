import { scrapeProduct } from './src/lib/scrape.js';

async function runTest() {
  const testUrl = 'https://www.adidas.com.vn/vi/giay-adizero-boston-13/JS4940.html';

  console.log(`🔍 Testing scraper on: ${testUrl}\n`);

  try {
    const startTime = Date.now();
    const result = await scrapeProduct(testUrl);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('✅ Scraping Successful!');
    console.log(`⏱️ Time taken: ${duration}s`);
    console.log('-----------------------------------');
    console.log(JSON.stringify(result, null, 2));
    console.log('-----------------------------------');
  } catch (error) {
    console.error('❌ Scraping Failed!');
    console.error(error.message);
  }
}

runTest();