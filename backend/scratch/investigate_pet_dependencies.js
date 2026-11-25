const fs = require('fs');
const path = require('path');

function searchCode(dir, extFilter, regex, results = []) {
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'build' || entry.name === '.dart_tool') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchCode(full, extFilter, regex, results);
    } else if (entry.isFile() && extFilter.some(ext => entry.name.endsWith(ext))) {
      try {
        const content = fs.readFileSync(full, 'utf8');
        const lines = content.split('\n');
        lines.forEach((line, idx) => {
          if (regex.test(line)) {
            results.push({ file: full, lineNum: idx + 1, text: line.trim() });
          }
        });
      } catch {}
    }
  }
  return results;
}

console.log('=== INVESTIGATING PET RECORDS IN PATIENT MOBILE APP ===');
const patientDir = 'C:\\Users\\PABANI\\CareID_patient_app';
const patientMatches = searchCode(path.join(patientDir, 'lib'), ['.dart'], /pet/i);
console.log('Total matches in Patient App lib:', patientMatches.length);
const patientFiles = Array.from(new Set(patientMatches.map(m => m.file)));
console.log('Unique files touching pet in Patient App:');
patientFiles.forEach(f => {
  const rel = path.relative(patientDir, f);
  console.log('  ', rel);
});

console.log('\n=== INVESTIGATING PET RECORDS IN DOCTOR MOBILE APP ===');
const doctorDir = 'C:\\Users\\PABANI\\CareID_Doctor_application';
const doctorMatches = searchCode(path.join(doctorDir, 'lib'), ['.dart'], /pet/i);
console.log('Total matches in Doctor App lib:', doctorMatches.length);
const doctorFiles = Array.from(new Set(doctorMatches.map(m => m.file)));
console.log('Unique files touching pet in Doctor App:');
doctorFiles.forEach(f => {
  const rel = path.relative(doctorDir, f);
  console.log('  ', rel);
});

console.log('\n=== INVESTIGATING PET RECORDS IN BACKEND MONOLITH ===');
const backendDir = 'C:\\Users\\PABANI\\Downloads\\hvapi-main\\hvapi-main';
const backendMatches = searchCode(path.join(backendDir, 'src'), ['.ts'], /pet/i);
console.log('Total matches in Backend src:', backendMatches.length);
const backendFiles = Array.from(new Set(backendMatches.map(m => m.file)));
console.log('Unique files touching pet in Backend:');
backendFiles.forEach(f => {
  const rel = path.relative(backendDir, f);
  console.log('  ', rel);
});
