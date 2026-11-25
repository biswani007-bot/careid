const https = require('https');
const { getAdminToken } = require('./token_helper.cjs');

async function listAllDoctors() {
  const token = await getAdminToken();
  const opts = {
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors',
    method: 'GET',
    headers: { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` },
    rejectUnauthorized: false
  };
  https.get(opts, res => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      const data = JSON.parse(d);
      const docs = data.data || data;
      console.log('Total doctors in /api/v1/doctors:', docs.length);
      docs.forEach((doc, i) => {
        console.log(`[${i+1}] id: ${doc.id}, userId: ${doc.userId}, name: ${doc.fullName}, lic: ${doc.licenseNumber}, user:`, doc.user ? { id: doc.user.id, email: doc.user.email, phone: doc.user.phone } : 'null');
      });
    });
  });
}

listAllDoctors();

