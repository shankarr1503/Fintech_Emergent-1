// Writes src/legal/licenses.json: every direct dependency with its licence, for the in-app Licences page.
// Run after changing dependencies: node scripts/licenses.js
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const rows = Object.keys(pkg.dependencies).sort().map((name) => {
  const meta = require(path.join(root, 'node_modules', name, 'package.json'));
  const license = typeof meta.license === 'string' ? meta.license : meta.license?.type ?? 'See package';
  return { name, version: meta.version, license };
});
fs.writeFileSync(path.join(root, 'src/legal/licenses.json'), JSON.stringify(rows, null, 2) + '\n');
console.log(`${rows.length} packages`);
