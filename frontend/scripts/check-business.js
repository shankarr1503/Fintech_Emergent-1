// Fails the production web build while src/config/business.json still has TODO values,
// so legal pages never ship without the company's real details.
const details = require('../src/config/business.json');

const missing = Object.entries(details).filter(([k, v]) => k !== '_readme' && String(v).startsWith('TODO'));
if (missing.length) {
  console.error('\nFill in these business details in frontend/src/config/business.json before a production build:');
  for (const [k, v] of missing) console.error(`  ${k}: ${v.replace(/^TODO:\s*/, '')}`);
  console.error('');
  process.exit(1);
}
console.log('Business details complete.');
