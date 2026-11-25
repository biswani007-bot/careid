const puppeteer = require('puppeteer-core');
const fs = require('fs');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  const imgBase64 = fs.readFileSync('src/assets/dashboard/careid-wordmark-raw.png').toString('base64');
  
  await page.setContent('<html><body><canvas id="c"></canvas></body></html>');

  const result = await page.evaluate((b64) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.getElementById('c');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imgData = ctx.getImageData(0, 0, img.width, img.height);
        const d = imgData.data;

        // Find bounding box of the CareID wordmark (between y=440 and y=700, excluding cloud on top and tagline on bottom)
        let minX = img.width, maxX = 0, minY = img.height, maxY = 0;
        for (let y = 440; y < 695; y++) {
          for (let x = 0; x < img.width; x++) {
            const idx = (y * img.width + x) * 4;
            const a = d[idx + 3];
            if (a > 20) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }

        // Now crop to the wordmark with a subtle 2px padding for antialiasing
        const cropW = maxX - minX + 1;
        const cropH = maxY - minY + 1;

        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = cropW;
        cropCanvas.height = cropH;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.drawImage(img, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

        resolve({
          box: { minX, minY, maxX, maxY, cropW, cropH, aspectRatio: (cropW / cropH).toFixed(3) },
          dataUrl: cropCanvas.toDataURL('image/png'),
        });
      };
      img.src = 'data:image/png;base64,' + b64;
    });
  }, imgBase64);

  console.log('Wordmark bounding box:', result.box);
  const base64Data = result.dataUrl.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('src/assets/dashboard/careid-logo.png', Buffer.from(base64Data, 'base64'));
  console.log('Saved src/assets/dashboard/careid-logo.png successfully!');

  await browser.close();
}

run().catch(console.error);
