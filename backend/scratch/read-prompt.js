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
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      if (/resend|sms|financing|attestation|stage 3|stage 5|stage 6|stage 12/i.test(l)) {
        console.log(`L${i}: ${l}`);
      }
    }
  }
});

