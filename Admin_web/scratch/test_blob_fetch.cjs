const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.goto('http://localhost:5174/', { waitUntil: 'networkidle2' });
  const result = await page.evaluate(async () => {
    const res = await fetch('/api/v1/attachments/file/att-787e5187-7859-4320-bb1a-465a57dd086a-1794598880381-medical_blood_panel.pdf');
    const blob = await res.blob();
    return { status: res.status, size: blob.size, type: blob.type };
  });
  console.log('Result:', result);
  await browser.close();
})();

