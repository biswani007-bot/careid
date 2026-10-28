const fs = require('fs');
const vm = require('vm');

const js = fs.readFileSync('scratch/swagger_ui_init.js', 'utf8');

// The file defines `window.onload = function() { ... let options = { "swaggerDoc": ... }; ... }`
// We can strip the outer window.onload wrapper or run in a sandbox where window is mocked.
const sandbox = {
  window: {
    location: {
      search: '',
      origin: 'https://360api.vnvision.in'
    }
  },
  SwaggerUIBundle: function() {},
  document: {}
};

try {
  vm.createContext(sandbox);
  vm.runInContext(js, sandbox);
  // Trigger onload
  sandbox.window.onload();
  console.log('Ran successfully in VM!');
  // Let's see what was set
} catch (e) {
  // If SwaggerUIBundle throws, let's just extract `let options = { ... };`
  console.log('VM notice:', e.message);
}

// Alternatively, extract between `let options = {` and `};`
const optStart = js.indexOf('let options = {');
if (optStart !== -1) {
  const jsonStart = js.indexOf('{', optStart);
  // Find matching closing brace
  let depth = 0;
  let endIdx = -1;
  for (let i = jsonStart; i < js.length; i++) {
    if (js[i] === '{') depth++;
    else if (js[i] === '}') {
      depth--;
      if (depth === 0) {
        endIdx = i + 1;
        break;
      }
    }
  }
  if (endIdx !== -1) {
    const rawOptions = js.slice(jsonStart, endIdx);
    const parsedOptions = JSON.parse(rawOptions);
    const doc = parsedOptions.swaggerDoc;
    console.log('Successfully extracted swaggerDoc!');
    console.log('Title:', doc.info?.title);
    console.log('Version:', doc.info?.version);
    console.log('Description:', doc.info?.description);
    console.log('Total paths:', Object.keys(doc.paths || {}).length);
    console.log('Total schemas:', Object.keys(doc.components?.schemas || {}).length);
    fs.writeFileSync('scratch/backend_openapi.json', JSON.stringify(doc, null, 2));
    console.log('Saved scratch/backend_openapi.json (size:', fs.statSync('scratch/backend_openapi.json').size, 'bytes)');
  }
}
