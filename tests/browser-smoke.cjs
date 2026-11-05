const assert = require('node:assert/strict');
const fs = require('node:fs');
const http = require('node:http');
const puppeteer = require('puppeteer');

(async () => {
  const embeds = ['background-generator', 'buchfaltstudio', 'parallelismus'].map(slug => {
    const markdown = fs.readFileSync(`docs/tools/${slug}.en.md`, 'utf8');
    return markdown.match(/<iframe[\s\S]*?<\/iframe>/)[0].replace('loading="lazy"', 'loading="eager"');
  }).join('');
  const server = http.createServer((request, response) => {
    if (request.url === '/embeds/') {
      response.end(`<!doctype html><style>body {background: rgb(255, 255, 255)}</style><h1 id="parent">Parent</h1>${embeds}`);
    } else if (request.url.startsWith('/assets/apps/')) {
      response.end('<!doctype html><style>body {background: rgb(255, 0, 0)}</style><a href="child.html">Child</a><script>window.appOnly = true; localStorage.setItem("parent-fixture", "ok");</script>');
    } else if (request.url === '/assets/rss-feed.js') {
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
    await page.goto(`${origin}/embeds/`);
    for (const frameElement of await page.$$('iframe')) {
      const frame = await frameElement.contentFrame();
      await frame.waitForSelector('a');
      assert.equal(await frame.evaluate(() => window.appOnly), true);
      assert.equal(await frame.$eval('a', element => element.href), new URL('child.html', frame.url()).href);
    }
    assert.equal(await page.evaluate(() => window.appOnly), undefined);
    assert.equal(await page.$eval('body', element => getComputedStyle(element).backgroundColor), 'rgb(255, 255, 255)');
    assert.equal(await page.evaluate(() => localStorage.getItem('parent-fixture')), 'ok');
    console.log('Parent RSS and iframe browser checks passed');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
