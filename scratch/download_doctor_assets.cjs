const http = require('http');
const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '..', 'src', 'assets', 'doctors');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const assets = [
  { url: 'http://localhost:3845/assets/71ce7df9ba66000a518da8c1682583ec62b208a3.png', file: 'doctor-robert-chen.png' },
  { url: 'http://localhost:3845/assets/97aa2ffff425a8121c4882991d7c3c569b0019b9.png', file: 'doctor-sarah-jenkins.png' },
  { url: 'http://localhost:3845/assets/f91f35caa7e2cc9ac5f51672c8152cd85b6e47c5.svg', file: 'icon-add-doctor.svg' },
  { url: 'http://localhost:3845/assets/d217c02f0a2e3d1b4f5bbd5fcfae1edfa0da0098.svg', file: 'kpi-total-doctors.svg' },
  { url: 'http://localhost:3845/assets/dcabbaa29316d57b9589ef7a3c20cf77f8f591a3.svg', file: 'kpi-verified-doctors.svg' },
  { url: 'http://localhost:3845/assets/4de63c34e55faba4ccefab215d8a8d09a655a33e.svg', file: 'kpi-pending-doctors.svg' },
  { url: 'http://localhost:3845/assets/8fc0cd025e5bc2428e33b48148ee67b110dc17ce.svg', file: 'kpi-suspended-doctors.svg' },
  { url: 'http://localhost:3845/assets/ae4ea0bbbd053a495dd4e0b14cf76bace2db61f8.svg', file: 'icon-chevron-down.svg' },
  { url: 'http://localhost:3845/assets/8bf9d70ebdce2238839cca0e727010cbbfe590b1.svg', file: 'icon-kebab.svg' },
  { url: 'http://localhost:3845/assets/c1154617ffd0e07392e154ef40d615f63c7d14bf.svg', file: 'icon-chevron-right.svg' },
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
        if (--pending === 0) console.log('All assets downloaded successfully!');
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
