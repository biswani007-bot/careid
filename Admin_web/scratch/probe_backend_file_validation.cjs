const https = require('https');
const fs = require('fs');
const { getFreshToken } = require('./api_helper.cjs');

function uploadTest(token, patientProfileId, category, fileName, fileBuffer, mimeType) {
  return new Promise((resolve) => {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = Buffer.alloc(0);

    const fields = { patientProfileId, category };
    for (const [k, v] of Object.entries(fields)) {
      const fieldHead = `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`;
      body = Buffer.concat([body, Buffer.from(fieldHead)]);
    }

    const fileHead = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`;
    body = Buffer.concat([body, Buffer.from(fileHead), fileBuffer, Buffer.from('\r\n')]);
    body = Buffer.concat([body, Buffer.from(`--${boundary}--\r\n`)]);

    const req = https.request({
      hostname: '360api.vnvision.in',
      path: '/api/v1/attachments',
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        Accept: 'application/json'
      }
    }, res => {
      let b = '';
      res.on('data', c => b += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(b) }); }
        catch { resolve({ status: res.statusCode, body: b }); }
      });
    });
    req.on('error', err => resolve({ status: -1, error: err.message }));
    req.write(body);
    req.end();
  });
}

(async () => {
  const token = await getFreshToken();
  const patientProfileId = '787e5187-7859-4320-bb1a-465a57dd086a'; // Karcus Doe

  // Test 1: Valid PDF
  const minPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\n0000000009 00000 n\n0000000056 00000 n\n0000000111 00000 n\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n186\n%%EOF');
  const res1 = await uploadTest(token, patientProfileId, 'LAB_RESULT', 'valid.pdf', minPdf, 'application/pdf');
  console.log('Test 1 (Valid min PDF) Status:', res1.status, JSON.stringify(res1.body));

  // Test 2: Text file pretending to be PDF
  const fakePdf = Buffer.from('This is just plain text, not a real PDF structure.');
  const res2 = await uploadTest(token, patientProfileId, 'LAB_RESULT', 'fake.pdf', fakePdf, 'application/pdf');
  console.log('Test 2 (Fake text PDF) Status:', res2.status, JSON.stringify(res2.body));

  // Test 3: HTML error response pretending to be PDF
  const htmlPdf = Buffer.from('<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>Not Found</h1><p>The requested URL was not found on this server.</p></body></html>');
  console.log('HTML size:', htmlPdf.length);
  const res3 = await uploadTest(token, patientProfileId, 'LAB_RESULT', 'html_response.pdf', htmlPdf, 'application/pdf');
  console.log('Test 3 (HTML error PDF) Status:', res3.status, JSON.stringify(res3.body));

  // Test 4: Empty PDF (0 bytes)
  const emptyPdf = Buffer.alloc(0);
  const res4 = await uploadTest(token, patientProfileId, 'LAB_RESULT', 'empty.pdf', emptyPdf, 'application/pdf');
  console.log('Test 4 (Empty PDF) Status:', res4.status, JSON.stringify(res4.body));

  // Test 5: What about a 326 byte file? What could that be? Let's check!
  // What if it begins with %PDF- but is cut off or corrupted?
  const truncatedPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\nCorrupted content with no xref and random bytes '.repeat(6));
  console.log('Truncated size:', truncatedPdf.length);
  const res5 = await uploadTest(token, patientProfileId, 'LAB_RESULT', 'truncated.pdf', truncatedPdf, 'application/pdf');
  console.log('Test 5 (Truncated PDF) Status:', res5.status, JSON.stringify(res5.body));

  // Test 6: Valid PNG
  const validPng = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 pixel
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89,
    0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, 0x54, // IDAT chunk
    0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
  ]);
  const res6 = await uploadTest(token, patientProfileId, 'IMAGING_STUDY', 'valid.png', validPng, 'image/png');
  console.log('Test 6 (Valid 1x1 PNG) Status:', res6.status, JSON.stringify(res6.body));

  // Test 7: Valid JPEG
  const validJpg = Buffer.from([
    0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00,
    0xFF, 0xDB, 0x00, 0x43, 0x00, 0x03, 0x02, 0x02, 0x03, 0x02, 0x02, 0x03, 0x03, 0x03, 0x03, 0x04, 0x06, 0x04, 0x04, 0x04,
    0xFF, 0xD9
  ]);
  const res7 = await uploadTest(token, patientProfileId, 'IMAGING_STUDY', 'valid.jpg', validJpg, 'image/jpeg');
  console.log('Test 7 (Valid JPEG) Status:', res7.status, JSON.stringify(res7.body));

  // Test 8: What about DICOM / DCM?
  const dcmBuffer = Buffer.concat([
    Buffer.alloc(128), // 128-byte preamble
    Buffer.from('DICM'), // DICM magic word
    Buffer.from([0x02, 0x00, 0x00, 0x00, 0x55, 0x4C, 0x04, 0x00, 0x00, 0x00, 0x00, 0x00])
  ]);
  const res8 = await uploadTest(token, patientProfileId, 'IMAGING_STUDY', 'test.dcm', dcmBuffer, 'application/dicom');
  console.log('Test 8 (DICOM .dcm) Status:', res8.status, JSON.stringify(res8.body));
})();

