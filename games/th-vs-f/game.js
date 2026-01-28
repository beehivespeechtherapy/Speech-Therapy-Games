let data;
let step = 0;
let eggsCollected = 0;

// Path coordinates for the dragon to move along
// Eggs are positioned 15px higher (y values decreased by 15)
const path = [
  { x: 154, y: 79 },   // was 94
  { x: 395, y: 73 },   // was 88
  { x: 246, y: 132 },   // was 147
  { x: 197, y: 151 },   // was 166
  { x: 146, y: 265 },   // was 280
  { x: 384, y: 204 },   // was 219
  { x: 415, y: 283 },   // was 298
  { x: 313, y: 312 },   // was 327
  { x: 193, y: 434 },   // was 449
  { x: 321, y: 421 },   // was 436
  { x: 467, y: 375 },   // was 390
  { x: 701, y: 433 }    // was 448
];

// Game data embedded directly (works without a server)
const gameData = {
  "f_vs_th_dragons": {
    "title": "Help the Dragon Find the /th/ Sound!",
    "instruction": "Which word has the /th/ sound?",
    "pairs": [
      { "distractor": "four", "target": "Thor" },
      { "distractor": "fin", "target": "thin" },
      { "distractor": "Fred", "target": "thread" },
      { "distractor": "fought", "target": "thought" },
      { "distractor": "free", "target": "three" },
      { "distractor": "first", "target": "thirst" },
      { "distractor": "frill", "target": "thrill" },
      { "distractor": "fresh", "target": "thresh" },
      { "distractor": "fun", "target": "thumb" },
      { "distractor": "foes", "target": "those" },
      { "distractor": "fair", "target": "there" },
      { "distractor": "fat", "target": "that" }
    ]
  }
};

// Load game data
const params = new URLSearchParams(window.location.search);
let gameName = params.get("game");

// Default to f_vs_th_dragons if no game specified (for direct access)
if (!gameName) {
  gameName = "f_vs_th_dragons";
}

// Wait for DOM to be ready before initializing
function startGame() {
  // Try to load from embedded data first, then fall back to fetch (for server use)
  if (gameData[gameName]) {
    // Use embedded data (works without server)
    data = gameData[gameName];
    initializeGame();
  } else {
    // Try to fetch from JSON file (works with a server)
    fetch(`games/${gameName}.json`)
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to load game: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(json => {
        data = json;
        initializeGame();
      })
      .catch(err => {
        console.error("Error loading game:", err);
        document.body.innerHTML = `
          <div style="text-align: center; padding: 50px;">
            <h2>⚠️ Error Loading Game</h2>
            <p>Game "${gameName}" not found.</p>
            <p>Please check that the game exists and try again.</p>
            <p><a href="index.html">Return to main menu</a></p>
          </div>
        `;
      });
  }
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startGame);
} else {
  // DOM is already ready
  startGame();
}

// Initialize the game with loaded data
function initializeGame() {
  // Reset game state
  step = 0;
  eggsCollected = 0;
  
  // Make sure celebration and choice screens are hidden
  const celebration = document.getElementById("celebration");
  const choiceScreen = document.getElementById("choiceScreen");
  if (celebration) celebration.classList.add("hidden");
  if (choiceScreen) choiceScreen.classList.add("hidden");
  
  // Reset egg count display
  const eggCountEl = document.getElementById("eggCount");
  if (eggCountEl) eggCountEl.textContent = "0";
  
  // Validate that we have the required data
  if (!data || !data.pairs || !Array.isArray(data.pairs) || data.pairs.length === 0) {
    throw new Error("Invalid game data: missing or empty pairs array");
  }
  if (data.pairs.length !== path.length) {
    console.warn(`Warning: Game has ${data.pairs.length} pairs but path has ${path.length} steps`);
  }
  
  // Set title and instruction
  const gameTitle = document.getElementById("gameTitle");
  const instruction = document.getElementById("instruction");
  if (gameTitle) gameTitle.textContent = data.title || "Dragon Egg Game";
  if (instruction) instruction.textContent = data.instruction || "Which word has the /th/ sound?";
  
  // Clear any existing eggs
  const eggsContainer = document.getElementById("eggs");
  if (eggsContainer) eggsContainer.innerHTML = "";
  
  createEggs();
  moveCharacter();
  // Don't show choices automatically - wait for player to click an egg
}

// Move character to current step position
function moveCharacter() {
  // Check if step is valid before accessing path
  if (step < 0 || step >= path.length) {
    console.warn("moveCharacter called with invalid step:", step);
    return;
  }
  const pos = path[step];
  const character = document.getElementById("character");
  if (character && pos) {
    character.style.left = pos.x + "px";
    character.style.top = pos.y + "px";
  }
}

