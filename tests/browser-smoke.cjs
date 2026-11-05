const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const puppeteer = require('puppeteer');

(async () => {
  const server = http.createServer((request, response) => {
    if (request.url === '/assets/rss-feed.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(fs.readFileSync('docs/assets/rss-feed.js'));
    } else if (request.url === '/rss.xml') {
      response.setHeader('Content-Type', 'application/xml');
      response.end('<rss><channel><item><title>&lt;unsafe&gt;</title><link>/article/</link><description>Summary</description></item></channel></rss>');
    } else {
      response.end('<!doctype html><div data-rss-feed></div><script src="/assets/rss-feed.js"></script>');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await puppeteer.launch({headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    const origin = `http://127.0.0.1:${server.address().port}`;
    await page.goto(origin);
    await page.waitForSelector('.rss-feed__item');
    assert.equal(await page.$eval('.rss-feed__item a', element => element.textContent), '<unsafe>');
    assert.equal(await page.$('unsafe'), null);
    await page.setRequestInterception(true);
    page.on('request', request => request.url().endsWith('/rss.xml') ? request.abort() : request.continue());
    await page.reload();
    await page.waitForFunction(() => document.querySelector('[data-rss-feed]').textContent.includes('Unable to load'));
    assert.equal(await page.$eval('[data-rss-feed] a', element => element.getAttribute('href')), '/rss.xml');
    console.log('Parent RSS browser checks passed');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
