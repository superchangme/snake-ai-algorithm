const { chromium } = require('/Users/tom.chang/code/ai_projects/snake-ai/frontend/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('1. Opening game...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1500);
  
  // 输入名字
  console.log('2. Entering name TommyBrowser...');
  await page.fill('#required-name', 'TommyBrowser');
  await page.click('#name-confirm');
  await page.waitForTimeout(1000);
  
  // 点击历史按钮
  console.log('3. Clicking history button...');
  await page.click('#history-btn');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: '/tmp/history_tab.png', fullPage: true });
  console.log('History tab screenshot saved!');
  
  await browser.close();
  console.log('Done!');
})();
