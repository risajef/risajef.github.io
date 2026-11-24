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
    if (request.url === '/theme.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(fs.readFileSync('theme/theme.js'));
    } else if (request.url === '/style.css') {
      response.setHeader('Content-Type', 'text/css');
      response.end(fs.readFileSync('theme/style.css'));
    } else if (request.url === '/assets/theme/app-theme.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(fs.readFileSync('docs/assets/theme/app-theme.js'));
    } else if (request.url === '/assets/theme/app-theme.css') {
      response.setHeader('Content-Type', 'text/css');
      response.end(fs.readFileSync('docs/assets/theme/app-theme.css'));
    } else if (request.url === '/theme-fixture/') {
      response.setHeader('Content-Type', 'text/html');
      response.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="color-scheme" content="light dark"><meta name="theme-color" content="#FFFFFF"><script src="/theme.js"></script><link rel="stylesheet" href="/style.css"></head><body><header class="site-header"><div class="header-identity"><button class="theme-toggle" id="theme-toggle" type="button" aria-label="Dark mode" aria-pressed="false" data-enable-dark="Enable dark mode" data-enable-light="Enable light mode"><svg class="theme-toggle__icon theme-toggle__moon" viewBox="0 0 24 24" aria-hidden="true"></svg><svg class="theme-toggle__icon theme-toggle__sun" viewBox="0 0 24 24" aria-hidden="true"></svg></button></div></header><main class="content"><h1>Theme preview</h1><p>Readable theme content.</p><iframe id="tool-frame" src="/assets/apps/theme-fixture/"></iframe></main></body></html>`);
    } else if (request.url === '/assets/apps/theme-fixture/') {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><html><head><script src="/assets/theme/app-theme.js"></script><link rel="stylesheet" href="/assets/theme/app-theme.css"></head><body style="background: #fff">Tool theme fixture</body></html>');
    } else if (request.url === '/embeds/') {
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

    const themePage = await browser.newPage();
    await themePage.emulateMediaFeatures([{name: 'prefers-color-scheme', value: 'dark'}]);
    await themePage.goto(`${origin}/theme-fixture/`);
    assert.equal(await themePage.evaluate(() => document.documentElement.dataset.theme), 'dark');
    assert.equal(await themePage.$eval('#theme-toggle', element => element.getAttribute('aria-pressed')), 'true');
    assert.equal(await themePage.$eval('body', element => getComputedStyle(element).backgroundColor), 'rgb(23, 23, 23)');
    assert.equal(await themePage.$eval('meta[name="theme-color"]', element => element.content), '#171717');
    const toolFrame = await (await themePage.$('#tool-frame')).contentFrame();
    await toolFrame.waitForFunction(() => document.documentElement.dataset.siteTheme === 'dark');
    assert.equal(await toolFrame.$eval('body', element => getComputedStyle(element).backgroundColor), 'rgb(25, 23, 22)');

    await themePage.click('#theme-toggle');
    assert.equal(await themePage.evaluate(() => document.documentElement.dataset.theme), 'light');
    assert.equal(await themePage.$eval('#theme-toggle', element => element.title), 'Enable dark mode');
    assert.equal(await themePage.evaluate(() => localStorage.getItem('retoweber-theme')), 'light');
    await toolFrame.waitForFunction(() => document.documentElement.dataset.siteTheme === 'light');
    assert.equal(await toolFrame.$eval('body', element => getComputedStyle(element).backgroundColor), 'rgb(255, 255, 255)');
    await themePage.reload();
    assert.equal(await themePage.evaluate(() => document.documentElement.dataset.theme), 'light');

    await themePage.evaluate(() => localStorage.removeItem('retoweber-theme'));
    await themePage.emulateMediaFeatures([{name: 'prefers-color-scheme', value: 'light'}]);
    await themePage.reload();
    assert.equal(await themePage.evaluate(() => document.documentElement.dataset.theme), 'light');
    await themePage.emulateMediaFeatures([{name: 'prefers-color-scheme', value: 'dark'}]);
    await themePage.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
    console.log('Parent RSS, iframe, and synchronized theme browser checks passed');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
