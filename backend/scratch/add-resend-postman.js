const fs = require('fs');

const collectionPath = 'CareID-Staging.postman_collection.json';
const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));

const docPortal = collection.item.find(i => i.name.includes('05. Doctor Portal'));
if (!docPortal) {
  console.error('05. Doctor Portal not found!');
  process.exit(1);
}

const resendEndpoint = {
  name: 'Resend Treatment Proposal Notification / SMS Reminder (Stage 16)',
  request: {
    method: 'POST',
    header: [
      { key: 'Content-Type', value: 'application/json' },
      { key: 'Authorization', value: 'Bearer {{doctorToken}}' }
    ],
    body: {
      mode: 'raw',
      raw: JSON.stringify({
        channel: 'SMS',
        customMessage: 'Reminder: Your care proposal expires soon. Please review.'
      }, null, 2)
    },
    url: {
      raw: '{{baseUrl}}/api/v1/doctors/treatment-offers/:offerId/resend',
      host: ['{{baseUrl}}'],
      path: ['api', 'v1', 'doctors', 'treatment-offers', ':offerId', 'resend'],
      variable: [
        {
          key: 'offerId',
          value: '{{activeOfferId}}',
          description: 'Treatment offer UUID'
        }
      ]
    },
    description: 'Resend treatment proposal notification / SMS reminder to patient with 60-second rate-limiting cooldown and audit logging.'
  },
  response: [],
  event: [
    {
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: [
          'pm.test("Status code is 200 or 409 (rate limited)", function () {',
          '    pm.expect([200, 409]).to.include(pm.response.code);',
          '});',
          'if (pm.response.code === 200) {',
          '    var json = pm.response.json();',
          '    pm.test("Response contains treatmentOfferId and status", function () {',
          '        pm.expect(json).to.have.property("treatmentOfferId");',
          '        pm.expect(json).to.have.property("status");',
          '        pm.expect(json).to.have.property("recipientMasked");',
          '    });',
          '}'
        ]
      }
    }
  ]
};

docPortal.item.push(resendEndpoint);
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2), 'utf8');
console.log('Successfully added Resend endpoint to 05. Doctor Portal! Total items in portal:', docPortal.item.length);

