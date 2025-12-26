#!/usr/bin/env node

/**
 * download-background.js - Download themed background images from Pixabay
 * Usage: node download-background.js <theme> [--output <path>]
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
require('dotenv').config();

// Theme search terms
const THEME_SEARCHES = {
  jungle: 'jungle landscape illustration kids',
  castle: 'castle medieval landscape illustration',
  space: 'space galaxy stars illustration',
  ocean: 'underwater ocean reef illustration',
  desert: 'desert landscape illustration',
  winter: 'winter snow landscape illustration',
  city: 'city skyline illustration',
  forest: 'forest trees landscape illustration',
  mountain: 'mountain landscape illustration'
};

function parseArgs() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    return { help: true };
  }

  const options = {
    theme: args[0],
    output: null
  };

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--output' || args[i] === '-o') {
      options.output = args[i + 1];
      i++;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Background Image Downloader

Downloads themed background images from Pixabay for game maps.

Usage:
  node download-background.js <theme> [--output <path>]

Themes:
  jungle, castle, space, ocean, desert, winter, city, forest, mountain

Options:
  --output, -o <path>  Output file path (default: assets/maps/<theme>-bg.jpg)
  --help, -h           Show this help

Examples:
  node download-background.js jungle
  node download-background.js castle --output ../assets/maps/my-castle.jpg

Setup:
  Requires PIXABAY_API_KEY in .env file
  Get free API key at: https://pixabay.com/api/docs/
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
        image_type: 'illustration,photo',
        orientation: 'horizontal',
        min_width: 1200,
        min_height: 600,
        safesearch: true,
        per_page: 10
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

  const theme = options.theme;

  if (!theme || !THEME_SEARCHES[theme]) {
    console.error(`Error: Invalid theme "${theme}"`);
    console.log(`\nAvailable themes: ${Object.keys(THEME_SEARCHES).join(', ')}`);
    process.exit(1);
  }

  // Check for API key
  const apiKey = process.env.PIXABAY_API_KEY;
  if (!apiKey) {
    console.error('Error: PIXABAY_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log(`\n🎨 Searching for ${theme} background...\n`);

  // Search Pixabay
  const searchQuery = THEME_SEARCHES[theme];
  const results = await searchPixabay(searchQuery, apiKey);

  if (results.length === 0) {
    console.log(`❌ No results found for "${theme}"`);
    console.log(`Try searching manually at: https://pixabay.com/images/search/${theme}/\n`);
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

  // Determine output path
  let outputPath = options.output;
  if (!outputPath) {
    const rootDir = path.resolve(__dirname, '..');
    const mapsDir = path.join(rootDir, 'assets', 'maps');
    await fs.mkdir(mapsDir, { recursive: true });
    outputPath = path.join(mapsDir, `${theme}-bg.jpg`);
  } else {
    outputPath = path.resolve(outputPath);
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
  }

  // Download the large image
  const imageUrl = selectedImage.largeImageURL || selectedImage.webformatURL;

  console.log(`Downloading from: ${imageUrl}`);
  console.log(`Saving to: ${outputPath}\n`);

  try {
    await downloadFile(imageUrl, outputPath);
    console.log('✅ Download complete!\n');
    console.log('Image details:');
    console.log(`  Tags: ${selectedImage.tags}`);
    console.log(`  Dimensions: ${selectedImage.imageWidth}x${selectedImage.imageHeight}`);
    console.log(`  Size: ~${Math.round(selectedImage.imageSize / 1024)}KB\n`);
    console.log('To use in your game, add to config.json:');
    console.log(`  "map": {`);
    console.log(`    "theme": "${theme}",`);
    console.log(`    "backgroundImage": "../../assets/maps/${theme}-bg.jpg"`);
    console.log(`  }\n`);
  } catch (error) {
    console.error('❌ Download failed:', error.message);
    process.exit(1);
  }
}

main();
