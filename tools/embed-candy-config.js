const fs = require('fs');
const config = JSON.parse(fs.readFileSync('games/candy-mountain/config.json', 'utf8'));
const htmlPath = 'games/candy-mountain/index.html';
let html = fs.readFileSync(htmlPath, 'utf8');
const minified = JSON.stringify(config);
const re = /<script type="application\/json" id="game-config">[\s\S]*?<\/script>/;
const newBlock = '<script type="application/json" id="game-config">\n  ' + minified + '\n  </script>';
if (re.test(html)) {
  html = html.replace(re, newBlock);
} else {
  html = html.replace('  <script src="../../core/engine.js"></script>', '  <script type="application/json" id="game-config">\n  ' + minified + '\n  </script>\n  <script src="../../core/engine.js"></script>');
}
fs.writeFileSync(htmlPath, html);
console.log('Embedded config, length:', minified.length);
