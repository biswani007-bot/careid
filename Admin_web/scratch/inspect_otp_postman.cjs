const fs = require('fs');
const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));

function findReqs(items, path = []) {
  let list = [];
  for (const it of items) {
    if (it.request) {
      list.push({ folder: path.join(' > '), name: it.name, request: it.request, responses: it.response });
    }
    if (it.item) {
      list = list.concat(findReqs(it.item, [...path, it.name]));
    }
  }
  return list;
}

const all = findReqs(collection.item);
const otpVerify = all.find(r => r.name.includes('Verify Phone OTP & Login'));
console.log('Name:', otpVerify?.name);
console.log('URL:', otpVerify?.request?.url);
console.log('Body:', otpVerify?.request?.body);
if (otpVerify?.responses?.length) {
  console.log('Response:', otpVerify.responses[0].body);
}

const otpReq = all.find(r => r.name.includes('Request Phone OTP'));
console.log('\nName:', otpReq?.name);
console.log('Body:', otpReq?.request?.body);
if (otpReq?.responses?.length) {
  console.log('Response:', otpReq.responses[0].body);
}

