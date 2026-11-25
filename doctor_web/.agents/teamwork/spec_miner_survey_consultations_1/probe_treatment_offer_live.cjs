const https = require('https');

function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function run() {
  // Login
  const otpReq = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/request',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, JSON.stringify({ phone: '+16505550003' }));
  const parsed = JSON.parse(otpReq.body);
  const challengeId = parsed.data ? parsed.data.challengeId : parsed.challengeId;

  const otpVerify = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/auth/otp/verify',
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  }, JSON.stringify({ challengeId, otpCode: '123456' }));
  const verifyData = JSON.parse(otpVerify.body);
  const token = verifyData.data ? (verifyData.data.accessToken || verifyData.data.token) : verifyData.accessToken;

  console.log('Testing POST /api/v1/doctors/treatment-offers with invalid/empty body:');
  const badRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors/treatment-offers',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }, JSON.stringify({}));
  console.log(`Bad Request status: ${badRes.statusCode}`);
  console.log(`Bad Request body: ${badRes.body}`);

  console.log('\nTesting POST /api/v1/doctors/treatment-offers with valid test payload:');
  // Patient ID from appointment: 787e5187-7859-4320-bb1a-465a57dd086a
  // Facility ID: 3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb
  const testPayload = {
    patientProfileId: '787e5187-7859-4320-bb1a-465a57dd086a',
    facilityId: '3b6a3f47-ed9c-4010-bb1a-e0fdea5f4abb',
    clinicalIndication: 'Diagnostic catheterization evaluation for coronary artery disease',
    procedures: [
      {
        procedureCode: 'CPT-93458',
        procedureName: 'Left Heart Catheterization with Coronary Angiogram',
        unitCost: 5200,
        category: 'SURGICAL',
        quantity: 1,
        isOptional: false,
        clinicalJustification: 'Evaluation of exertional angina'
      }
    ],
    discountAmount: 780,
    financingEligible: true,
    recommendedTenureMonths: 12,
    validUntil: '2026-12-31T23:59:59.000Z',
    clinicalNotes: 'Standard diagnostic catheterization protocol',
    termsAndConditions: 'Package includes facility fee and catheterization suite preparation'
  };

  const createRes = await request({
    hostname: '360api.vnvision.in',
    path: '/api/v1/doctors/treatment-offers',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  }, JSON.stringify(testPayload));
  console.log(`Create Offer status: ${createRes.statusCode}`);
  console.log(`Create Offer body: ${createRes.body}`);

  let createdOffer = null;
  try {
    const parsedOffer = JSON.parse(createRes.body);
    createdOffer = parsedOffer.data || parsedOffer;
  } catch {}

  if (createdOffer && createdOffer.id) {
    const offerId = createdOffer.id;
    console.log(`\nCreated offer ID: ${offerId}`);

    console.log('\nTesting GET /api/v1/doctors/treatment-offers/' + offerId);
    const getRes = await request({
      hostname: '360api.vnvision.in',
      path: `/api/v1/doctors/treatment-offers/${offerId}`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log(`Get Offer status: ${getRes.statusCode}`);
    console.log(`Get Offer body: ${getRes.body}`);

    console.log('\nTesting GET /api/v1/doctors/treatment-offers/' + offerId + '/status');
    const statusRes = await request({
      hostname: '360api.vnvision.in',
      path: `/api/v1/doctors/treatment-offers/${offerId}/status`,
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });
    console.log(`Offer status: ${statusRes.statusCode}`);
    console.log(`Offer status body: ${statusRes.body}`);

    console.log('\nTesting POST /api/v1/doctors/treatment-offers/' + offerId + '/dispatch');
    const dispatchRes = await request({
      hostname: '360api.vnvision.in',
      path: `/api/v1/doctors/treatment-offers/${offerId}/dispatch`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }, JSON.stringify({ expectedVersion: createdOffer.version || 1 }));
    console.log(`Dispatch status: ${dispatchRes.statusCode}`);
    console.log(`Dispatch body: ${dispatchRes.body}`);
  }
}

run().catch(console.error);
