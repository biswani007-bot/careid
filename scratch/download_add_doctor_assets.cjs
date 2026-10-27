const http = require('http');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'src', 'assets', 'doctors');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const assets = [
  { url: 'http://localhost:3845/assets/f62b53b15f40b5ea2fb8076850123cac1fc32577.svg', file: 'icon-back-arrow.svg' },
  { url: 'http://localhost:3845/assets/ca5b986cc51b7f008137704b994e6a386bb7319c.svg', file: 'sec-personal.svg' },
  { url: 'http://localhost:3845/assets/21033ec9d02f001db0e51885633f08d6f5934eb8.svg', file: 'icon-upload-photo.svg' },
  { url: 'http://localhost:3845/assets/7ff4b457aade138d20bbdb01b32563806adcb9e2.svg', file: 'sec-professional.svg' },
  { url: 'http://localhost:3845/assets/b1ac4377d8336ce3366eceeb0fce58a9610f245e.svg', file: 'sec-hospital.svg' },
  { url: 'http://localhost:3845/assets/4560c5df1e70ba770c7fd4c8d69815f725d1a23f.svg', file: 'sec-verification.svg' },
  { url: 'http://localhost:3845/assets/95387a7e863388c69bdce8372a8d9ff8ad4f1760.svg', file: 'doc-medical-license.svg' },
  { url: 'http://localhost:3845/assets/e205dc1943fd919fa758fd3b7c3598beb719bc62.svg', file: 'doc-government-id.svg' },
  { url: 'http://localhost:3845/assets/3124de2b8d49c79f44f8044a2600c03a5b5445f0.svg', file: 'doc-affiliation-letter.svg' },
  { url: 'http://localhost:3845/assets/538622f2531ed90232b6f93b26893af8383b42df.svg', file: 'sec-security.svg' },
  { url: 'http://localhost:3845/assets/666b7bf9f9186c65f1fbe3ca43ac516425170ea4.svg', file: 'icon-copy-password.svg' },
  { url: 'http://localhost:3845/assets/fadd198d26aadd8b0ee816378d8a8139f72021b1.svg', file: 'icon-btn-arrow.svg' },
];

let pending = assets.length;
assets.forEach(({ url, file }) => {
  const dest = path.join(targetDir, file);
  const fileStream = fs.createWriteStream(dest);
  http.get(url, (res) => {
    if (res.statusCode === 200) {
      res.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        console.log(`Saved: ${file}`);
        if (--pending === 0) console.log('All Add Doctor assets downloaded successfully!');
      });
    } else {
      console.error(`Failed ${file}: HTTP ${res.statusCode}`);
      fileStream.close();
      if (--pending === 0) console.log('Done with errors');
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${file}:`, err.message);
    fileStream.close();
    if (--pending === 0) console.log('Done with errors');
  });
});
