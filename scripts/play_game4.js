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
  await page.waitForTimeout(300);
  
  // 点击开始游戏（确认名字）
  console.log('3. Clicking confirm...');
  await page.click('#name-confirm');
  console.log('Name confirmed, game starting...');
  await page.waitForTimeout(1000);
  
  await page.screenshot({ path: '/tmp/1_after_name.png' });
  
  // 检查是否已经是 AI 模式
  console.log('4. Checking mode...');
  const aiMode = await page.$eval('#ai-mode', el => el.classList.contains('active'));
  console.log('AI mode active:', aiMode);
  
  if (!aiMode) {
    console.log('Clicking AI mode...');
    await page.click('#ai-mode');
    await page.waitForTimeout(300);
  }
  
  // 点击 WS 模式
  console.log('5. Clicking WS mode...');
  await page.click('#ws-mode');
  await page.waitForTimeout(300);
  
  await page.screenshot({ path: '/tmp/2_modes.png' });
  
  // 点击开始
  console.log('6. Clicking Start...');
  await page.click('#start-btn');
  console.log('Game started!');
  await page.waitForTimeout(6000); // 玩 6 秒
  
  await page.screenshot({ path: '/tmp/3_during.png', fullPage: true });
  console.log('Screenshot saved!');
  
  await browser.close();
  console.log('Done!');
})();
