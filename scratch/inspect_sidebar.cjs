const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/admin/users/user-1', { waitUntil: 'networkidle0' });
  const sidebar = await page.$('.careid-sidebar');
  const sidebarBox = await sidebar.boundingBox();
  console.log('sidebarBox:', sidebarBox);
  const navList = await page.$('.sidebar-nav-list');
  const navListBox = await navList.boundingBox();
  console.log('navListBox:', navListBox);
  const bottomActions = await page.$('.sidebar-bottom-actions');
  const bottomActionsBox = await bottomActions.boundingBox();
  console.log('bottomActionsBox:', bottomActionsBox);
  const styles = await page.evaluate(() => {
    const sb = document.querySelector('.careid-sidebar');
    const nl = document.querySelector('.sidebar-nav-list');
    const ba = document.querySelector('.sidebar-bottom-actions');
    const csSb = window.getComputedStyle(sb);
    const csNl = window.getComputedStyle(nl);
    const csBa = window.getComputedStyle(ba);
    return {
      sidebar: { height: csSb.height, overflow: csSb.overflow, display: csSb.display },
      navList: { height: csNl.height, overflowY: csNl.overflowY, flex: csNl.flex },
      bottomActions: { height: csBa.height, display: csBa.display, position: csBa.position }
    };
  });
  console.log('styles:', JSON.stringify(styles, null, 2));
  await browser.close();
})();
