const puppeteer = require('puppeteer');
const toBuffer = require('data-uri-to-buffer');
const fs = require('fs');

main().catch(console.error);

async function main() {

  const browser = await puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: true,
    args: [
      '--enable-usermedia-screen-capturing',
      '--allow-http-screen-capture',
      '--no-sandbox',
      '--auto-select-desktop-capture-source=pickme',
      '--disable-setuid-sandbox',
      '--load-extension=' + __dirname, ,
      '--disable-extensions-except=' + __dirname,
    ],
    // executablePath: 'google-chrome-unstable',
  });

  const [page] = await browser.pages();
  page.on('console', async msg => console[msg.type()](...await Promise.all(msg.args().map(j => j.jsonValue()))));
  page.on('error', console.error);
  page.on('pageerror', console.error);

  await page.goto('http://tobiasahlin.com/spinkit/', { waitUntil: 'networkidle2' });

  const data = await page.evaluate(() => new Promise(_ => window.addEventListener('message', event => {
    if (event.data.type === 'download') _(event.data.data);
  })));
  fs.writeFileSync('screencast.webm', toBuffer(data));
  console.log('Done');
  return browser.close();
}
