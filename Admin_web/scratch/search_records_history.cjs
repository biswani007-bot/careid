const fs = require('fs');
const readline = require('readline');

async function searchTranscript() {
  const filePath = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('admin/medical-records') && line.includes('305')) {
      const obj = JSON.parse(line);
      console.log(`Step ${obj.step_index}: ${obj.type}`);
      if (obj.content) console.log(obj.content.slice(0, 400));
    }
  }
}

searchTranscript().catch(console.error);

