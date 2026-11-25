const tokenHelper = require('./token_helper.cjs');

async function test() {
  const token = await tokenHelper.getAdminToken();
  console.log('✓ Got admin token');

  const endpoints = [
    '/api/v1/admin/medical-records',
    '/api/v1/admin/medical-records?limit=10',
    '/api/v1/medical-records',
    '/api/v1/attachments',
    '/api/v1/attachments/file/test',
    '/api/v1/admin/dashboard/stats',
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch('https://360api.vnvision.in' + ep, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log(`Endpoint ${ep} -> Status: ${res.status}`);
      if (res.status === 200) {
        const data = await res.json();
        if (Array.isArray(data)) {
          console.log(`  Array length: ${data.length}`);
          if (data.length > 0) {
            console.log('  First item sample:', JSON.stringify(data[0]).slice(0, 200));
          }
        } else if (data && typeof data === 'object') {
          console.log('  Object keys:', Object.keys(data));
          if (data.items) {
            console.log(`  data.items length: ${data.items.length}, total: ${data.total}`);
            if (data.items.length > 0) {
              console.log('  First item sample:', JSON.stringify(data.items[0]).slice(0, 200));
            }
          } else if (data.data) {
            console.log('  data.data isArray:', Array.isArray(data.data), 'total:', data.total);
            if (Array.isArray(data.data) && data.data.length > 0) {
              console.log('  First item sample:', JSON.stringify(data.data[0]).slice(0, 200));
            }
          }
        }
      } else {
        const text = await res.text();
        console.log('  Error body:', text.slice(0, 150));
      }
    } catch (err) {
      console.error(`  Error calling ${ep}:`, err.message);
    }
  }

  // Check timeline for patients
  console.log('\n--- Checking patient timelines ---');
  // First get a patient
  const usersRes = await fetch('https://360api.vnvision.in/api/v1/admin/users', {
    headers: { Authorization: `Bearer ${token}` }
  });
  const users = await usersRes.json();
  const patients = users.filter(u => u.patientProfileId || (u.roles && u.roles.includes('PATIENT')));
  console.log('Found patients:', patients.length);

  // Check timeline for first 5 patients
  for (let i = 0; i < Math.min(5, patients.length); i++) {
    const p = patients[i];
    const pid = p.patientProfileId || p.id;
    const timelineRes = await fetch(`https://360api.vnvision.in/api/v1/admin/patients/${pid}/medical-records/timeline`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Patient ${pid} timeline status:`, timelineRes.status);
    if (timelineRes.status === 200) {
      const tlData = await timelineRes.json();
      console.log(`  Items count:`, Array.isArray(tlData) ? tlData.length : (tlData.items ? tlData.items.length : Object.keys(tlData)));
      if (Array.isArray(tlData) && tlData.length > 0) {
        console.log(`  First item:`, JSON.stringify(tlData[0]).slice(0, 200));
      }
    }
  }

  // Check the 3 specific attachments mentioned in prompt:
  // Medical: 04d8276b-1e4f-4a8e-b53b-f322effd8430
  // Dental: 2f3bfaf3-a8ba-4e23-8e20-a6b1a32db5ed
  // Vision: 666a3474-09bd-4db2-b440-5886021f04a3
  const targetAttachmentIds = [
    '04d8276b-1e4f-4a8e-b53b-f322effd8430',
    '2f3bfaf3-a8ba-4e23-8e20-a6b1a32db5ed',
    '666a3474-09bd-4db2-b440-5886021f04a3'
  ];
  console.log('\n--- Checking specific attachment IDs ---');
  for (const attId of targetAttachmentIds) {
    const attRes = await fetch(`https://360api.vnvision.in/api/v1/attachments/${attId}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log(`Attachment ${attId} status:`, attRes.status);
    if (attRes.status === 200) {
      console.log('  Data:', await attRes.json());
    }
  }
}

test().catch(console.error);

