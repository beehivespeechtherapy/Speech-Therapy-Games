#!/usr/bin/env node

/**
 * create-game.js - Scaffold a new speech therapy game from template
 * Usage: node create-game.js --name "game-name" --title "Game Title"
 */

const fs = require('fs').promises;
const path = require('path');

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) {
      options.name = args[i + 1];
      i++;
    } else if (args[i] === '--title' && args[i + 1]) {
      options.title = args[i + 1];
      i++;
    } else if (args[i] === '--protagonist' && args[i + 1]) {
      options.protagonist = args[i + 1];
      i++;
    } else if (args[i] === '--background' && args[i + 1]) {
      options.background = args[i + 1];
      i++;
    } else if (args[i] === '--help' || args[i] === '-h') {
      options.help = true;
    }
  }

  return options;
}

// Show help message
function showHelp() {
  console.log(`
Speech Therapy Game Creator

Usage:
  node create-game.js --name <game-name> --title <game-title> [options]

Required Options:
  --name <game-name>      Name for game directory (lowercase, hyphens allowed)
  --title <game-title>    Display title for the game

Optional:
  --protagonist <type>    Download protagonist character (ninja, pirate, parrot, etc.)
  --background <theme>    Download background image (jungle, castle, space, etc.)
  --help, -h              Show this help message

Available Protagonists:
  ninja, pirate, parrot, robot, astronaut, dragon, knight, princess,
  superhero, wizard, cat, dog, bear, monkey, elephant

Available Backgrounds:
  jungle, castle, space, ocean, desert, winter, city, forest, mountain

Examples:
  # Basic game with default ninja
  node create-game.js --name "s-vs-sh" --title "S vs SH Sounds"

  # Pirate adventure with ocean theme
  node create-game.js --name "pirate-r" --title "Pirate R Sounds" --protagonist pirate --background ocean

  # Space theme with robot
  node create-game.js --name "space-th" --title "Space TH Sounds" --protagonist robot --background space
  `);
}

// Copy directory recursively
async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Validate game name
function validateGameName(name) {
  if (!name) {
    throw new Error('Game name is required');
  }

  // Check for valid characters
  if (!/^[a-z0-9-]+$/.test(name)) {
    throw new Error('Game name must contain only lowercase letters, numbers, and hyphens');
  }

  return true;
}

// Update root index.html with new game entry
async function updateRootIndex(gameName, gameTitle, gameDescription) {
  const rootDir = path.resolve(__dirname, '..');
  const indexPath = path.join(rootDir, 'index.html');

  try {
    let content = await fs.readFile(indexPath, 'utf8');

    // Find the games array
    const gamesArrayRegex = /const games = \[([\s\S]*?)\];/;
    const match = content.match(gamesArrayRegex);

    if (!match) {
      console.warn('⚠️  Could not find games array in index.html. Skipping update.');
      return;
    }

    const currentArray = match[1];

    // Check if game already exists in array
    if (currentArray.includes(`name: '${gameName}'`)) {
      console.log('Game already exists in index.html');
      return;
    }

    // Create new game entry
    const newEntry = `\n      { name: '${gameName}', title: '${gameTitle}', description: '${gameDescription}' },`;

    // Insert new entry (before the closing bracket)
    const updatedArray = currentArray + newEntry;
    const updatedContent = content.replace(gamesArrayRegex, `const games = [${updatedArray}\n    ];`);

    await fs.writeFile(indexPath, updatedContent);
    console.log('✅ Added game to index.html');
  } catch (error) {
    console.warn('⚠️  Could not update index.html:', error.message);
  }
}

