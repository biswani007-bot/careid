const fs = require('fs');
const path = require('path');

function getFiles(dir, files = []) {
  const fileList = fs.readdirSync(dir);
  for (const file of fileList) {
    const name = path.join(dir, file);
    if (fs.statSync(name).isDirectory()) {
      getFiles(name, files);
    } else if (file.endsWith('.controller.ts')) {
      files.push(name);
    }
  }
  return files;
}

const controllers = getFiles('src/modules');
const routes = [];

for (const cPath of controllers) {
  const content = fs.readFileSync(cPath, 'utf8');
  
  // Find Controller prefix
  const controllerMatch = content.match(/@Controller\((?:['"`])?([^'"`\)]*)(?:['"`])?\)/);
  const prefix = controllerMatch ? controllerMatch[1] : '';
  
  // Find all methods decorated with @Get, @Post, @Put, @Patch, @Delete
  const regex = /@(Get|Post|Put|Patch|Delete)\s*\(\s*(?:['"`]([^'"`]*)['"`])?\s*\)[\s\S]*?(?:public\s+|private\s+|protected\s+)?(?:async\s+)?([a-zA-Z0-9_]+)\s*\(/g;
  
  let match;
  while ((match = regex.exec(content)) !== null) {
    const httpMethod = match[1].toUpperCase();
    let subPath = match[2] || '';
    if (subPath.startsWith('/')) subPath = subPath.substring(1);
    let fullPath = ('/api/v1/' + (prefix ? prefix + '/' : '') + subPath).replace(/\/+/g, '/');
    if (fullPath.length > 8 && fullPath.endsWith('/')) {
      fullPath = fullPath.substring(0, fullPath.length - 1);
    }
    const handler = match[3];
    
    // Check roles in the preceding 500 chars
    const startIdx = match.index;
    const preceding = content.substring(Math.max(0, startIdx - 300), startIdx + match[0].length);
    const rMatch = preceding.match(/@Roles\(([^)]*)\)/);
    const roles = rMatch ? rMatch[1].replace(/['"`\s]/g, '') : '';
    
    routes.push({
      controller: path.basename(cPath),
      file: path.relative('.', cPath).replace(/\\/g, '/'),
      prefix,
      httpMethod,
      subPath,
      fullPath,
      handler,
      roles
    });
  }
}

console.log('Total extracted routes with multi-line regex:', routes.length);
fs.writeFileSync('scratch/all_backend_routes.json', JSON.stringify(routes, null, 2));

const byController = {};
for (const r of routes) {
  byController[r.controller] = (byController[r.controller] || 0) + 1;
}
console.log('Controllers with route counts (' + Object.keys(byController).length + ' controllers):');
for (const [k, v] of Object.entries(byController)) {
  console.log(`  ${k}: ${v}`);
}
