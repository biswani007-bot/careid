const fs = require('fs');

const collection = JSON.parse(fs.readFileSync('Postman collection/CareID-Staging.postman_collection.json', 'utf8'));
const f09 = collection.item.find(f => f.name.includes('09. Facilities'));

const listRoomsReq = f09.item.find(i => i.name === 'List facility rooms');
const createRoomReq = f09.item.find(i => i.name === 'Create facility room');

console.log('=== LIST ROOMS POSTMAN SPEC ===');
console.log(JSON.stringify(listRoomsReq, null, 2));

console.log('\n=== CREATE ROOM POSTMAN SPEC ===');
console.log(JSON.stringify(createRoomReq, null, 2));

