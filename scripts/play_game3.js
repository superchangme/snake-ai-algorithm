const { chromium } = require('/Users/tom.chang/code/ai_projects/snake-ai/frontend/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  console.log('1. Opening game...');
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1500);
  
  // 检查并关闭名字弹窗
  console.log('2. Checking for dialog...');
  const dialog = await page.$('#name-dialog');
  if (dialog) {
    const isVisible = await dialog.isVisible();
    console.log('Dialog visible:', isVisible);
    if (isVisible) {
      // 点击确定或关闭按钮
      const closeBtn = await page.$('#name-dialog .close-btn') || await page.$('#name-dialog button.primary');
      if (closeBtn) {
        await closeBtn.click();
        console.log('Dialog closed');
      }
      await page.waitForTimeout(500);
    }
  }
  
  await page.screenshot({ path: '/tmp/1_home.png' });
  
  // 点击 AI 模式
  console.log('3. Clicking AI mode...');
  await page.click('#ai-mode');
  await page.waitForTimeout(300);
  
  // 点击 WS 模式  
  console.log('4. Clicking WS mode...');
  await page.click('#ws-mode');
  await page.waitForTimeout(300);
  
  await page.screenshot({ path: '/tmp/2_modes.png' });
  
  // 点击开始
  console.log('5. Clicking Start...');
  await page.click('#start-btn');
  console.log('Game started!');
  await page.waitForTimeout(6000); // 玩 6 秒
  
  await page.screenshot({ path: '/tmp/3_during.png', fullPage: true });
  console.log('Screenshot saved!');
  
  await browser.close();
  console.log('Done!');
})();
