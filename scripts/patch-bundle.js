// scripts/patch-bundle.js
// Post-processing for bundled Calendar MCP server
// Patches mcp-framework's package.json require call

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputFile = path.join(__dirname, '..', 'dist', 'gcalendar-mcp.bundle.cjs');

console.log('Post-processing bundle:', inputFile);

// Read the bundle
let bundleContent = fs.readFileSync(inputFile, 'utf8');

// Read mcp-framework's package.json to get name and version
const frameworkPkg = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, '..', 'node_modules', 'mcp-framework', 'package.json'),
    'utf8'
  )
);

// Create replacement code with inline JSON
const replacementCode = `{name:"${frameworkPkg.name}",version:"${frameworkPkg.version}"}`;

// Find and replace the require('../../package.json') call
// In minified code this appears as something like: C1e("../../package.json")
// where C1e is the minified name for require
bundleContent = bundleContent.replace(
  /([a-zA-Z_$][a-zA-Z0-9_$]*)\(["']\.\.\/\.\.\/package\.json["']\)/g,
  replacementCode
);

// Write the patched bundle back
fs.writeFileSync(inputFile, bundleContent);

console.log('✅ Patched framework package.json require');

// Make the file executable
fs.chmodSync(inputFile, 0o755);

// Get file size
const stats = fs.statSync(inputFile);
const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

console.log('✅ Bundle ready for distribution!');
console.log('Output file:', inputFile);
console.log(`File size: ${fileSizeInMB} MB`);
console.log('');
console.log('The bundle is minified and ready to use.');
console.log('Run: node dist/gcalendar-mcp.bundle.cjs');
