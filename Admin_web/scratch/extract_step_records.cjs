const fs = require('fs');

const stepFile = 'C:\\Users\\biswa\\.gemini\\antigravity\\brain\\e0785a94-53fe-4f28-b816-f2efe4edf49e\\.system_generated\\steps\\34322\\output.txt';
if (fs.existsSync(stepFile)) {
  const content = fs.readFileSync(stepFile, 'utf8');
  console.log('File size:', content.length);
  // Find where Medical records response starts
  const startIdx = content.indexOf('Medical records response: [');
  const endIdx = content.indexOf('\n3. Calling /api/v1/medical-records/timeline');
  if (startIdx !== -1 && endIdx !== -1) {
    console.log('Found records block, length:', endIdx - startIdx);
    const recordsStr = content.slice(startIdx + 'Medical records response:'.length, endIdx).trim();
    fs.writeFileSync('scratch/cached_records_from_step.json', recordsStr);
    console.log('Saved to scratch/cached_records_from_step.json');
  }
} else {
  console.log('Step file does not exist');
}

