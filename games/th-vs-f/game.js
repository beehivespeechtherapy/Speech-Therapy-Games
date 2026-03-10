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

// Word images: in-repo copy (works on GitHub Pages)
const WORD_IMAGES_BASE = "../../word-images";
let WORD_SET_FOLDERS = {
  "tk-k1": "T:K Minimal Pairs - Initial", "tk-t1": "T:K Minimal Pairs - Initial",
  "tk-k2": "T:K Minimal Pairs - Final", "tk-t2": "T:K Minimal Pairs - Final",
  "dg-d1": "D:G Minimal Pairs - Initial", "dg-g1": "D:G Minimal Pairs - Initial",
  "dg-d2": "D:G Miminal Pairs - Final", "dg-g2": "D:G Miminal Pairs - Final",
  "vb-b1": "V:B Minimal Pairs - Initial", "vb-v1": "V:B Minimal Pairs - Initial",
  "vb-b2": "V:B Minimal Pairs - Final", "vb-v2": "V:B Minimal Pairs - Final"
};
let currentWordSetId = null;
let wordSetsIndex = null;

// Word sets for selection screen (T/K, D/G, V/B + F/TH); overridden when word-sets.json loads
const DEFAULT_F_VS_TH_SET = { id: "f_vs_th", label: "F/TH Minimal Pairs – Dragon Eggs", useGameData: "f_vs_th_dragons" };
let wordSets = [
  DEFAULT_F_VS_TH_SET,
  { id: "tk-k1", label: "T/K Minimal Pairs - Initial K", prompt: "Which word has the /k/ sound?", pairs: [["can","tan"],["cap","tap"],["cape","tape"],["car","tar"],["cart","tart"],["cod","todd"],["code","toad"],["cop","top"],["core","tore"],["cub","tub"]] },
  { id: "tk-t1", label: "T/K Minimal Pairs - Initial T", prompt: "Which word has the /t/ sound?", pairs: [["tan","can"],["tap","cap"],["tape","cape"],["tar","car"],["tart","cart"],["todd","cod"],["toad","code"],["top","cop"],["tore","core"],["tub","cub"]] },
  { id: "tk-k2", label: "T/K Minimal Pairs - Final K", prompt: "Which word has the /k/ sound?", pairs: [["back","bat"],["beak","beet"],["bike","bite"],["hike","height"],["kick","kit"],["lick","lit"],["lock","lot"],["pick","pit"],["puck","putt"],["rack","rat"]] },
  { id: "tk-t2", label: "T/K Minimal Pairs - Final T", prompt: "Which word has the /t/ sound?", pairs: [["bat","back"],["beet","beak"],["bite","bike"],["height","hike"],["kit","kick"],["lit","lick"],["lot","lock"],["pit","pick"],["putt","puck"],["rat","rack"]] },
  { id: "dg-d1", label: "D/G Minimal Pairs - Initial D", prompt: "Which word has the /d/ sound?", pairs: [["dame","game"],["date","gate"],["dawn","gone"],["deer","gear"],["doe","go"],["done","gun"],["dot","got"],["down","gown"],["dust","gust"],["dye","guy"]] },
  { id: "dg-g1", label: "D/G Minimal Pairs - Initial G", prompt: "Which word has the /g/ sound?", pairs: [["game","dame"],["gate","date"],["gone","dawn"],["gear","deer"],["go","doe"],["gun","done"],["got","dot"],["gown","down"],["gust","dust"],["guy","dye"]] },
  { id: "dg-g2", label: "D/G Minimal Pairs - Final G", prompt: "Which word has the /g/ sound?", pairs: [["bag","bad"],["beg","bed"],["bug","bud"],["dig","did"],["egg","Ed"],["hag","had"],["leg","lead"],["mug","mud"],["rag","rad"],["tag","tad"]] },
  { id: "dg-d2", label: "D/G Minimal Pairs - Final D", prompt: "Which word has the /d/ sound?", pairs: [["bad","bag"],["bed","beg"],["bud","bug"],["did","dig"],["Ed","egg"],["had","hag"],["lead","leg"],["mud","mug"],["rad","rag"],["tad","tag"]] },
  { id: "vb-b1", label: "V/B Minimal Pairs - Initial B", prompt: "Which word has the /b/ sound?", pairs: [["ban","van"],["best","vest"],["broom","vroom"],["boat","vote"],["base","vase"],["bale","veil"],["berry","very"],["bow","vow"],["bent","vent"],["bat","vat"],["bee","v"],["bet","vet"],["boo","view"],["bowl","vole"],["bane","vane"]] },
  { id: "vb-v1", label: "V/B Minimal Pairs - Initial V", prompt: "Which word has the /v/ sound?", pairs: [["veil","bale"],["vase","base"],["vat","bat"],["v","bee"],["vent","bent"],["very","berry"],["vest","best"],["vote","boat"],["view","boo"],["vroom","broom"]] },
  { id: "vb-v2", label: "V/B Minimal Pairs - Final V", prompt: "Which word has the /v/ sound?", pairs: [["carve","carb"],["curve","curb"],["wave","web"],["drive","drib"],["five","fib"],["give","goob"],["grave","grab"],["live","lab"],["love","lobe"],["nerve","nub"]] },
  { id: "vb-b2", label: "V/B Minimal Pairs - Final B", prompt: "Which word has the /b/ sound?", pairs: [["carb","carve"],["curb","curve"],["dob","dove"],["drib","drive"],["fib","five"],["goob","give"],["grab","grave"],["lab","live"],["lobe","love"],["nub","nerve"]] }
];

