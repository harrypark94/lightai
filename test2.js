import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
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
  console.log("Before click:", await actions[0].evaluate(e => e.innerText));
  
  await actions[0].click();
  await new Promise(r => setTimeout(r, 1000));
  
  const actionsAfter = await page.$$('.actions');
  console.log("After click:", await actionsAfter[0].evaluate(e => e.innerText));

  await browser.close();
})();
