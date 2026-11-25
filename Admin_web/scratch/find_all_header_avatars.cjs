const fs = require('fs');
const path = require('path');

const results = [];

function scan(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, item.name);
    if (item.isDirectory()) {
      scan(full);
    } else if (item.isFile() && full.endsWith('.tsx')) {
      const content = fs.readFileSync(full, 'utf8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        // Look for admin profile headers, avatar containers, or initials
        if (
          /header-avatar|sec-user-profile|roles-user-profile|int-user-profile|ocr-user-avatar|branding-profile|settings-profile|announcements-profile|notification-profile|monitoring-avatar|audit-avatar|referral-activity-avatar|reports-admin-avatar/i.test(line) ||
          (line.includes('rounded-full') && (line.includes('>A<') || line.includes('>SA<') || line.includes('>AD<') || line.includes('>EV<') || line.includes('>ER<') || line.includes('>SC<') || line.includes('>RC<'))) ||
          (line.includes('avatar') && line.includes('Admin User'))
        ) {
          results.push({
            file: path.relative('.', full),
            line: idx + 1,
            text: line.trim()
          });
        }
      });
    }
  }
}

scan('src/components');
console.log(`Found ${results.length} occurrences:`);
results.forEach(r => console.log(`${r.file}:${r.line} -> ${r.text}`));

