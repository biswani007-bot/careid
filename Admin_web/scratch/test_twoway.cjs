const http = require('http');

async function post(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const body = JSON.stringify(data);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...headers
      }
    }, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function get(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = http.request({
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: 'GET',
      headers: { ...headers }
    }, (res) => {
      let d = '';
      res.on('data', chunk => d += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(d) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function loginUser(phone) {
  const otpRes = await post('http://localhost:3001/api/v1/auth/otp/request', { phone });
  const inboxRes = await get('http://localhost:3001/api/v1/test-support/sms-inbox/latest?phone=' + encodeURIComponent(phone));
  const verifyRes = await post('http://localhost:3001/api/v1/auth/otp/verify', {
    challengeId: otpRes.body.data.challengeId,
    otpCode: inboxRes.body.data.otpCode
  });
  return verifyRes.body.data.accessToken;
}

(async () => {
  try {
    const docToken = await loginUser('+16505550003');
    const patientToken = await loginUser('+16505550004');
    console.log('Got tokens successfully.');

    const docConvos = await get('http://localhost:3001/api/v1/conversations', { Authorization: 'Bearer ' + docToken });
    console.log('Doctor convos:', docConvos.status, 'count:', docConvos.body.data?.length);

    const patientConvos = await get('http://localhost:3001/api/v1/conversations', { Authorization: 'Bearer ' + patientToken });
    console.log('Patient convos:', patientConvos.status, 'count:', patientConvos.body.data?.length);

    if (docConvos.body.data?.length > 0) {
      const convo = docConvos.body.data[0];
      console.log('Target conversation ID:', convo.id, 'Patient:', convo.patientName);

      // Patient sends message
      const sendRes = await post(`http://localhost:3001/api/v1/conversations/${convo.id}/messages`, {
        content: 'Patient test inquiry: Can I take my evening dose with food?'
      }, { Authorization: 'Bearer ' + patientToken });
      console.log('Patient message send status:', sendRes.status, 'role:', sendRes.body.data?.senderRole);

      // Doctor reads messages
      const msgsRes = await get(`http://localhost:3001/api/v1/conversations/${convo.id}/messages`, { Authorization: 'Bearer ' + docToken });
      const lastMsg = msgsRes.body.data?.[msgsRes.body.data.length - 1];
      console.log('Doctor fetched last message:', lastMsg?.content, 'from role:', lastMsg?.senderRole);
    }
  } catch (err) {
    console.error('Error in test:', err);
  }
})();
