const { chromium } = require('/Users/tom.chang/code/ai_projects/snake-ai/frontend/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('1. Opening game...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: '/tmp/1_home.png' });
  
  // 点击 AI 模式
  console.log('2. Clicking AI mode...');
  await page.click('#ai-mode');
  await page.waitForTimeout(300);
  
  // 点击 WS 模式
  console.log('3. Clicking WS mode...');
  await page.click('#ws-mode');
  await page.waitForTimeout(300);
  
  await page.screenshot({ path: '/tmp/2_modes.png' });
  
  // 点击开始
  console.log('4. Clicking Start...');
  await page.click('#start-btn');
  console.log('Game started!');
  await page.waitForTimeout(5000); // 玩 5 秒
  
  await page.screenshot({ path: '/tmp/3_during.png', fullPage: true });
  console.log('Screenshot saved!');
  
  await browser.close();
  console.log('Done!');
})();