// Create eggs at each path position
function createEggs() {
  const eggsContainer = document.getElementById("eggs");
  if (!eggsContainer) return;

  path.forEach((pos, index) => {
    const egg = document.createElement("img");
    egg.src = "images/egg.png";
    egg.className = "egg";
    egg.dataset.index = index;
    egg.style.cursor = "pointer";
    egg.title = "Click to collect this egg!";
    egg.style.pointerEvents = "auto"; // Make sure eggs are clickable

    egg.style.left = pos.x + "px";
    egg.style.top = pos.y + "px";

    // Make eggs clickable - only allow clicking the next egg in sequence
    egg.onclick = () => {
      if (index === step) {
        // This is the next egg to collect - show the question
        showChoices();
      } else if (index < step) {
        // This egg was already collected
        speak("You already collected this egg!");
      } else {
        // This egg is too far ahead
        speak("Collect the eggs in order!");
      }
    };

    eggsContainer.appendChild(egg);
  });
}

// Show the choice popup with two word options
function showChoices() {
  if (!data || !data.pairs || !data.pairs[step]) {
    console.error("Cannot show choices: data not loaded or invalid step");
    return;
  }
  
  const pair = data.pairs[step];
  
  // Show the choice screen
  document.getElementById("choiceScreen").classList.remove("hidden");
  document.getElementById("instructionText").textContent = data.instruction;

  // Create choices array and randomize order
  const choices = [
    { word: pair.target, correct: true },
    { word: pair.distractor, correct: false }
  ].sort(() => Math.random() - 0.5);

  // Clear and populate choices container
  const container = document.getElementById("choices");
  container.innerHTML = "";

  choices.forEach(choice => {
    const button = document.createElement("button");
    button.className = "choice-button";
    
    // Create image element for the word
    const img = document.createElement("img");
    const imageName = choice.word.toLowerCase().replace(/\s+/g, '_'); // Convert to lowercase and replace spaces with underscores
    img.alt = choice.word;
    
    // Try multiple file extensions in the images/ folder
    // First try .png, then .jpg
    let triedExtensions = false;
    img.onload = function() {
      // Image loaded successfully, make sure it's visible
      this.style.display = "block";
    };
    
    img.onerror = function() {
      if (!triedExtensions) {
        // Try .jpg if .png failed
        triedExtensions = true;
        this.src = `images/${imageName}.jpg`;
      } else {
        // Both extensions failed, hide image and show text only
        this.style.display = "none";
        console.log(`Image not found for word: ${choice.word} (tried .png and .jpg)`);
      }
    };
    
    // Start with .png
    img.src = `images/${imageName}.png`;
    
    // Add both image and text (text as fallback/accessibility)
    button.appendChild(img);
    const textSpan = document.createElement("span");
    textSpan.textContent = choice.word;
    textSpan.className = "choice-text";
    button.appendChild(textSpan);
    
    button.onclick = () => handleChoice(choice);
    container.appendChild(button);
  });

  // Speak the target word
  speak(pair.target);
}

// Handle player's choice
function handleChoice(choice) {
  // Hide choice screen
  document.getElementById("choiceScreen").classList.add("hidden");

  if (choice.correct) {
    // Correct answer: collect egg, move forward
    collectEgg(step);
    step++;
    
    // Check if game is complete BEFORE moving character
    if (step >= path.length) {
      // Game complete - don't move character, just show celebration
      setTimeout(() => endGame(), 800);
    } else {
      // Move character to new position (only if step is still valid)
      moveCharacter();
    }
    // Don't automatically show next choice - wait for player to click next egg
  } else {
    // Wrong answer: move backward
    if (step > 0) {
      step--;
      // Restore the egg at the previous step so player can click it again
      restoreEgg(step);
      moveCharacter();
    }
    // Don't automatically show choices again - wait for player to click egg
    speak("Try again! Click the egg when you're ready.");
  }
}

// Remove egg from board when collected
function collectEgg(index) {
  const egg = document.querySelector(`.egg[data-index="${index}"]`);
  if (egg) {
    egg.remove();
    eggsCollected++;
    document.getElementById("eggCount").textContent = eggsCollected;
  }
}

