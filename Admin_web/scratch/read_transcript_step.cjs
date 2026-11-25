const fs = require('fs');
const readline = require('readline');

async function readStep() {
  const filePath = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.system_generated\\logs\\transcript_full.jsonl';
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.includes('"step_index":30806') || line.includes('"step_index": 30806')) {
      const obj = JSON.parse(line);
      console.log('Step 30806 content:');
      console.log(obj.content);
    }
    if (line.includes('"step_index":30793') || line.includes('"step_index": 30793')) {
      const obj = JSON.parse(line);
      console.log('Step 30793:');
      console.log(JSON.stringify(obj.tool_calls || obj.content));
    }
  }
}

readStep().catch(console.error);

