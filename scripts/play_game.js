const { chromium } = require('/Users/tom.chang/code/ai_projects/snake-ai/frontend/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('1. Opening game...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1500);
  
  // 截图
  await page.screenshot({ path: '/tmp/step1_home.png' });
  console.log('Screenshot 1: Home');
  
  // 点击用户名编辑
  console.log('2. Clicking username area...');
  try {
    await page.click('#summary-name', { timeout: 2000 });
    await page.waitForTimeout(500);
  } catch(e) {
    console.log('No username area found, skipping...');
  }
  
  // 输入新名字
  console.log('3. Entering name TommyBrowser...');
  try {
    const nameInput = await page.$('#name-input');
    if (nameInput) {
      await nameInput.fill('TommyBrowser');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    }
  } catch(e) {
    console.log('No name input, trying different approach...');
  }
  
  // 截图
  await page.screenshot({ path: '/tmp/step2_name.png' });
  console.log('Screenshot 2: After name');
  
  // 点击 AI 模式按钮
  console.log('4. Clicking AI mode...');
  try {
    await page.click('#ai-mode-btn', { timeout: 2000 });
    await page.waitForTimeout(300);
  } catch(e) {
    console.log('AI button not found');
  }
  
  // 点击开始按钮
  console.log('5. Clicking Start...');
  try {
    await page.click('#start-btn', { timeout: 2000 });
    console.log('Game started!');
    await page.waitForTimeout(6000); // 玩 6 秒
  } catch(e) {
    console.log('Start button not found');
  }
  
  // 截图
  await page.screenshot({ path: '/tmp/step3_game.png', fullPage: true });
  console.log('Screenshot 3: During game');
  
  await browser.close();
  console.log('Done!');
})();
