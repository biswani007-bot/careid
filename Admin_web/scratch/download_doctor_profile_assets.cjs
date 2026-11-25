const fs = require('fs');
const path = require('path');

const assets = [
  { url: 'http://localhost:3845/assets/5e110a4a815af6ed66a9775eed0362a7e68cebb5.png', name: 'doctor-sarah-jenkins-large.png' },
  { url: 'http://localhost:3845/assets/d104c527a162099bbd390f7b6cc633cf9a180ff5.svg', name: 'badge-verified.svg' },
  { url: 'http://localhost:3845/assets/1e8e448efd4a85eabbd0e36b8382490f8de97a90.svg', name: 'icon-edit-pencil.svg' },
  { url: 'http://localhost:3845/assets/97600e358224315cd3b044c795644ad1798128f5.svg', name: 'icon-reset-password.svg' },
  { url: 'http://localhost:3845/assets/e37ebedbf2e383cbd094e578c99893bfcde43dec.svg', name: 'icon-suspend-doctor.svg' },
  { url: 'http://localhost:3845/assets/c66f7bd2a54fada811cd28c7095d0f41ad812db2.svg', name: 'icon-account-info.svg' },
  { url: 'http://localhost:3845/assets/98af0e3328780be081e92626d25d3d6616a47a6c.svg', name: 'icon-2fa-shield.svg' },
  { url: 'http://localhost:3845/assets/7ff4b457aade138d20bbdb01b32563806adcb9e2.svg', name: 'icon-professional-details.svg' },
  { url: 'http://localhost:3845/assets/77193bb42e8125812b6be5a16b2dc4807f0c6617.svg', name: 'icon-contact-info.svg' },
  { url: 'http://localhost:3845/assets/302921efae40e6ecb80e1de32564ea12ef9b8c95.svg', name: 'icon-email.svg' },
  { url: 'http://localhost:3845/assets/e251b7d6a995786d1da1b954dea65a5fcdb6b989.svg', name: 'icon-phone.svg' },
  { url: 'http://localhost:3845/assets/04894c19e083b6362f125a7d8a0a3befa1fc14ca.svg', name: 'icon-office-address.svg' },
  { url: 'http://localhost:3845/assets/b65c03b1c1706d0c02722eac2bd3f2caf5c60103.svg', name: 'icon-doc-verification.svg' },
  { url: 'http://localhost:3845/assets/f92bb4adf755cf6c3c22ce1a128744ae604e6cb4.svg', name: 'icon-medical-license.svg' },
  { url: 'http://localhost:3845/assets/69a301bae37b0da9f8d47c7488bfef93966667ff.svg', name: 'icon-identity-doc.svg' },
  { url: 'http://localhost:3845/assets/c122276e255e1bc5070db8a394f2838e27b1f8d7.svg', name: 'icon-affiliation-letter.svg' },
  { url: 'http://localhost:3845/assets/44e533f7764ae086e2814efac4c94fea1a79bdd3.svg', name: 'icon-breadcrumb-chevron.svg' }
];

async function downloadAll() {
  const dir = path.join(__dirname, '..', 'src', 'assets', 'doctors');
  for (const a of assets) {
    try {
      const res = await fetch(a.url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        const filePath = path.join(dir, a.name);
        fs.writeFileSync(filePath, buf);
        console.log(`Saved ${a.name} (${buf.length} bytes)`);
      } else {
        console.error(`Failed ${a.url}: ${res.status}`);
      }
    } catch (e) {
      console.error(`Error downloading ${a.name}:`, e.message);
    }
  }
}

downloadAll();
