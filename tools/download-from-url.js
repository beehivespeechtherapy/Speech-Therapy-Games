#!/usr/bin/env node

/**
 * download-from-url.js - Download specific Pixabay image to replace game asset
 * Usage: node download-from-url.js <game-name> <word> <pixabay-url>
 */

const fs = require('fs').promises;
const https = require('https');
const path = require('path');
require('dotenv').config();

// Parse command line arguments
const gameName = process.argv[2]; // e.g., "s-vs-sh"
const word = process.argv[3]; // e.g., "sell"
const pixabayUrl = process.argv[4];

if (!gameName || !word || !pixabayUrl) {
  console.log(`
Usage: node download-from-url.js <game-name> <word> <pixabay-url>

Examples:
  node download-from-url.js s-vs-sh sell "https://pixabay.com/vectors/street-food-food-cart-selling-9587641/"
  node download-from-url.js animal-sounds cat "https://pixabay.com/photos/cat-pet-animal-12345/"

This will:
  1. Extract the image ID from the Pixabay URL
  2. Download the image using Pixabay API
  3. Replace the existing image in games/<game-name>/assets/pairs/<word>.{png,jpg,jpeg}
  `);
  process.exit(1);
}

// Check for API key
const apiKey = process.env.PIXABAY_API_KEY;
if (!apiKey) {
  console.error('Error: PIXABAY_API_KEY not found in .env file');
  process.exit(1);
}

// Extract image ID from Pixabay URL
function extractImageId(url) {
  // URL format: https://pixabay.com/vectors/description-words-1234567/
  // or: https://pixabay.com/photos/description-words-1234567/
  const match = url.match(/[-\/](\d+)\/?$/);
  if (!match) {
    throw new Error('Could not extract image ID from URL. Expected format: https://pixabay.com/vectors/...-1234567/');
  }
  return match[1];
}

// Get image details from Pixabay API
async function getImageById(imageId) {
  const axios = require('axios');

  try {
    const response = await axios.get('https://pixabay.com/api/', {
      params: {
        key: apiKey,
        id: imageId
      }
    });

    if (!response.data.hits || response.data.hits.length === 0) {
      throw new Error(`Image with ID ${imageId} not found`);
    }

    return response.data.hits[0];
  } catch (error) {
    throw new Error(`Error fetching image from Pixabay: ${error.message}`);
  }
}

// Download file from URL
function downloadFile(url, filepath) {
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
      require('fs').unlink(filepath, () => {}); // Delete file on error
      reject(err);
    });
  });
}

// Delete old image files with different extensions
async function deleteOldImages(baseDir, word) {
  const extensions = ['.png', '.jpg', '.jpeg', '.gif'];

  for (const ext of extensions) {
    const filepath = path.join(baseDir, `${word}${ext}`);
    try {
      await fs.unlink(filepath);
      console.log(`  🗑️  Deleted old file: ${word}${ext}`);
    } catch (error) {
      // File doesn't exist, ignore
    }
  }
}

// Main
async function main() {
  // Construct paths
  const gameDir = path.join(__dirname, '..', 'games', gameName);
  const pairsDir = path.join(gameDir, 'assets', 'pairs');

  // Check if game directory exists
  try {
    await fs.access(gameDir);
  } catch (error) {
    console.error(`Error: Game directory not found: ${gameDir}`);
    process.exit(1);
  }

  console.log(`\n📥 Downloading Pixabay image for: ${gameName}/${word}\n`);

  // Extract image ID
  const imageId = extractImageId(pixabayUrl);
  console.log(`Image ID: ${imageId}`);

  // Get image details
  console.log(`Fetching image details...`);
  const imageData = await getImageById(imageId);

  console.log(`Found: ${imageData.tags}`);
  console.log(`Size: ${imageData.imageWidth}x${imageData.imageHeight}`);
  console.log(`Type: ${imageData.type}`);

  // Get download URL
  const imageUrl = imageData.webformatURL || imageData.largeImageURL;
  const fileExt = path.extname(new URL(imageUrl).pathname) || '.jpg';

  // Delete old images
  await deleteOldImages(pairsDir, word);

  // Download new image
  const filename = `${word}${fileExt}`;
  const filepath = path.join(pairsDir, filename);

  console.log(`\nDownloading to: assets/pairs/${filename}...`);
  await downloadFile(imageUrl, filepath);

  console.log(`\n✅ Successfully replaced image for "${word}"`);
  console.log(`   Path: ${filepath}`);
  console.log(`   Tags: ${imageData.tags}`);
  console.log(`\nTo view: open "${filepath}"\n`);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
