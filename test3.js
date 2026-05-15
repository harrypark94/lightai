import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  
  await page.goto('http://localhost:5173');
  
  // Login
  await page.type('input[placeholder="성함 입력"]', '박재형');
  await page.type('input[placeholder="YYMMDD"]', '940721');
  await page.click('button[type="submit"]');
  
  await page.waitForSelector('.menu-grid');
  
  // Go to prayer
  const cards = await page.$$('.menu-card');
  await cards[1].click();
  
  await page.waitForSelector('.actions');
  const actions = await page.$$('.actions');
  
  await actions[0].click();
  await new Promise(r => setTimeout(r, 1000));
  
  await browser.close();
})();