// Load game data
const params = new URLSearchParams(window.location.search);
let gameName = params.get("game");

// Default to f_vs_th_dragons if no game specified (for direct access)
if (!gameName) {
  gameName = "f_vs_th_dragons";
}

// Build game data from a word set (pairs are [target, distractor]; we need 12 for path)
function buildDataFromWordSet(set) {
  const pathLen = path.length;
  const pairs = [];
  for (let i = 0; i < pathLen; i++) {
    const p = set.pairs[i % set.pairs.length];
    pairs.push({ target: p[0], distractor: p[1] });
  }
  return {
    title: "Help the Dragon!",
    instruction: set.prompt || "Which word has the sound?",
    pairs: pairs
  };
}

// Show word set choice screen and populate buttons (or choice index if available)
function showWordSetChoice() {
  const screen = document.getElementById("word-set-screen");
  const list = document.getElementById("word-set-list");
  const root = document.getElementById("choice-index-root");
  const board = document.getElementById("game-board");
  if (!screen || !list) return;
  screen.classList.remove("hidden");
  if (board) board.classList.add("hidden");
  if (wordSetsIndex && wordSetsIndex.byProcess) {
    if (root) root.style.display = "block";
    list.style.display = "none";
    showMainChoice();
  } else {
    if (root) root.style.display = "none";
    list.style.display = "flex";
    list.innerHTML = "";
    wordSets.forEach(set => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "word-set-btn";
      btn.textContent = set.label;
      btn.onclick = () => startGameWithSet(set);
      list.appendChild(btn);
    });
  }
}

