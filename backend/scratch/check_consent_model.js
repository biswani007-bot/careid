const fs = require('fs');
const schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

const start = schema.indexOf('model SecurityConsentRecord');
const end = schema.indexOf('\n}', start);
console.log(schema.substring(start, end + 2));

