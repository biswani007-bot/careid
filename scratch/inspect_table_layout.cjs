const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  const routes = [
    '/admin/records',
    '/admin/records/medical',
    '/admin/records/dental',
    '/admin/records/vision'
  ];

  for (const route of routes) {
    console.log(`\n=== Checking route: ${route} ===`);
    await page.goto(`http://localhost:5173${route}`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 1000));

    const info = await page.evaluate(() => {
      const table = document.querySelector('table');
      const rows = table ? Array.from(table.querySelectorAll('tbody tr')) : [];
      const tableCard = document.querySelector('.records-table-card') || document.querySelector('.category-table-card');
      const tableScroll = document.querySelector('.records-table-scroll') || document.querySelector('.category-table-scroll');
      const canvas = document.querySelector('.health-records-canvas') || document.querySelector('.category-records-canvas');
      const pagination = document.querySelector('.records-pagination-bar') || document.querySelector('.category-pagination-bar');

      const getBox = el => el ? el.getBoundingClientRect() : null;
      const getStyles = el => el ? window.getComputedStyle(el) : null;

      return {
        rowCount: rows.length,
        tableCard: tableCard ? {
          box: getBox(tableCard),
          overflow: getStyles(tableCard).overflow,
          height: getStyles(tableCard).height,
          maxHeight: getStyles(tableCard).maxHeight,
        } : null,
        tableScroll: tableScroll ? {
          box: getBox(tableScroll),
          overflowX: getStyles(tableScroll).overflowX,
          overflowY: getStyles(tableScroll).overflowY,
          height: getStyles(tableScroll).height,
          scrollHeight: tableScroll.scrollHeight,
          clientHeight: tableScroll.clientHeight,
        } : null,
        canvas: canvas ? {
          box: getBox(canvas),
          overflowY: getStyles(canvas).overflowY,
          scrollHeight: canvas.scrollHeight,
          clientHeight: canvas.clientHeight,
        } : null,
        pagination: pagination ? {
          box: getBox(pagination),
          visibleInViewport: (pagination.getBoundingClientRect().top >= 0 && pagination.getBoundingClientRect().bottom <= window.innerHeight),
          top: pagination.getBoundingClientRect().top,
          bottom: pagination.getBoundingClientRect().bottom
        } : null,
        rowBoxes: rows.map((r, i) => ({
          index: i + 1,
          top: r.getBoundingClientRect().top,
          bottom: r.getBoundingClientRect().bottom,
          height: r.getBoundingClientRect().height,
          inViewport: (r.getBoundingClientRect().bottom <= window.innerHeight && r.getBoundingClientRect().top >= 0)
        }))
      };
    });

    console.log('Row count:', info.rowCount);
    console.log('Table Card Box:', info.tableCard?.box);
    console.log('Table Scroll:', {
      clientHeight: info.tableScroll?.clientHeight,
      scrollHeight: info.tableScroll?.scrollHeight,
      overflowX: info.tableScroll?.overflowX,
      overflowY: info.tableScroll?.overflowY,
    });
    console.log('Canvas Scroll:', {
      clientHeight: info.canvas?.clientHeight,
      scrollHeight: info.canvas?.scrollHeight,
      overflowY: info.canvas?.overflowY,
    });
    console.log('Pagination in viewport without scrolling?:', info.pagination?.visibleInViewport, 'top:', info.pagination?.top);
    const visibleRows = info.rowBoxes.filter(r => r.inViewport).length;
    console.log(`Visible rows in initial viewport without scroll: ${visibleRows}/${info.rowCount}`);
    if (info.rowBoxes.length > 0) {
      console.log('First row top:', info.rowBoxes[0].top, 'Last row bottom:', info.rowBoxes[info.rowBoxes.length - 1].bottom);
    }
  }

  await browser.close();
})();