function setsForFolder(folder) {
  return wordSets.filter(s => (s.folder || "").trim() === (folder || "").trim());
}
function startGameWithSet(set) {
  currentWordSetId = set.useGameData ? null : set.id;
  if (set.useGameData && gameData[set.useGameData]) {
    data = gameData[set.useGameData];
  } else {
    data = buildDataFromWordSet(set);
  }
  const screen = document.getElementById("word-set-screen");
  const board = document.getElementById("game-board");
  if (screen) screen.classList.add("hidden");
  if (board) board.classList.remove("hidden");
  initializeGame();
}
function showMainChoice() {
  const root = document.getElementById("choice-index-root");
  const list = document.getElementById("word-set-list");
  if (!root || !list) return;
  list.style.display = "none";
  root.style.display = "block";
  root.innerHTML = "";
  const div = document.createElement("div");
  div.className = "choice-index-options";
  const hasIndex = wordSetsIndex && wordSetsIndex.byProcess && wordSetsIndex.byPhoneme;
  if (hasIndex) {
    const byProcessBtn = document.createElement("button");
    byProcessBtn.type = "button";
    byProcessBtn.className = "index-btn";
    byProcessBtn.textContent = "By phonological process";
    byProcessBtn.onclick = () => showProcessList();
    div.appendChild(byProcessBtn);
    const byPhonemeBtn = document.createElement("button");
    byPhonemeBtn.type = "button";
    byPhonemeBtn.className = "index-btn";
    byPhonemeBtn.textContent = "By phoneme (choose two sounds + position)";
    byPhonemeBtn.onclick = () => showPhonemeFilters();
    div.appendChild(byPhonemeBtn);
  }
  const allSetsBtn = document.createElement("button");
  allSetsBtn.type = "button";
  allSetsBtn.className = "index-btn" + (hasIndex ? " secondary" : "");
  allSetsBtn.textContent = "Show all word sets";
  allSetsBtn.onclick = () => showAllWordSets();
  div.appendChild(allSetsBtn);
  root.appendChild(div);
}
function showProcessList() {
  const root = document.getElementById("choice-index-root");
  if (!root || !wordSetsIndex || !wordSetsIndex.byProcess) return;
  root.innerHTML = "";
  const backRow = document.createElement("div");
  backRow.className = "back-row";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = "← Back";
  backBtn.onclick = () => showMainChoice();
  backRow.appendChild(backBtn);
  root.appendChild(backRow);
  const div = document.createElement("div");
  div.className = "choice-index-options";
  Object.keys(wordSetsIndex.byProcess).sort().forEach(processName => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "word-set-btn";
    btn.textContent = processName;
    btn.onclick = () => showProcessSets(processName);
    div.appendChild(btn);
  });
  root.appendChild(div);
}
function showProcessSets(processName) {
  const entries = wordSetsIndex.byProcess[processName] || [];
  const sets = [];
  entries.forEach(entry => {
    setsForFolder(entry.folder).forEach(s => sets.push(s));
  });
  const root = document.getElementById("choice-index-root");
  if (!root) return;
  root.innerHTML = "";
  const backRow = document.createElement("div");
  backRow.className = "back-row";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = "← Back to processes";
  backBtn.onclick = () => showProcessList();
  backRow.appendChild(backBtn);
  root.appendChild(backRow);
  if (sets.length === 0) {
    const noSets = document.createElement("p");
    noSets.style.color = "#2e7d32";
    noSets.textContent = "No word sets loaded for this process. Choose \"Show all word sets\" to see everything.";
    root.appendChild(noSets);
    return;
  }
  renderSetList(sets, startGameWithSet, () => showProcessList());
}
function showPhonemeFilters() {
  const root = document.getElementById("choice-index-root");
  if (!root || !wordSetsIndex || !wordSetsIndex.byPhoneme) return;
  const sounds = new Set();
  const positions = new Set();
  wordSetsIndex.byPhoneme.forEach(e => {
    if (e.sound_a) sounds.add(e.sound_a);
    if (e.sound_b) sounds.add(e.sound_b);
    if (e.position) positions.add(e.position);
  });
  const soundList = Array.from(sounds).sort();
  const positionList = Array.from(positions).sort();
  root.innerHTML = "";
  const backRow = document.createElement("div");
  backRow.className = "back-row";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = "← Back";
  backBtn.onclick = () => showMainChoice();
  backRow.appendChild(backBtn);
  root.appendChild(backRow);
  const filters = document.createElement("div");
  filters.className = "phoneme-filters";
  const firstLabel = document.createElement("label");
  firstLabel.textContent = "First sound:";
  const firstSelect = document.createElement("select");
  firstSelect.id = "phoneme-first";
  firstSelect.innerHTML = "<option value=\"\">--</option>" + soundList.map(s => "<option value=\"" + s + "\">" + s + "</option>").join("");
  const secondLabel = document.createElement("label");
  secondLabel.textContent = "Second sound:";
  const secondSelect = document.createElement("select");
  secondSelect.id = "phoneme-second";
  secondSelect.innerHTML = "<option value=\"\">--</option>" + soundList.map(s => "<option value=\"" + s + "\">" + s + "</option>").join("");
  const posLabel = document.createElement("label");
  posLabel.textContent = "Position:";
  const posSelect = document.createElement("select");
  posSelect.id = "phoneme-position";
  posSelect.innerHTML = "<option value=\"\">--</option>" + positionList.map(p => "<option value=\"" + p + "\">" + p + "</option>").join("");
  const showBtn = document.createElement("button");
  showBtn.type = "button";
  showBtn.className = "show-sets-btn";
  showBtn.textContent = "Show sets";
  showBtn.onclick = () => showPhonemeResults(firstSelect.value, secondSelect.value, posSelect.value);
  filters.appendChild(firstLabel);
  filters.appendChild(firstSelect);
  filters.appendChild(secondLabel);
  filters.appendChild(secondSelect);
  filters.appendChild(posLabel);
  filters.appendChild(posSelect);
  filters.appendChild(showBtn);
  root.appendChild(filters);
}
function showPhonemeResults(sound_a, sound_b, position) {
  const entries = (wordSetsIndex.byPhoneme || []).filter(e => {
    const matchA = !sound_a || e.sound_a === sound_a || e.sound_b === sound_a;
    const matchB = !sound_b || e.sound_a === sound_b || e.sound_b === sound_b;
    const matchPos = !position || e.position === position;
    const bothSounds = !sound_a || !sound_b || (e.sound_a === sound_a && e.sound_b === sound_b) || (e.sound_a === sound_b && e.sound_b === sound_a);
    return matchA && matchB && matchPos && bothSounds;
  });
  const sets = [];
  entries.forEach(entry => {
    setsForFolder(entry.folder).forEach(s => sets.push(s));
  });
  const root = document.getElementById("choice-index-root");
  if (!root) return;
  root.innerHTML = "";
  const backRow = document.createElement("div");
  backRow.className = "back-row";
  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.textContent = "← Back";
  backBtn.onclick = () => showPhonemeFilters();
  backRow.appendChild(backBtn);
  root.appendChild(backRow);
  if (sets.length === 0) {
    const p = document.createElement("p");
    p.style.color = "#2e7d32";
    p.textContent = "No word sets match. Try different sounds/position or \"Show all word sets\".";
    root.appendChild(p);
    return;
  }
  renderSetList(sets, startGameWithSet, () => showPhonemeFilters());
}
function showAllWordSets() {
  renderSetList(wordSets, startGameWithSet, wordSetsIndex ? () => showMainChoice() : null);
}
function renderSetList(sets, onPick, onBack) {
  const list = document.getElementById("word-set-list");
  const root = document.getElementById("choice-index-root");
  if (!list || !root) return;
  root.style.display = "none";
  list.style.display = "flex";
  list.innerHTML = "";
  if (onBack) {
    const backWrap = document.createElement("div");
    backWrap.className = "back-row";
    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.textContent = "← Back";
    backBtn.onclick = onBack;
    backWrap.appendChild(backBtn);
    list.appendChild(backWrap);
  }
  sets.forEach(set => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "word-set-btn";
    btn.textContent = set.label;
    btn.onclick = () => onPick(set);
    list.appendChild(btn);
  });
}

