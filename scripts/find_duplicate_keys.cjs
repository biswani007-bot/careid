const fs = require('fs');

function checkDuplicates(filePath) {
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split('\n');
  
  // We can track object hierarchy using brace counting and regex
  // Or parse tokens
  const stack = [];
  let currentObj = {};
  stack.push({ path: 'root', keys: new Map() });
  
  let inString = false;
  let escape = false;
  let strBuffer = '';
  let lastTokenWasColon = false;
  let pendingKey = null;

  const duplicates = [];

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];

      if (escape) {
        strBuffer += char;
        escape = false;
        continue;
      }

      if (char === '\\' && inString) {
        escape = true;
        strBuffer += char;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        if (!inString) {
          // Completed a string
          if (!lastTokenWasColon) {
            // This is a key
            pendingKey = { key: strBuffer, line: lineIdx + 1, col: charIdx + 1 };
          }
          strBuffer = '';
        }
        continue;
      }

      if (inString) {
        strBuffer += char;
        continue;
      }

      // Outside strings
      if (char === ':') {
        if (pendingKey) {
          const currentScope = stack[stack.length - 1];
          if (currentScope.keys.has(pendingKey.key)) {
            duplicates.push({
              key: pendingKey.key,
              path: currentScope.path,
              firstLine: currentScope.keys.get(pendingKey.key).line,
              duplicateLine: pendingKey.line
            });
          } else {
            currentScope.keys.set(pendingKey.key, pendingKey);
          }
        }
        lastTokenWasColon = true;
      } else if (char === '{') {
        const parentPath = stack[stack.length - 1].path;
        const newPath = pendingKey ? `${parentPath}.${pendingKey.key}` : `${parentPath}.<unnamed>`;
        stack.push({ path: newPath, keys: new Map() });
        pendingKey = null;
        lastTokenWasColon = false;
      } else if (char === '}') {
        stack.pop();
        pendingKey = null;
        lastTokenWasColon = false;
      } else if (char === ',') {
        pendingKey = null;
        lastTokenWasColon = false;
      } else if (char === '[') {
        stack.push({ path: `${stack[stack.length - 1].path}.[]`, keys: new Map() });
        pendingKey = null;
        lastTokenWasColon = false;
      } else if (char === ']') {
        stack.pop();
        pendingKey = null;
        lastTokenWasColon = false;
      }
    }
  }

  return duplicates;
}

const dups = checkDuplicates('src/i18n/locales/en.json');
console.log('Duplicates found:', JSON.stringify(dups, null, 2));
