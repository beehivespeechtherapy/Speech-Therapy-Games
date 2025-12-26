#!/usr/bin/env node

/**
 * download-images.js - Download clipart images from Pixabay for word pairs
 * Usage: node download-images.js <game-directory> [--interactive|--auto]
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');
require('dotenv').config();

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    interactive: false,
    auto: false
  };

  if (args.length === 0) {
    return { help: true };
  }

  options.gameDir = args[0];

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--interactive' || args[i] === '-i') {
      options.interactive = true;
    } else if (args[i] === '--auto' || args[i] === '-a') {
      options.auto = true;
    } else if (args[i] === '--help' || args[i] === '-h') {
      options.help = true;
    }
  }

  // Default to auto mode if neither specified
  if (!options.interactive && !options.auto) {
    options.auto = true;
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
Speech Therapy Image Downloader

Downloads clipart images from Pixabay for word pairs in your game.

Usage:
  node download-images.js <game-directory> [options]

Options:
  --interactive, -i  Interactive mode: choose from multiple image options
  --auto, -a         Auto mode: automatically select first result (default)
  --help, -h         Show this help message

Setup:
  1. Get a free API key from https://pixabay.com/api/docs/
  2. Create a .env file in the tools directory
  3. Add: PIXABAY_API_KEY=your_key_here

Examples:
  node download-images.js ../games/s-vs-sh --auto
  node download-images.js ../games/r-vs-w --interactive

Note: This tool requires an internet connection and a Pixabay API key.
  `);
}

// Download file from URL
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
      require('fs').unlink(filepath, () => {}); // Delete file on error
      reject(err);
    });
  });
}

// Search Pixabay for images
async function searchPixabay(query, apiKey) {
  const axios = require('axios');

  try {
    // First try with vector only
    let response = await axios.get('https://pixabay.com/api/', {
      params: {
        key: apiKey,
        q: `${query} clipart cartoon illustration`, // Add clipart keywords
        image_type: 'vector', // Prioritize vector/clipart over photos
        safesearch: true,
        per_page: 10,
        min_width: 300, // Ensure decent quality
        min_height: 300
      }
    });

    // If we got results, return them
    if (response.data.hits && response.data.hits.length > 0) {
      return response.data.hits;
    }

    // Otherwise, try with illustrations (less restrictive)
    response = await axios.get('https://pixabay.com/api/', {
      params: {
        key: apiKey,
        q: `${query} clipart cartoon illustration`,
        image_type: 'illustration', // More lenient than vector
        safesearch: true,
        per_page: 10,
        min_width: 200, // Lower minimum
        min_height: 200
      }
    });

    return response.data.hits || [];
  } catch (error) {
    console.error(`Error searching for "${query}":`, error.message);
    return [];
  }
}

// Extract unique words with alt text from config
function extractWords(config) {
  const wordsMap = new Map();

  config.challenges.forEach(challenge => {
    challenge.pairs.forEach(pair => {
      if (!wordsMap.has(pair.word)) {
        wordsMap.set(pair.word, pair.alt || pair.word);
      }
    });
  });

  return wordsMap;
}

// Search Giphy for celebration GIF
async function searchGiphy(apiKey) {
  const axios = require('axios');

  const searchTerms = [
    'funny celebration',
    'cartoon victory dance',
    'kids celebration',
    'happy dance cartoon',
    'woohoo celebration',
    'funny success',
    'cartoon party'
  ];

  const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

  try {
    const response = await axios.get('https://api.giphy.com/v1/gifs/search', {
      params: {
        api_key: apiKey,
        q: randomTerm,
        limit: 20,
        rating: 'g' // Kid-friendly only
      }
    });

    if (response.data.data && response.data.data.length > 0) {
      // Pick a random GIF from results
      const randomIndex = Math.floor(Math.random() * response.data.data.length);
      return response.data.data[randomIndex].images.fixed_height.url;
    }
  } catch (error) {
    console.error(`Error searching Giphy:`, error.message);
    return null;
  }

  return null;
}

// Download images for a game
async function downloadImagesForGame(gameDir, options) {
  try {
    // Check for API key
    const apiKey = process.env.PIXABAY_API_KEY;
    if (!apiKey) {
      throw new Error('PIXABAY_API_KEY not found in environment. Please create a .env file with your API key.');
    }

    console.log(`\n🎨 Downloading images for game in: ${gameDir}\n`);

    // Load config
    const configPath = path.join(gameDir, 'config.json');
    const configContent = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configContent);

    // Extract unique words with alt text
    const wordsMap = extractWords(config);
    console.log(`Found ${wordsMap.size} unique words to download\n`);

    // Create assets/pairs directory if it doesn't exist
    const pairsDir = path.join(gameDir, 'assets', 'pairs');
    await fs.mkdir(pairsDir, { recursive: true });

    // Download images for each word
    const downloadedImages = {};
    let skippedCount = 0;

    for (const [word, altText] of wordsMap.entries()) {
      // Check if image already exists (try common extensions)
      const possibleExtensions = ['.png', '.jpg', '.jpeg', '.gif'];
      let existingFile = null;

      for (const ext of possibleExtensions) {
        const filepath = path.join(pairsDir, `${word}${ext}`);
        try {
          await fs.access(filepath);
          existingFile = `assets/pairs/${word}${ext}`;
          break;
        } catch (error) {
          // File doesn't exist, continue checking
        }
      }

      if (existingFile) {
        console.log(`Skipping "${word}" (already exists)...`);
        downloadedImages[word] = existingFile;
        skippedCount++;
        continue;
      }

      console.log(`Searching for "${word}" using: "${altText}"...`);

      // Try searching with alt text first
      let results = await searchPixabay(altText, apiKey);

      // If no results, fall back to searching with just the word
      if (results.length === 0) {
        console.log(`  No results for alt text, trying word "${word}"...`);
        results = await searchPixabay(word, apiKey);
      }

      if (results.length === 0) {
        console.log(`  ⚠️  No results found for "${word}". You'll need to manually add this image.\n`);
        continue;
      }

      // In auto mode, pick first result
      let selectedImage = results[0];

      if (options.interactive) {
        // TODO: In a full implementation, use inquirer to let user choose
        // For now, fall back to auto selection
        console.log(`  Found ${results.length} options, using first result (interactive mode requires inquirer)`);
      } else {
        console.log(`  Found ${results.length} options, using first result`);
      }

      // Download image
      const imageUrl = selectedImage.webformatURL || selectedImage.largeImageURL;
      const fileExt = path.extname(new URL(imageUrl).pathname) || '.jpg';
      const filename = `${word}${fileExt}`;
      const filepath = path.join(pairsDir, filename);

      try {
        console.log(`  Downloading: ${filename}...`);
        await downloadFile(imageUrl, filepath);
        downloadedImages[word] = `assets/pairs/${filename}`;
        console.log(`  ✅ Downloaded successfully\n`);
      } catch (error) {
        console.log(`  ❌ Failed to download: ${error.message}\n`);
      }

      // Be nice to the API - add a small delay
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Download victory GIF if not specified in config or if it's a URL
    let victoryGifDownloaded = false;
    const hasVictoryGif = config.victory && config.victory.gif;
    const isVictoryGifUrl = hasVictoryGif && (config.victory.gif.startsWith('http://') || config.victory.gif.startsWith('https://'));

    if (!hasVictoryGif || (!isVictoryGifUrl && config.victory.gif === 'assets/victory.gif')) {
      // Check if local victory.gif already exists
      const victoryGifPath = path.join(gameDir, 'assets', 'victory.gif');
      let victoryGifExists = false;
      try {
        await fs.access(victoryGifPath);
        victoryGifExists = true;
      } catch (error) {
        // File doesn't exist
      }

      if (victoryGifExists) {
        console.log('\n✅ Victory GIF already exists\n');
      } else {
        console.log('\n🎉 Downloading victory celebration GIF...');

        // Check for Giphy API key
        const giphyApiKey = process.env.GIPHY_API_KEY || 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh';

        const gifUrl = await searchGiphy(giphyApiKey);

        if (gifUrl) {
          try {
            const assetsDir = path.join(gameDir, 'assets');
            await fs.mkdir(assetsDir, { recursive: true });

            const gifPath = path.join(assetsDir, 'victory.gif');
            console.log(`  Downloading victory GIF...`);
            await downloadFile(gifUrl, gifPath);

            // Update config with GIF path
            if (!config.victory) config.victory = {};
            config.victory.gif = 'assets/victory.gif';
            victoryGifDownloaded = true;

            console.log(`  ✅ Victory GIF downloaded\n`);
          } catch (error) {
            console.log(`  ⚠️  Failed to download victory GIF: ${error.message}\n`);
          }
        } else {
          console.log(`  ⚠️  Could not find a victory GIF from Giphy\n`);
        }
      }
    } else if (isVictoryGifUrl) {
      console.log('\n✅ Victory GIF is a URL (no download needed)\n');
    } else {
      console.log('\n✅ Victory GIF already specified in config\n');
    }

    // Update config with image paths
    console.log('Updating config.json with image paths...');
    let updated = false;

    config.challenges.forEach(challenge => {
      challenge.pairs.forEach(pair => {
        if (downloadedImages[pair.word]) {
          pair.image = downloadedImages[pair.word];
          updated = true;
        }
      });
    });

    if (updated || victoryGifDownloaded) {
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      console.log('✅ Config updated\n');
    }

    // Summary
    const totalImages = Object.keys(downloadedImages).length;
    const newlyDownloaded = totalImages - skippedCount;
    const missingCount = wordsMap.size - totalImages;

    console.log('Summary:');
    if (newlyDownloaded > 0) {
      console.log(`  ✅ Downloaded: ${newlyDownloaded} new word pair images`);
    }
    if (skippedCount > 0) {
      console.log(`  ⏭️  Skipped: ${skippedCount} existing images`);
    }
    if (victoryGifDownloaded) {
      console.log(`  ✅ Downloaded: 1 victory GIF`);
    }
    if (missingCount > 0) {
      console.log(`  ⚠️  Missing: ${missingCount} images (need manual download)`);
    }
    console.log('\nNext steps:');
    console.log(`  1. Open ${path.join(gameDir, 'index.html')} in your browser to test`);
    console.log('  2. If any images are missing, download them manually');
    console.log('  3. Update config.json with manual image paths if needed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Main
async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (!options.gameDir) {
    console.error('Error: Game directory is required\n');
    showHelp();
    process.exit(1);
  }

  // Resolve game directory path
  const gameDir = path.resolve(options.gameDir);

  // Check if game directory exists
  try {
    await fs.access(gameDir);
  } catch (error) {
    console.error(`Error: Game directory not found: ${gameDir}`);
    process.exit(1);
  }

  await downloadImagesForGame(gameDir, options);
}

main();
