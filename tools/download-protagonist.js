#!/usr/bin/env node

/**
 * download-protagonist.js - Download protagonist character images from Pixabay
 * Usage: node download-protagonist.js <character-type> [--game-dir <path>]
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
require('dotenv').config();

// Character search terms
const CHARACTER_TYPES = {
  ninja: 'ninja character illustration cartoon',
  pirate: 'pirate character illustration cartoon',
  parrot: 'parrot bird character illustration cartoon',
  robot: 'robot character illustration cartoon',
  astronaut: 'astronaut space character illustration cartoon',
  dragon: 'dragon character illustration cartoon cute',
  knight: 'knight medieval character illustration cartoon',
  princess: 'princess character illustration cartoon',
  superhero: 'superhero character illustration cartoon',
  wizard: 'wizard magic character illustration cartoon',
  cat: 'cat character illustration cartoon',
  dog: 'dog character illustration cartoon',
  bear: 'bear character illustration cartoon',
  monkey: 'monkey character illustration cartoon',
  elephant: 'elephant character illustration cartoon'
};

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return { help: true };
  }

  const options = {
    character: args[0],
    gameDir: null
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--game-dir' || args[i] === '-g') {
      options.gameDir = args[i + 1];
      i++;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Protagonist Character Downloader

Downloads character sprite images from Pixabay for your game protagonist.

Usage:
  node download-protagonist.js <character-type> [--game-dir <path>]

Character Types:
  ninja, pirate, parrot, robot, astronaut, dragon, knight, princess,
  superhero, wizard, cat, dog, bear, monkey, elephant

Options:
  --game-dir, -g <path>  Game directory to save character to (default: assets/protagonist/)
  --help, -h             Show this help

Examples:
  # Download ninja to shared protagonist folder
  node download-protagonist.js ninja

  # Download pirate to specific game
  node download-protagonist.js pirate --game-dir ../games/my-pirate-game

Setup:
  Requires PIXABAY_API_KEY in .env file
  Get free API key at: https://pixabay.com/api/docs/

Note:
  Downloads a single character image. You may need to manually create
  idle/walking/celebrating variations, or use the downloaded image for all states.
  `);
}

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = require('fs').createWriteStream(filepath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      require('fs').unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function searchPixabay(query, apiKey) {
  const axios = require('axios');

  try {
    const response = await axios.get('https://pixabay.com/api/', {
      params: {
        key: apiKey,
        q: query,
        image_type: 'vector,illustration',
        orientation: 'all',
        safesearch: true,
        per_page: 10,
        category: 'people,animals'
      }
    });

    return response.data.hits || [];
  } catch (error) {
    console.error(`Error searching for "${query}":`, error.message);
    return [];
  }
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  const character = options.character;

  if (!character || !CHARACTER_TYPES[character]) {
    console.error(`Error: Invalid character type "${character}"`);
    console.log(`\nAvailable characters: ${Object.keys(CHARACTER_TYPES).join(', ')}`);
    process.exit(1);
  }

  // Check for API key
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.error('Error: PIXABAY_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log(`\n🎨 Searching for ${character} character...\n`);

  // Search Pixabay
  const searchQuery = CHARACTER_TYPES[character];
  const results = await searchPixabay(searchQuery, apiKey);

  if (results.length === 0) {
    console.log(`❌ No results found for "${character}"`);
    console.log(`Try searching manually at: https://pixabay.com/images/search/${character}/\n`);
    process.exit(1);
  }

  console.log(`Found ${results.length} images. Using best match...\n`);

  // Show top 5 results
  console.log('Top results:');
  results.slice(0, 5).forEach((img, i) => {
    console.log(`  ${i + 1}. ${img.tags} (${img.imageWidth}x${img.imageHeight})`);
    console.log(`     Preview: ${img.previewURL}\n`);
  });

  // Use the first result
  const selectedImage = results[0];

  // Determine output directory
  let outputDir;
  if (options.gameDir) {
    outputDir = path.resolve(options.gameDir, 'assets', 'protagonist');
  } else {
    const rootDir = path.resolve(__dirname, '..');
    outputDir = path.join(rootDir, 'assets', 'protagonist');
  }

  await fs.mkdir(outputDir, { recursive: true });

  // Download the image for all three states
  const imageUrl = selectedImage.largeImageURL || selectedImage.webformatURL;
  const ext = '.png';

  console.log(`Downloading character sprites...\n`);

  const states = ['idle', 'walking', 'celebrating'];
  for (const state of states) {
    const outputPath = path.join(outputDir, `${state}${ext}`);

    console.log(`  Downloading ${state}${ext}...`);

    try {
      await downloadFile(imageUrl, outputPath);
      console.log(`  ✅ Saved to ${outputPath}`);
    } catch (error) {
      console.error(`  ❌ Failed to download ${state}: ${error.message}`);
    }
  }

  console.log('\n✅ Download complete!\n');
  console.log('Image details:');
  console.log(`  Character: ${character}`);
  console.log(`  Tags: ${selectedImage.tags}`);
  console.log(`  Dimensions: ${selectedImage.imageWidth}x${selectedImage.imageHeight}`);
  console.log(`  Location: ${outputDir}\n`);

  console.log('⚠️  Note: All three states (idle/walking/celebrating) use the same image.');
  console.log('   For animated variations, you may need to manually edit the images.\n');

  if (options.gameDir) {
    console.log('To use in your game config.json:');
    console.log(`  "protagonist": {`);
    console.log(`    "character": "${character}",`);
    console.log(`    "images": {`);
    console.log(`      "idle": "assets/protagonist/idle.png",`);
    console.log(`      "walking": "assets/protagonist/walking.png",`);
    console.log(`      "celebrating": "assets/protagonist/celebrating.png"`);
    console.log(`    }`);
    console.log(`  }\n`);
  } else {
    console.log('Character saved to shared protagonist folder.');
    console.log('All games will use this character unless they specify custom images.\n');
  }
}

main();