// Wait for DOM to be ready, then optionally load central word-sets.json and show word set choice
async function startGame() {
  try {
    const listRes = await fetch("../../word-lists/word-sets.json");
    if (listRes.ok) {
      const wordSetsData = await listRes.json();
      if (Array.isArray(wordSetsData) && wordSetsData.length > 0) {
        wordSets = [DEFAULT_F_VS_TH_SET].concat(wordSetsData);
        WORD_SET_FOLDERS = Object.fromEntries(wordSetsData.map(s => [s.id, s.folder || ""]));
      }
    }
  } catch (_) {}
  try {
    const indexRes = await fetch("../../word-lists/word-sets-index.json?v=2");
    if (indexRes.ok) wordSetsIndex = await indexRes.json();
  } catch (_) {}
  showWordSetChoice();
}

// Start the game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => startGame());
} else {
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
    
    const imageName = choice.word.toLowerCase().replace(/\s+/g, '_');
    const img = document.createElement("img");
    img.alt = choice.word;
    
    // Prefer Word Images folder by set; fallback to images/
    const folder = currentWordSetId && WORD_SET_FOLDERS[currentWordSetId];
    const wordFile = (choice.word === "Ed" ? "Ed" : imageName) + ".png";
    const wordImagesSrc = folder ? WORD_IMAGES_BASE + "/" + encodeURIComponent(folder).replace(/%2F/g, "/") + "/" + wordFile : null;
    const imagesSrc = `images/${imageName}.png`;
    const imagesJpg = `images/${imageName}.jpg`;
    
    let tryCount = 0;
    img.onload = function() { this.style.display = "block"; };
    img.onerror = function() {
      tryCount++;
      if (tryCount === 1 && wordImagesSrc && this.src.indexOf("word-images") >= 0) {
        this.src = imagesSrc;
        return;
      }
      if (tryCount === 2) {
        this.src = imagesJpg;
        return;
      }
      this.style.display = "none";
    };
    
    img.src = wordImagesSrc || imagesSrc;
    
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
  
  // Play again button - return to word set choice
  const playAgainBtn = document.getElementById("playAgainBtn");
  if (playAgainBtn) {
    playAgainBtn.onclick = () => {
      const celebration = document.getElementById("celebration");
      if (celebration) celebration.classList.add("hidden");
      const board = document.getElementById("game-board");
      if (board) board.classList.add("hidden");
      showWordSetChoice();
    };
  }
});
