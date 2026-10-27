const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'src', 'assets', 'patients');

const mapping = {
  'avatar-admin.png': 'imgAdminUserAvatar.png',
  'avatar-eleanor.png': 'imgAb6AXuCv1HcNJt0AyB9JIv8X0VqUvnwe0A2QuCbCtg4LNu7GUtq5RSg1DykZzMpqIkvbXuxE4P9Tl7Izo2QhKjdPYiDmJUadiViTudz94NwWyyI7GOwgNiDcCvuHet1PmiVQuhCkGSvAn47Vg0YG2TPfv5IjFhuFhTqoxoZyVHsmP7FVXcN4LLrB6YgjhrUpu7MYxCWjapnnRqKfQ9Ud11Grekdr928JzTc0K7HNEuy00PXco1I.png',
  'avatar-sarah-patient.png': 'imgAb6AXuBeYtlPlVmlaC1Wky3WNPTdnRiZjV5EjsYWlPqIhBeC8RSRaNcCe1X7VJgaSSeoKbxcBvuf9ChOx2QbrOx3DSHjEPiln12F6IUIjFzf91TfDXzPt9VUF6XItmJk67GKyLbLZsTpAkjro5J5WxHfT01FaPSnhnYV9GOvhvI118KvJe5IHkHVgpD5Jpl1CwEUm09Lz8Q04O8XXJaGbheBcp0DcVcJLcz7THT7U6Wsqh.png',
  'icon-search.svg': 'imgIcon.svg',
  'icon-bell.svg': 'imgContainer1.svg',
  'icon-apps.svg': 'imgContainer2.svg',
  'icon-chevron-right.svg': 'imgContainer.svg',
  'icon-export.svg': 'imgContainer3.svg',
  'icon-add-patient.svg': 'imgContainer4.svg',
  'kpi-total-patients.svg': 'imgContainer5.svg',
  'kpi-trending-up.svg': 'imgContainer6.svg',
  'kpi-verified.svg': 'imgContainer7.svg',
  'kpi-pending.svg': 'imgContainer8.svg',
  'kpi-inactive.svg': 'imgContainer9.svg',
  'icon-dropdown-chevron.svg': 'imgContainer10.svg',
  'icon-sort.svg': 'imgContainer12.svg',
  'badge-verified-check.svg': 'imgContainer13.svg',
  'badge-pending-clock.svg': 'imgContainer17.svg',
  'table-link-family.svg': 'imgContainer14.svg',
  'table-link-records.svg': 'imgContainer15.svg',
  'table-kebab.svg': 'imgContainer16.svg',
  'icon-page-prev.svg': 'imgContainer18.svg',
  'icon-page-next.svg': 'imgContainer19.svg'
};

for (const [semantic, orig] of Object.entries(mapping)) {
  const origPath = path.join(dir, orig);
  const destPath = path.join(dir, semantic);
  if (fs.existsSync(origPath)) {
    fs.copyFileSync(origPath, destPath);
    console.log(`Copied ${orig} -> ${semantic}`);
  } else {
    console.warn(`File not found: ${origPath}`);
  }
}
