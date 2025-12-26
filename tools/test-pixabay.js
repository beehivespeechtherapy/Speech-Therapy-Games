#!/usr/bin/env node

/**
 * test-pixabay.js - Quick tool to test Pixabay queries
 * Usage: node test-pixabay.js "search query" [illustration|photo|all]
 */

const fs = require('fs').promises;
const https = require('https');
const path = require('path');
require('dotenv').config();

// Parse command line arguments
const query = process.argv[2];
const imageType = process.argv[3] || 'illustration'; // illustration, photo, all

if (!query) {
  console.log(`
Usage: node test-pixabay.js "search query" [illustration|photo|all]

Examples:
  node test-pixabay.js "person sipping cup" illustration
  node test-pixabay.js "sip" photo
  node test-pixabay.js "coffee" all

Image types:
  illustration - Clipart/cartoon images (default)
  photo - Real photographs
  all - All image types
  `);
  process.exit(1);
}

// Check for API key
const apiKey = process.env.PIXABAY_API_KEY;
if (!apiKey) {
  console.error('Error: PIXABAY_API_KEY not found in .env file');
  process.exit(1);
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

// Search Pixabay
async function searchPixabay(query, imageType) {
  const axios = require('axios');

  const params = {
    key: apiKey,
    q: query,
    safesearch: true,
    per_page: 5,
    min_width: 200,
    min_height: 200
  };

  // Add image_type filter unless "all"
  if (imageType !== 'all') {
    params.image_type = imageType;
  }

  try {
    const response = await axios.get('https://pixabay.com/api/', { params });
    return response.data.hits || [];
  } catch (error) {
    console.error(`Error searching Pixabay:`, error.message);
    return [];
  }
}

// Main
async function main() {
  console.log(`\n🔍 Searching Pixabay for: "${query}" (type: ${imageType})\n`);

  const results = await searchPixabay(query, imageType);

  if (results.length === 0) {
    console.log('❌ No results found');
    process.exit(1);
  }

  console.log(`Found ${results.length} results:\n`);

  // Show all results
  results.forEach((img, index) => {
    console.log(`${index + 1}. ${img.tags}`);
    console.log(`   Preview: ${img.previewURL}`);
    console.log(`   Size: ${img.imageWidth}x${img.imageHeight}`);
    console.log('');
  });

  // Download first result
  const firstResult = results[0];
  const imageUrl = firstResult.webformatURL || firstResult.largeImageURL;
  const fileExt = path.extname(new URL(imageUrl).pathname) || '.jpg';

  // Create filename from query (sanitized)
  const sanitizedQuery = query.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const filename = `pixabay-${sanitizedQuery}-${Date.now()}${fileExt}`;
  const filepath = path.join('/tmp', filename);

  console.log(`📥 Downloading first result...`);
  await downloadFile(imageUrl, filepath);

  console.log(`\n✅ Downloaded to: ${filepath}`);
  console.log(`   Tags: ${firstResult.tags}`);
  console.log(`\nTo view: open ${filepath}\n`);
}

main().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
