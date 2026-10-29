import fs from 'fs';
import path from 'path';

const characters = fs.readdirSync('characters').filter(f => fs.statSync(path.join('characters', f)).isDirectory());

const requiredFiles = [
  '{name}.glb',
  'NOTES.md',
  'concept/turnaround_sheet.png',
  'renders/daylight_turnaround.png',
  'renders/rave_lighting.png',
  'renders/animation_strip.png',
];

console.log(`Checking ${characters.length} characters...\n`);
let allComplete = true;

for (const name of characters) {
  const charDir = path.join('characters', name);
  const missing = [];

  for (const template of requiredFiles) {
    const filename = template.replace('{name}', name);
    const filePath = path.join(charDir, filename);
    if (!fs.existsSync(filePath)) {
      missing.push(filename);
    }
  }

  if (missing.length === 0) {
    console.log(`[PASS] ${name.padEnd(20)}: All 6/6 deliverables present`);
  } else {
    console.log(`[FAIL] ${name.padEnd(20)}: MISSING [${missing.join(', ')}]`);
    allComplete = false;
  }
}

console.log(`\nFinal Deliverables Check: ${allComplete ? '100% COMPLETE & VERIFIED!' : 'ITEMS MISSING'}`);
