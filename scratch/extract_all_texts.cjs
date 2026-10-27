const fs = require('fs');

function extractAllTexts(xmlPath) {
  const xml = fs.readFileSync(xmlPath, 'utf8');
  console.log(`\n======================================================`);
  console.log(`TEXT CONTENT IN ${xmlPath}`);
  console.log(`======================================================`);

  // Regex to find <text ...>content</text> or attributes
  const regex = /<text[^>]*>([\s\S]*?)<\/text>/gi;
  let match;
  let count = 0;
  while ((match = regex.exec(xml)) !== null) {
    const raw = match[1].trim();
    if (raw) {
      console.log(`[Text ${++count}]: ${raw.replace(/\n\s*/g, ' ')}`);
    }
  }

  // Also check if text characters are stored in characters="..." attribute
  const attrRegex = /characters="([^"]+)"/gi;
  let attrMatch;
  let attrCount = 0;
  while ((attrMatch = attrRegex.exec(xml)) !== null) {
    console.log(`[CharAttr ${++attrCount}]: ${attrMatch[1]}`);
  }
}

extractAllTexts('scratch/frame_20_3645.xml');
extractAllTexts('scratch/frame_20_3975.xml');
extractAllTexts('scratch/frame_20_4292.xml');
