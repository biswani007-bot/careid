const fs = require('fs');
const comp = fs.readFileSync('src/components/users/AdminUserDirectory.tsx', 'utf8');
const lines = comp.split('\n');
lines.forEach((l, i) => {
  if (l.includes('<table') || l.includes('<tr') || l.includes('className="kpi') || l.includes('kpi-') || l.includes('users-table')) {
    console.log((i+1) + ': ' + l.trim());
  }
});

