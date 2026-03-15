const { chromium } = require('/Users/tom.chang/code/ai_projects/snake-ai/frontend/node_modules/playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  
  await page.goto('http://localhost:3000');
  await page.waitForTimeout(1500);
  
  // 输入名字
  await page.fill('#required-name', 'TommyBrowser');
  await page.click('#name-confirm');
  await page.waitForTimeout(1000);
  
  // 点击历史按钮
  await page.click('#history-btn');
  await page.waitForTimeout(500);
  
  // 点击排行榜 tab
  console.log('Clicking leaderboard tab...');
  await page.click('text=🏆 排行榜');
  await page.waitForTimeout(500);
  
  await page.screenshot({ path: '/tmp/leaderboard_tab.png', fullPage: true });
  console.log('Leaderboard tab screenshot saved!');
  
  await browser.close();
})();
