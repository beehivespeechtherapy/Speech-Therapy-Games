#!/usr/bin/env node

/**
 * Creates placeholder SVG images for word pairs
 * Run this script to generate placeholder images that can be replaced later
 */

const fs = require('fs');
const path = require('path');

const words = [
  'back', 'bat', 'rack', 'rat', 'beak', 'beet',
  'bike', 'bite', 'shock', 'shot', 'sick', 'sit',
  'puck', 'putt', 'hike', 'height', 'pick', 'pit',
  'kick', 'kit'
];

const pairsDir = path.join(__dirname, 'assets', 'pairs');

// Ensure directory exists
if (!fs.existsSync(pairsDir)) {
  fs.mkdirSync(pairsDir, { recursive: true });
}

words.forEach(word => {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
  <rect width="400" height="400" fill="#e3f2fd" rx="20"/>
  <rect x="20" y="20" width="360" height="360" fill="#ffffff" rx="15" stroke="#1976d2" stroke-width="3"/>
  <text x="200" y="200" text-anchor="middle" dominant-baseline="middle" 
        font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="#1976d2">
    ${word}
  </text>
  <text x="200" y="250" text-anchor="middle" dominant-baseline="middle" 
        font-family="Arial, sans-serif" font-size="24" fill="#666">
    (Placeholder)
  </text>
</svg>`;

  const filePath = path.join(pairsDir, `${word}.svg`);
  fs.writeFileSync(filePath, svg);
  console.log(`Created placeholder: ${filePath}`);
});

console.log(`\nCreated ${words.length} placeholder images.`);
console.log('Replace these SVG files with actual PNG/JPG images when ready.');