// Restore egg at a given index (when going back after wrong answer)
function restoreEgg(index) {
  // Check if egg already exists
  const existingEgg = document.querySelector(`.egg[data-index="${index}"]`);
  if (existingEgg) {
    return; // Egg already exists
  }
  
  const eggsContainer = document.getElementById("eggs");
  if (!eggsContainer) return;
  
  const pos = path[index];
  const egg = document.createElement("img");
  egg.src = "images/egg.png";
  egg.className = "egg";
  egg.dataset.index = index;
  egg.style.cursor = "pointer";
  egg.title = "Click to collect this egg!";
  egg.style.pointerEvents = "auto";
  
  egg.style.left = pos.x + "px";
  egg.style.top = pos.y + "px";
  
  // Make egg clickable
  egg.onclick = () => {
    if (index === step) {
      // This is the next egg to collect - show the question
      showChoices();
    } else if (index < step) {
      // This egg was already collected
      speak("You already collected this egg!");
    } else {
      // This egg is too far ahead
      speak("Collect the eggs in order!");
    }
  };
  
  eggsContainer.appendChild(egg);
  eggsCollected--;
  document.getElementById("eggCount").textContent = eggsCollected;
}

// End game and show celebration
function endGame() {
  // Hide choice screen if it's showing
  const choiceScreen = document.getElementById("choiceScreen");
  if (choiceScreen) {
    choiceScreen.classList.add("hidden");
    choiceScreen.style.display = "none";
  }
  
  const celebration = document.getElementById("celebration");
  const gif = document.getElementById("celebrationGif");
  
  console.log("endGame called - celebration:", celebration, "gif:", gif);
  
  if (celebration) {
    // Remove hidden class to show celebration
    celebration.classList.remove("hidden");
    
    // Force display to flex (override any hidden styles)
    celebration.style.display = "flex";
    celebration.style.visibility = "visible";
    celebration.style.opacity = "1";
    
    console.log("Celebration div display set to:", celebration.style.display);
    console.log("Celebration computed display:", window.getComputedStyle(celebration).display);
    
    // Make sure the GIF is visible
    if (gif) {
      console.log("GIF element found, current src:", gif.src);
      console.log("GIF natural dimensions:", gif.naturalWidth, "x", gif.naturalHeight);
      console.log("GIF computed display:", window.getComputedStyle(gif).display);
      
      // Force all display properties with inline styles (highest priority)
      gif.style.setProperty("display", "block", "important");
      gif.style.setProperty("visibility", "visible", "important");
      gif.style.setProperty("opacity", "1", "important");
      gif.style.setProperty("max-width", "400px", "important");
      gif.style.setProperty("width", "auto", "important");
      gif.style.setProperty("height", "auto", "important");
      gif.style.setProperty("margin", "0 auto 20px", "important");
      
      // Ensure the image source is correct
      // Use the src from the HTML attribute (should be "images/celebration.gif")
      const htmlSrc = gif.getAttribute("src");
      if (htmlSrc) {
        gif.src = htmlSrc;
        console.log("Using GIF src from HTML attribute:", htmlSrc);
      } else {
        // Fallback
        gif.src = "images/celebration.gif";
        console.log("Setting GIF src to fallback path");
      }
      
      // Force reload the GIF to restart animation
      setTimeout(() => {
        const currentSrc = gif.src;
        gif.src = "";
        setTimeout(() => {
          gif.src = currentSrc;
          console.log("GIF reloaded, final src:", gif.src);
        }, 50);
      }, 100);
      
      // Add error handler
      gif.onerror = function() {
        console.error("GIF failed to load from:", gif.src);
        console.error("Trying alternative path...");
        gif.src = "images/celebration.gif";
      };
      
      gif.onload = function() {
        console.log("✓ GIF loaded successfully!");
        console.log("GIF dimensions:", gif.width, "x", gif.height);
        // Double-check visibility
        gif.style.setProperty("display", "block", "important");
        gif.style.setProperty("visibility", "visible", "important");
      };
      
      // Check if already loaded
      if (gif.complete) {
        console.log("GIF already complete, dimensions:", gif.naturalWidth, "x", gif.naturalHeight);
        if (gif.naturalHeight === 0) {
          console.warn("GIF has zero height - may not have loaded properly");
        }
      }
    } else {
      console.error("❌ Celebration GIF element not found in DOM");
    }
    
    console.log("Celebration should now be visible");
  } else {
    console.error("❌ Celebration div not found");
  }
  
  speak("Great job! You helped the dragon!");
}

// Text-to-speech function
function speak(word) {
  const utterance = new SpeechSynthesisUtterance(word);
  speechSynthesis.speak(utterance);
}

// Set up button handlers when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  // Listen again button
  const listenButton = document.getElementById("listenAgain");
  if (listenButton) {
    listenButton.onclick = () => {
      if (data && data.pairs[step]) {
        speak(data.pairs[step].target);
      }
    };
  }
  
  // Play again button
  const playAgainBtn = document.getElementById("playAgainBtn");
  if (playAgainBtn) {
    playAgainBtn.onclick = () => {
      // Reset and restart the game
      if (data) {
        initializeGame();
      } else {
        location.reload();
      }
    };
  }
});
