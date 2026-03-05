#!/usr/bin/env node
/**
 * Builds word-lists/word-sets-index.json from minimal_pairs_by_process.csv
 * so games can offer "browse by phonological process" or "browse by phoneme (sound + position)".
 * Run from repo root: node word-lists/build-index.js
 */
const fs = require('fs');
const path = require('path');

const CSV_PATH = path.join(__dirname, 'minimal_pairs_by_process.csv');
const OUT_PATH = path.join(__dirname, 'word-sets-index.json');

function parseCSV(text) {
  const rows = [];
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return rows;
  const headers = lines[0].split(',').map(h => h.trim());
  for (let i = 1; i < lines.length; i++) {
    const values = [];
    let inQuotes = false;
    let cell = '';
    for (let j = 0; j < lines[i].length; j++) {
      const ch = lines[i][j];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if ((ch === ',' && !inQuotes) || (ch === '\n' && !inQuotes)) {
        values.push(cell.trim());
        cell = '';
      } else {
        cell += ch;
      }
    }
    values.push(cell.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }
  return rows;
}

/** Normalize folder so it can match word-sets.json (e.g. "D/G Minimal Pairs - Initial" -> "D:G Minimal Pairs - Initial") */
function normalizeFolder(folderNameSlash) {
  if (!folderNameSlash) return '';
  return folderNameSlash.replace(/\//g, ':');
}

function main() {
  let csvText;
  try {
    csvText = fs.readFileSync(CSV_PATH, 'utf8');
  } catch (e) {
    console.error('Could not read', CSV_PATH, e.message);
    process.exit(1);
  }
  const rows = parseCSV(csvText);
  const byProcess = {};
  const byPhoneme = [];
  const seen = new Set();

  rows.forEach(row => {
    const processName = (row.phonological_process || '').trim();
    const sound_a = (row.sound_a || '').trim();
    const sound_b = (row.sound_b || '').trim();
    const position = (row.position || '').trim();
    const folderSlash = (row.folder_name_slash || row.folder_name || '').trim();
    const folder = normalizeFolder(folderSlash);
    const label = `${sound_a}/${sound_b} – ${position}`;

    if (!folder) return;
    const key = folder + '|' + processName;
    if (seen.has(key)) return;
    seen.add(key);

    const entry = { folder, label, sound_a, sound_b, position };
    if (!byProcess[processName]) byProcess[processName] = [];
    byProcess[processName].push(entry);
    byPhoneme.push(entry);
  });

  const index = {
    byProcess: Object.keys(byProcess).sort().reduce((acc, k) => {
      acc[k] = byProcess[k];
      return acc;
    }, {}),
    byPhoneme
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(index, null, 2), 'utf8');
  console.log('Wrote', OUT_PATH, '| processes:', Object.keys(index.byProcess).length, '| phoneme entries:', index.byPhoneme.length);
}

main();