// Create a new game
async function createGame(gameName, gameTitle, protagonist, background) {
  try {
    // Validate inputs
    validateGameName(gameName);

    if (!gameTitle) {
      gameTitle = gameName.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ');
    }

    console.log(`\nCreating new game: ${gameTitle}`);
    console.log(`Directory name: ${gameName}`);
    if (protagonist) console.log(`Protagonist: ${protagonist}`);
    if (background) console.log(`Background: ${background}`);
    console.log();

    // Paths
    const rootDir = path.resolve(__dirname, '..');
    const templateDir = path.join(rootDir, 'template');
    const gamesDir = path.join(rootDir, 'games');
    const gameDir = path.join(gamesDir, gameName);

    // Check if game already exists
    try {
      await fs.access(gameDir);
      throw new Error(`Game "${gameName}" already exists at ${gameDir}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error;
      }
    }

    // Create games directory if it doesn't exist
    await fs.mkdir(gamesDir, { recursive: true });

    // Copy template to new game directory
    console.log('📁 Copying template files...');
    await copyDir(templateDir, gameDir);

    // Update config.json with game title
    const configPath = path.join(gameDir, 'config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    config.title = gameTitle;
    config.description = `Practice with ${gameTitle}`;

    // Update protagonist if specified
    if (protagonist) {
      config.protagonist = {
        character: protagonist,
        images: {
          idle: 'assets/protagonist/idle.png',
          walking: 'assets/protagonist/walking.png',
          celebrating: 'assets/protagonist/celebrating.png'
        }
      };
    }

    // Update background if specified
    if (background) {
      if (!config.map) config.map = {};
      config.map.theme = background;
      config.map.backgroundImage = `../../assets/maps/${background}-bg.jpg`;
      if (!config.map.pathStyle) config.map.pathStyle = 'winding';
    }

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));

    // Download protagonist if specified
    if (protagonist) {
      console.log(`\n🎭 Downloading ${protagonist} character sprites...`);
      try {
        const { execSync } = require('child_process');
        execSync(`node ${path.join(__dirname, 'download-protagonist.js')} ${protagonist} --game-dir ${gameDir}`, {
          stdio: 'inherit'
        });
      } catch (error) {
        console.warn(`⚠️  Failed to download protagonist. You can download manually later.`);
      }
    }

    // Download background if specified
    if (background) {
      console.log(`\n🎨 Downloading ${background} background...`);
      try {
        const { execSync } = require('child_process');
        execSync(`node ${path.join(__dirname, 'download-background.js')} ${background}`, {
          stdio: 'inherit'
        });
      } catch (error) {
        console.warn(`⚠️  Failed to download background. You can download manually later.`);
      }
    }

    // Create README for the game
    const readmePath = path.join(gameDir, 'README.md');
    const readmeContent = `# ${gameTitle}

## Setup

1. Edit \`config.json\` to add your word pairs
2. Run the image download tool: \`node ../tools/download-images.js ./ --interactive\`
3. Test locally: Open \`index.html\` in your browser
4. Deploy: Commit and push to GitHub

## Config Structure

Each challenge needs:
- \`id\`: Unique number
- \`correctSound\`: The target sound students should listen for
- \`pairs\`: Array of 2 word objects, each with:
  - \`word\`: The word text
  - \`sound\`: The sound it contains (must match correctSound for one pair)
  - \`image\`: Path to image file (will be set by download tool)
  - \`alt\`: Alt text describing the image

## Next Steps

1. Add 10-12 challenges to \`config.json\`
2. Run image downloader
3. Test the game
4. Share with students!
`;
    await fs.writeFile(readmePath, readmeContent);

    // Update root index.html with new game
    console.log('\n📝 Adding game to index.html...');
    await updateRootIndex(gameName, gameTitle, config.description);

    // Success message
    console.log('✅ Game created successfully!\n');
    console.log(`📂 Location: ${gameDir}\n`);
    console.log('Next steps:');
    console.log(`  1. cd games/${gameName}`);
    console.log('  2. Edit config.json to add your word pairs');
    console.log('  3. Run: node ../../tools/download-images.js ./ --interactive');
    console.log('  4. Open index.html in your browser to test');
    console.log('  5. Commit and push to deploy\n');

  } catch (error) {
    console.error('❌ Error creating game:', error.message);
    process.exit(1);
  }
}

// Main
async function main() {
  const options = parseArgs();

  if (options.help || !options.name) {
    showHelp();
    process.exit(options.help ? 0 : 1);
  }

  await createGame(options.name, options.title, options.protagonist, options.background);
}

main();
