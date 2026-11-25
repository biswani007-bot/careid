const fs = require('fs');
const readline = require('readline');
const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/PABANI/.gemini/antigravity/brain/1fe01e76-f086-43fc-988c-36127d08d24f/.system_generated/logs/transcript_full.jsonl'),
  crlfDelay: Infinity
});
let lineIdx = 0;
rl.on('line', (line) => {
  lineIdx++;
  if (lineIdx === 24957) {
    const data = JSON.parse(line);
    const content = data.content;
    const lines = content.split('\n');
    console.log('=== SECTION 8: FINANCING ===');
    for (let i = 388; i <= 440; i++) {
      console.log(lines[i]);
    }
    console.log('=== SECTION 16: NOTIFICATION AND SMS RESEND ===');
    for (let i = 841; i <= 890; i++) {
      console.log(lines[i]);
    }
  }
});

