const fs = require('fs');

function analyzeFrame(jsonPath, title) {
  const elements = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  console.log(`\n======================================================`);
  console.log(`SUMMARY: ${title}`);
  console.log(`======================================================`);

  const buttons = elements.filter(e => e.name.toLowerCase().includes('button') || e.name.toLowerCase().includes('btn') || e.name.toLowerCase().includes('action') || e.name.toLowerCase().includes('pill'));
  console.log(`\n--- Actionable / Button Elements (${buttons.length}) ---`);
  buttons.forEach(b => console.log(`  [${b.id}] ${b.name.padEnd(40)} (w: ${b.w}, h: ${b.h})`));

  const cards = elements.filter(e => e.name.toLowerCase().includes('card') || e.name.toLowerCase().includes('kpi') || e.name.toLowerCase().includes('panel') || e.name.toLowerCase().includes('metric'));
  console.log(`\n--- Cards / Panels (${cards.length}) ---`);
  cards.forEach(c => console.log(`  [${c.id}] ${c.name.padEnd(40)} (w: ${c.w}, h: ${c.h})`));

  const tables = elements.filter(e => e.name.toLowerCase().includes('table') || e.name.toLowerCase().includes('row') || e.name.toLowerCase().includes('header') || e.name.toLowerCase().includes('column'));
  console.log(`\n--- Tables / Rows / Headers (${tables.length}) ---`);
  tables.slice(0, 15).forEach(t => console.log(`  [${t.id}] ${t.name.padEnd(40)} (w: ${t.w}, h: ${t.h})`));
}

analyzeFrame('scratch/elements_20_3645.json', 'OCR Processing Queue (20:3645)');
analyzeFrame('scratch/elements_20_3975.json', 'OCR Analytics Dashboard (20:3975)');
analyzeFrame('scratch/elements_20_4292.json', 'OCR Verification Workspace (20:4292)');
