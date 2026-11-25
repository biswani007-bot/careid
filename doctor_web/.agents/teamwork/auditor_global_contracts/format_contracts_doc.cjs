const fs = require('fs');
const path = require('path');

const contracts = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'extracted_contracts.json'), 'utf8'));

let md = '# Key Postman API Contracts Documentation\n\n';

for (const c of contracts) {
  md += `### ${c.targetPattern} (${c.name})\n`;
  md += `- **Folder**: \`${c.folder}\`\n`;
  md += `- **URL**: \`${c.url}\`\n`;
  md += `- **Headers**:\n`;
  if (c.headers && c.headers.length) {
    c.headers.forEach(h => md += `  - \`${h}\`\n`);
  } else {
    md += `  - *(Standard Bearer Authorization)*\n`;
  }
  
  if (c.bodyRaw) {
    md += `- **Request Body**:\n\`\`\`json\n${c.bodyRaw}\n\`\`\`\n`;
  } else {
    md += `- **Request Body**: *(None)*\n`;
  }
  
  if (c.responses && c.responses.length) {
    md += `- **Sample Response (${c.responses[0].code} ${c.responses[0].status})**:\n\`\`\`json\n${c.responses[0].body}\n\`\`\`\n`;
  } else {
    md += `- **Sample Response**: *(None specified in Postman item)*\n`;
  }
  md += '\n---\n\n';
}

fs.writeFileSync(path.resolve(__dirname, 'contracts_documentation.md'), md, 'utf8');
console.log('Saved contracts_documentation.md');
