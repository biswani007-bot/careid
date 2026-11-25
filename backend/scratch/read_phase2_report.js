const fs = require('fs');
const content = fs.readFileSync('C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/CAREID_MASTER_PHASE_2_FRONTEND_INTEGRATION_REPORT.md', 'utf8');
const lines = content.split('\n');
lines.forEach((l, i) => {
  if (/doctor\s+(?:web|portal)/i.test(l)) {
    console.log('L' + (i+1) + ': ' + l);
  }
});
