const fs = require('fs');
const readline = require('readline');

async function searchTranscript() {
  const filePath = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.system_generated\\logs\\transcript.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('Dental Records: 2') || line.includes('Vision Records: 1') || line.includes('308') || line.includes('04d8276b-1e4f-4a8e-b53b-f322effd8430')) {
      const obj = JSON.parse(line);
      console.log(`Line ${lineNum}: step_index=${obj.step_index}, type=${obj.type}`);
      if (obj.content) {
        console.log('Content preview:', obj.content.slice(0, 300));
      }
    }
  }
}

searchTranscript().catch(console.error);

