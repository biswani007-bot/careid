const ts = require('typescript');
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

const HTTP_DECORATORS = new Set(['Get', 'Post', 'Put', 'Patch', 'Delete', 'Options', 'Head']);

function parseController(filePath) {
  const sourceCode = fs.readFileSync(filePath, 'utf8');
  const sourceFile = ts.createSourceFile(
    filePath,
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );

  let controllerPrefix = '';
  let controllerName = '';
  const endpoints = [];

  function visit(node) {
    if (ts.isClassDeclaration(node)) {
      controllerName = node.name ? node.name.text : path.basename(filePath);
      
      // Look for @Controller('prefix')
      if (node.modifiers) {
        for (const mod of node.modifiers) {
          if (ts.isDecorator(mod) && ts.isCallExpression(mod.expression)) {
            const exp = mod.expression;
            if (ts.isIdentifier(exp.expression) && exp.expression.text === 'Controller') {
              if (exp.arguments.length > 0 && ts.isStringLiteral(exp.arguments[0])) {
                controllerPrefix = exp.arguments[0].text;
              }
            }
          }
        }
      }

      // Visit methods
      for (const member of node.members) {
        if (ts.isMethodDeclaration(member)) {
          const methodName = member.name.getText(sourceFile);
          let httpMethod = null;
          let subPath = '';
          let roles = [];
          let apiOperationSummary = '';
          const params = [];

          if (member.modifiers) {
            for (const mod of member.modifiers) {
              if (ts.isDecorator(mod) && ts.isCallExpression(mod.expression)) {
                const exp = mod.expression;
                const decName = exp.expression.getText(sourceFile);
                if (HTTP_DECORATORS.has(decName)) {
                  httpMethod = decName.toUpperCase();
                  if (exp.arguments.length > 0 && ts.isStringLiteral(exp.arguments[0])) {
                    subPath = exp.arguments[0].text;
                  }
                } else if (decName === 'Roles') {
                  roles = exp.arguments.map(arg => arg.getText(sourceFile).replace(/['"]/g, ''));
                } else if (decName === 'ApiOperation') {
                  if (exp.arguments.length > 0 && ts.isObjectLiteralExpression(exp.arguments[0])) {
                    for (const prop of exp.arguments[0].properties) {
                      if (ts.isPropertyAssignment(prop) && prop.name.getText(sourceFile) === 'summary') {
                        apiOperationSummary = prop.initializer.getText(sourceFile).replace(/['"]/g, '');
                      }
                    }
                  }
                }
              }
            }
          }

          if (httpMethod) {
            // Collect parameters
            for (const param of member.parameters) {
              const pName = param.name.getText(sourceFile);
              const pType = param.type ? param.type.getText(sourceFile) : 'any';
              let paramKind = 'unknown';
              if (param.modifiers) {
                for (const mod of param.modifiers) {
                  if (ts.isDecorator(mod) && ts.isCallExpression(mod.expression)) {
                    paramKind = mod.expression.expression.getText(sourceFile);
                  }
                }
              }
              params.push({ name: pName, type: pType, decorator: paramKind });
            }

            if (subPath.startsWith('/')) subPath = subPath.substring(1);
            let fullPath = ('/api/v1/' + (controllerPrefix ? controllerPrefix + '/' : '') + subPath).replace(/\/+/g, '/');
            if (fullPath.length > 8 && fullPath.endsWith('/')) {
              fullPath = fullPath.substring(0, fullPath.length - 1);
            }

            endpoints.push({
              controller: controllerName,
              file: path.relative('.', filePath).replace(/\\/g, '/'),
              httpMethod,
              prefix: controllerPrefix,
              subPath,
              fullPath,
              handler: methodName,
              roles,
              summary: apiOperationSummary,
              params
            });
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return endpoints;
}

const controllers = getFiles('src/modules');
let allEndpoints = [];

for (const c of controllers) {
  const eps = parseController(c);
  allEndpoints = allEndpoints.concat(eps);
}

console.log('Successfully parsed AST for', controllers.length, 'controllers.');
console.log('Total verified endpoints:', allEndpoints.length);
fs.writeFileSync('scratch/ast_verified_endpoints.json', JSON.stringify(allEndpoints, null, 2));

// Print summary by controller
const countByController = {};
for (const ep of allEndpoints) {
  countByController[ep.controller] = (countByController[ep.controller] || 0) + 1;
}

for (const [c, cnt] of Object.entries(countByController)) {
  console.log(`  ${c}: ${cnt}`);
}
