const puppeteer = require('puppeteer-core');

async function debug() {
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('http://localhost:5173/admin/patients', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.patients-table-row', { timeout: 10000 });
  await new Promise(r => setTimeout(r, 500));

  const before = await page.evaluate(() => {
    const canvas = document.querySelector('.patients-main-canvas');
    return {
      clientHeight: canvas.clientHeight,
      scrollHeight: canvas.scrollHeight,
    };
  });
  console.log('Before flex-shrink: 0:', before);

  // Apply flex-shrink: 0 to table container
  await page.evaluate(() => {
    document.querySelector('.patients-table-container').style.flexShrink = '0';
    document.querySelector('.patients-page-header').style.flexShrink = '0';
    document.querySelector('.patients-kpi-grid').style.flexShrink = '0';
    document.querySelector('.patients-toolbar').style.flexShrink = '0';
  });

  const after = await page.evaluate(() => {
    const canvas = document.querySelector('.patients-main-canvas');
    const tableContainer = document.querySelector('.patients-table-container');
    const pagination = document.querySelector('.patients-pagination');

    canvas.scrollTop = 500;
    return {
      clientHeight: canvas.clientHeight,
      scrollHeight: canvas.scrollHeight,
      tableContainerHeight: tableContainer.offsetHeight,
      scrollTop: canvas.scrollTop,
      hasPagination: !!pagination,
      paginationRect: pagination ? pagination.getBoundingClientRect() : null,
    };
  });
  console.log('After flex-shrink: 0:', after);

  await browser.close();
}

debug();
