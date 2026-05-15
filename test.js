import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

  await page.goto('http://localhost:5173');
  
  // Login
  await page.type('input[placeholder="성함 입력"]', '박재형');
  await page.type('input[placeholder="YYMMDD"]', '940721');
  await page.click('button[type="submit"]');
  
  await page.waitForSelector('.menu-grid');
  console.log("Logged in");
  
  // Go to AI
  const aiButton = await page.$$('.menu-card');
  await aiButton[3].click();
  
  await page.waitForSelector('.chat-input-wrapper input');
  console.log("In AI chat");
  await page.type('.chat-input-wrapper input', '안녕하세요');
  await page.click('.chat-send-btn');
  
  await new Promise(r => setTimeout(r, 5000));
  
  const messages = await page.$$eval('.chat-bubble', els => els.map(e => e.innerText));
  console.log("Chat messages:", messages);

  // Now test Heart
  await page.goto('http://localhost:5173');
  await page.waitForSelector('.menu-grid');
  const churchButton = await page.$$('.menu-card');
  await churchButton[1].click();
  
  await page.waitForSelector('.actions');
  const actions = await page.$$('.actions');
  await actions[0].click();
  
  await new Promise(r => setTimeout(r, 1000));
  const newActions = await page.$$eval('.actions', els => els.map(e => e.innerText));
  console.log("Heart texts:", newActions);
  
  await browser.close();
})();
