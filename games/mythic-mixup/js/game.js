(function () {
  'use strict';

  const SLOT_ORDER = ['head', 'body', 'frontLegs', 'backLegs', 'tail'];
  const DEFAULT_REQUIRED_SLOTS = ['head', 'body', 'tail'];
  const DEFAULT_OPTIONAL_SLOTS = ['frontLegs', 'backLegs'];
  const SLOT_LABELS = {
    head: 'Head',
    body: 'Body',
    frontLegs: 'Front legs',
    backLegs: 'Back legs',
    tail: 'Tail',
  };

  let config = null;
  let selectedWordSet = null;
  let sessionChoiceCount = 2;
  let wordSetsIndex = null;
  let wordSetChoose = null;
  let composer = null;
  let audio = null;

  let equipped = {};
  let tintColor = '#4a8c3f';
  let customColor = '#6b4c9a';
  let selectedBackground = null;
  let itemsFound = 0;
  let digStates = [];
  let huntComplete = false;
  let pairQueue = [];
  let singleWordPool = [];

  let assemblyCategory = 'head';
  let assemblyUiReady = false;
  let huntResizeBound = false;
  let customizePhase = 'assemble';
  let selectedPatternId = null;
  let selectedAccessoryIds = [];
  let patternColor = '#2d2d2d';
  let accessoryColor = '#c47f2a';

  const PART_CARD_STEP = 128;

  function assetPath(relative) {
    const loc = window.location.href.split('#')[0].split('?')[0];
    const dir = loc.lastIndexOf('/') >= 0 ? loc.substring(0, loc.lastIndexOf('/') + 1) : '';
    try {
      return new URL(relative.replace(/^\//, ''), dir).href;
    } catch (e) {
      return dir + relative.replace(/^\//, '');
    }
  }

  function wordImagesRoot() {
    let path = window.location.pathname.replace(/\/games\/[^/]+(\/.*)?$/, '');
    if (!path.endsWith('/')) path += '/';
    return window.location.origin + path;
  }

  function pairImagePath(word) {
    const trimmed = (word || '').trim();
    const file = (trimmed === 'v' || trimmed === 'V') ? 'v' : (trimmed === 'Ed') ? 'Ed' : trimmed;
    try {
      return new URL('word-images/_library/' + file + '.png', wordImagesRoot()).href;
    } catch (e) {
      return assetPath('../../word-images/_library/' + file + '.png');
    }
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.add('hidden');
    });
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
    if (audio) audio.onScreen(id);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function requiredSlots() {
    if (config && config.assemblyRequiredSlots && config.assemblyRequiredSlots.length) {
      return config.assemblyRequiredSlots.slice();
    }
    return DEFAULT_REQUIRED_SLOTS.slice();
  }

  function optionalSlots() {
    if (config && config.assemblyOptionalSlots) {
      return config.assemblyOptionalSlots.slice();
    }
    return DEFAULT_OPTIONAL_SLOTS.slice();
  }

  function isOptionalSlot(slot) {
    return optionalSlots().indexOf(slot) >= 0;
  }

  function assemblyComplete() {
    return requiredSlots().every(function (slot) { return !!equipped[slot]; });
  }

  async function loadConfig() {
    const previousSets = (config && config.wordSets) || [];
    try {
      const r = await fetch('config.json', { cache: 'no-store' });
      if (r.ok) config = await r.json();
    } catch (e) { /* embedded fallback */ }
    if (!config) {
      const el = document.getElementById('game-config');
      if (el && el.textContent) {
        try { config = JSON.parse(el.textContent.trim()); } catch (e2) {}
      }
    }
    if (!config) throw new Error('Missing config');
    if (previousSets.length && !(config.wordSets && config.wordSets.length)) {
      config.wordSets = previousSets;
    }

    applyConfigChrome();
    tintColor = (config.tintColors && config.tintColors[0]) || '#4a8c3f';
    customColor = (config.tintColors && config.tintColors[12]) || '#6b4c9a';
    patternColor = (config.patternColors && config.patternColors[0]) || '#2d2d2d';
    const bgs = config.assemblyBackgrounds || [];
    selectedBackground = bgs.length ? bgs[0].path : null;

    const wordListsReady = WordSetChoose.loadCentralWordLists({
      cacheVersion: '4',
      onWordSets: function (sets) {
        if (sets && sets.length) config.wordSets = sets;
      },
      onIndex: function (index) { wordSetsIndex = index; },
    }).catch(function () { return null; });

    composer = new DinoComposer(assetPath(''));
    const catalogReadyPromise = composer.loadCatalog(assetPath('assets/parts-catalog.json'));
    await Promise.all([wordListsReady, catalogReadyPromise]);
    if (config.accessoriesVersion != null) {
      composer.setAccessoriesVersion(config.accessoriesVersion);
    }
    syncCreatureCanvasSize();

    audio = new FossilAudio(assetPath);
    audio.loadConfig(config.audio);
    audio.init();
  }

  function catalogCanvasSize() {
    const cat = composer && composer.catalog;
    const w = (cat && (cat.canvasWidth || cat.canvasSize)) || 1600;
    const h = (cat && (cat.canvasHeight || cat.canvasSize)) || w;
    return { w: w, h: h };
  }

  function syncCreatureCanvasSize() {
    const size = catalogCanvasSize();
    document.documentElement.style.setProperty('--creature-aspect', size.w + ' / ' + size.h);
    const maxEdge = 1024;
    const scale = Math.min(1, maxEdge / Math.max(size.w, size.h));
    const w = Math.max(1, Math.round(size.w * scale));
    const h = Math.max(1, Math.round(size.h * scale));
    ['assembly-canvas', 'victory-canvas'].forEach(function (id) {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      canvas.width = w;
      canvas.height = h;
    });
  }

  function formatLoadError(err) {
    const msg = (err && err.message) ? String(err.message) : String(err);
    if (window.location.protocol === 'file:' || /failed to fetch/i.test(msg)) {
      return (
        'Mythic Mix-Up needs a local web server.\n\n' +
        'In Finder, open the mythic-mixup folder and double-click:\n' +
        '  Open Mythic Mix-Up.command\n\n' +
        'Do not open index.html directly.'
      );
    }
    return 'Failed to load game: ' + msg;
  }

  function beginGameWithSet(set, choiceCount) {
    selectedWordSet = set;
    sessionChoiceCount = choiceCount;
    startHunt();
  }

  function applyConfigChrome() {
    if (!config) return;
    document.title = config.title || 'Mythic Mix-Up';
    const intro = config.intro && config.intro.message;
    if (intro) document.getElementById('intro-message').textContent = intro;
    if (config.victoryMessage) {
      document.getElementById('victory-msg').textContent = config.victoryMessage;
    }
  }

  function loadEmbeddedConfig() {
    if (config) return config;
    const el = document.getElementById('game-config');
    if (el && el.textContent) {
      try { config = JSON.parse(el.textContent.trim()); } catch (e) { /* ignore */ }
    }
    return config;
  }

  function ensureWordSetChoose() {
    if (wordSetChoose) return wordSetChoose;
    wordSetChoose = WordSetChoose.create({
      getWordSets: function () { return (config && config.wordSets) || []; },
      getWordSetsIndex: function () { return wordSetsIndex; },
      onBeginGame: beginGameWithSet,
      ensureWordSets: reloadWordLists,
      hintColor: '#2d5a24',
    });
    return wordSetChoose;
  }

  function reloadWordLists() {
    return WordSetChoose.loadCentralWordLists({
      cacheVersion: '4',
      onWordSets: function (sets) {
        if (sets && sets.length && config) config.wordSets = sets;
      },
      onIndex: function (index) { wordSetsIndex = index; },
    }).catch(function () { return null; });
  }

  function openWordMenu() {
    showScreen('choose-screen');
    const chooser = ensureWordSetChoose();
    const root = document.getElementById('choice-index-root');
    if (config && config.wordSets && config.wordSets.length) {
      chooser.showMainChoice();
      return;
    }
    if (root) {
      root.style.display = 'block';
      root.innerHTML = '<p class="choose-subtitle">Loading word lists…</p>';
    }
    reloadWordLists().then(function () {
      if (config && config.wordSets && config.wordSets.length) {
        chooser.showMainChoice();
        return;
      }
      if (root) {
        root.innerHTML = '<p class="choose-subtitle">Word lists could not be loaded. Open this game through the local server (tools/serve-fossil-forge.sh) and refresh.</p>';
      }
    });
  }

  function activeWordSet() {
    if (selectedWordSet) return selectedWordSet;
    return null;
  }

  function initWordRoundPools() {
    pairQueue = [];
    singleWordPool = [];
    const set = activeWordSet();
    if (!set || !window.WordChallenges) return;
    if (WordChallenges.getSetType(set) === 'single') {
      singleWordPool = shuffle(WordChallenges.getWordsList(set));
      return;
    }
    pairQueue = shuffle((set.pairs || []).map(function (p) { return p.slice(); }));
  }

  function buildDiscriminationRound() {
    const set = activeWordSet();
    if (!set || !window.WordChallenges) return null;

    if (WordChallenges.getSetType(set) === 'single') {
      if (!singleWordPool.length) {
        singleWordPool = shuffle(WordChallenges.getWordsList(set));
      }
      const n = Math.max(1, Math.min(3, sessionChoiceCount || 2));
      const words = [];
      while (words.length < n && singleWordPool.length) {
        words.push(singleWordPool.pop());
      }
      if (!words.length) return null;
      const targetSound = set.targetSound || '';
      const prompt = words.length > 1
        ? WordChallenges.SENTENCE_PROMPT
        : ((set.prompt && String(set.prompt).trim()) || 'Say the word');
      return {
        prompt: prompt,
        pairs: words.map(function (w) {
          return { word: w, sound: targetSound, image: pairImagePath(w), alt: w };
        }),
        correctWord: words[0],
        correctSound: targetSound,
        anyAnswerCorrect: true,
      };
    }

    if (!pairQueue.length) {
      pairQueue = shuffle((set.pairs || []).map(function (p) { return p.slice(); }));
    }
    const pair = pairQueue.pop();
    if (!pair || !pair.length) return null;
    const targetWord = pair[0];
    const contrastWord = pair[1];
    const targetSound = set.targetSound || 'k';
    const contrastSound = set.contrastSound || 't';
    return {
      prompt: set.prompt || '',
      pairs: [
        { word: targetWord, sound: targetSound, image: pairImagePath(targetWord), alt: targetWord },
        { word: contrastWord, sound: contrastSound, image: pairImagePath(contrastWord), alt: contrastWord },
      ],
      correctWord: targetWord,
      correctSound: targetSound,
    };
  }

  function showDiscrimination(onDone) {
    const round = buildDiscriminationRound();
    const promptEl = document.getElementById('discrimination-prompt');
    if (promptEl && round) promptEl.textContent = round.prompt;
    const overlay = document.getElementById('discrimination-overlay');
    const container = document.getElementById('word-choices');
    container.innerHTML = '';
    if (!round || !round.pairs.length) {
      onDone(true);
      return;
    }

    const choices = round.pairs.map(function (pair, idx) {
      return { pair: pair, originalIndex: idx };
    });
    shuffle(choices);

    const choiceButtons = [];
    choices.forEach(function (entry) {
      const pair = entry.pair;
      const idx = entry.originalIndex;
      const word = pair.word;
      const btn = document.createElement('button');
      btn.className = 'word-btn';
      const img = document.createElement('img');
      img.src = pairImagePath(word);
      img.alt = word;
      img.className = 'word-pair-img';
      img.onerror = function () { this.style.display = 'none'; };
      btn.appendChild(img);
      const label = document.createElement('span');
      label.className = 'word-label';
      label.textContent = word;
      btn.appendChild(label);
      btn.addEventListener('click', function () {
        container.querySelectorAll('.word-btn').forEach(function (b) {
          b.setAttribute('disabled', '');
        });
        const ok = DiscriminationRound.isChoiceCorrect(round, idx);
        btn.classList.add(ok ? 'correct' : 'incorrect');
        if (!ok) {
          choiceButtons.forEach(function (cb) {
            if (DiscriminationRound.isChoiceCorrect(round, cb.originalIndex)) {
              cb.btn.classList.add('correct');
            }
          });
        }
        setTimeout(function () {
          closeDiscrimination(onDone, ok);
        }, 1200);
      });
      choiceButtons.push({ btn: btn, originalIndex: idx });
      container.appendChild(btn);
    });
    overlay.classList.remove('hidden');
    if (audio) audio.setChallengeOpen(true);
  }

  function closeDiscrimination(onDone, ok) {
    const overlay = document.getElementById('discrimination-overlay');
    if (overlay) overlay.classList.add('hidden');
    if (audio) audio.setChallengeOpen(false);
    onDone(ok);
  }

  function huntSettings() {
    const h = config.hunt || {};
    const cols = h.gridCols || 5;
    const rows = h.gridRows || 4;
    const itemImages = h.itemImages || [];
    return {
      cols: cols,
      rows: rows,
      totalCells: cols * rows,
      itemsPerGame: h.itemsPerGame || h.fossilsPerGame || 10,
      itemImages: itemImages,
      brushRadius: h.brushRadius || 22,
      revealThreshold: h.revealThreshold || 0.72,
      coverSquare: h.coverSquare || 'mossy-square.png',
      background: h.background || 'backgrounds/hunt-background.png',
      inset: h.gridInset || { top: 0.07, right: 0.07, bottom: 0.08, left: 0.07 },
    };
  }

  function itemImagePath(index) {
    const list = huntSettings().itemImages;
    return assetPath(list[index]);
  }

  function initDigStates() {
    const hs = huntSettings();
    const need = Math.min(hs.itemsPerGame, hs.itemImages.length || hs.itemsPerGame);
    const positions = shuffle(Array.from({ length: hs.totalCells }, function (_, i) { return i; }))
      .slice(0, need);
    const itemIdxs = shuffle(Array.from({ length: hs.itemImages.length }, function (_, i) { return i; }))
      .slice(0, need);

    digStates = [];
    for (let i = 0; i < hs.totalCells; i++) {
      const posIdx = positions.indexOf(i);
      const hasItem = posIdx >= 0;
      digStates.push({
        index: i,
        hasItem: hasItem,
        itemIndex: hasItem ? itemIdxs[posIdx] : null,
        challenged: false,
        done: false,
        progress: 0,
      });
    }
  }

  function dirtProgress(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const data = ctx.getImageData(0, 0, w, h).data;
    let transparent = 0;
    let total = 0;
    const step = 4;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
        const i = (y * w + x) * 4 + 3;
        total++;
        if (data[i] < 128) transparent++;
      }
    }
    return total ? transparent / total : 0;
  }

  function applyStageBackgrounds() {
    const url = selectedBackground ? assetPath(selectedBackground) : '';
    ['assembly-stage-bg', 'victory-stage-bg'].forEach(function (id) {
      const img = document.getElementById(id);
      if (!img) return;
      if (url) {
        img.src = url;
        img.hidden = false;
      } else {
        img.removeAttribute('src');
        img.hidden = true;
      }
    });
  }

  function showAssemblyLoadError(message) {
    const track = document.getElementById('parts-picker-track');
    if (!track) return;
    track.innerHTML = '';
    const msg = document.createElement('p');
    msg.className = 'assembly-load-error';
    msg.textContent = message;
    track.appendChild(msg);
  }

  function catalogReady() {
    return composer && composer.catalog && (composer.catalog.species || []).length > 0;
  }

  function isAssemblePhase() {
    return customizePhase === 'assemble';
  }

  function isColorPhase() {
    return customizePhase === 'color';
  }

  function isPatternPhase() {
    return customizePhase === 'pattern';
  }

  function isAccessoryPhase() {
    return customizePhase === 'accessory';
  }

  function getSelectedPattern() {
    if (!selectedPatternId || selectedPatternId === 'none') return null;
    return (config.patterns || []).find(function (p) { return p.id === selectedPatternId; }) || null;
  }

  function rainBootsAvailable() {
    if (!composer) return false;
    return composer.rainBootsAvailable(equipped);
  }

  function isAccessoryAvailable(acc) {
    if (!acc || acc.id === 'none') return true;
    if (acc.exclusiveGroup === 'shoes' || acc.dualBootsFor) {
      return composer ? composer.shoesAvailable(equipped, acc) : false;
    }
    return true;
  }

  function getAccessoryById(id) {
    return (config.accessories || []).find(function (a) { return a.id === id; }) || null;
  }

  function accessoryLooksLikeHat(acc) {
    if (!acc) return false;
    const blob = [acc.id, acc.fileBase, acc.label].join(' ').toLowerCase();
    return blob.indexOf('hat') >= 0;
  }

  function isHatAccessory(acc) {
    return accessoryLooksLikeHat(acc);
  }

  function isAccessorySelected(id) {
    return selectedAccessoryIds.indexOf(id) >= 0;
  }

  function sanitizeAccessorySelection() {
    selectedAccessoryIds = selectedAccessoryIds.filter(function (id) {
      const acc = getAccessoryById(id);
      if (!acc || acc.id === 'none') return false;
      return isAccessoryAvailable(acc);
    });
  }

  function toggleAccessory(acc) {
    if (!acc || acc.id === 'none') {
      selectedAccessoryIds = [];
      return;
    }
    if (!isAccessoryAvailable(acc)) return;
    const idx = selectedAccessoryIds.indexOf(acc.id);
    if (idx >= 0) {
      selectedAccessoryIds.splice(idx, 1);
      return;
    }
    if (isHatAccessory(acc)) {
      selectedAccessoryIds = selectedAccessoryIds.filter(function (id) {
        return !isHatAccessory(getAccessoryById(id));
      });
    } else if (acc.exclusiveGroup) {
      selectedAccessoryIds = selectedAccessoryIds.filter(function (id) {
        const other = getAccessoryById(id);
        return !other || other.exclusiveGroup !== acc.exclusiveGroup;
      });
    }
    selectedAccessoryIds.push(acc.id);
  }

  function getSelectedAccessories() {
    return selectedAccessoryIds
      .map(function (id) { return getAccessoryById(id); })
      .filter(function (acc) { return acc && acc.id !== 'none'; })
      .sort(function (a, b) {
        return (a.stackOrder || 0) - (b.stackOrder || 0);
      });
  }

  function accessoryColorizeEnabled() {
    return getSelectedAccessories().some(function (acc) {
      return acc.colorize !== false;
    });
  }

  function updateAssemblyChrome() {
    const screen = document.getElementById('assembly-screen');
    const title = document.getElementById('assembly-title');
    const partsBar = document.getElementById('assembly-action-parts');
    const colorBar = document.getElementById('assembly-action-color');
    const patternBar = document.getElementById('assembly-action-pattern');
    const accessoryBar = document.getElementById('assembly-action-accessory');
    const colorPanel = document.getElementById('assembly-color-panel');
    if (screen) {
      screen.classList.toggle('color-mode', isColorPhase());
      screen.classList.toggle('pattern-mode', isPatternPhase());
      screen.classList.toggle('accessory-mode', isAccessoryPhase());
    }
    if (title) {
      if (isColorPhase()) title.textContent = 'Color your creature';
      else if (isPatternPhase()) title.textContent = 'Pattern your creature';
      else if (isAccessoryPhase()) title.textContent = 'Dress up your creature';
      else title.textContent = 'Assemble your creature';
    }
    if (partsBar) partsBar.classList.toggle('hidden', !isAssemblePhase());
    if (colorBar) colorBar.classList.toggle('hidden', !isColorPhase());
    if (patternBar) patternBar.classList.toggle('hidden', !isPatternPhase());
    if (accessoryBar) accessoryBar.classList.toggle('hidden', !isAccessoryPhase());
    if (colorPanel) {
      const showPanel = (isColorPhase() && composer && composer.hasCustomParts(equipped))
        || isPatternPhase()
        || (isAccessoryPhase() && accessoryColorizeEnabled());
      colorPanel.classList.toggle('hidden', !showPanel);
    }
    const colorHint = document.querySelector('.assembly-hint-color');
    if (colorHint && isColorPhase()) {
      colorHint.textContent = (composer && composer.hasCustomParts(equipped))
        ? 'Tap a color on the right to paint the body. Use the left colors for extras like manes and markings.'
        : 'Tap a color on the right to paint your creature!';
    }
    const accessoryHint = document.querySelector('.assembly-hint-accessory');
    if (accessoryHint && isAccessoryPhase()) {
      accessoryHint.textContent = accessoryColorizeEnabled()
        ? 'Pick accessories on the right (tap again to remove). Choose an accessory color on the left.'
        : 'Pick accessories on the right (tap again to remove). Hats cannot be worn together.';
    }
  }

  function applyGridInset(gridEl) {
    const hs = huntSettings();
    const inset = hs.inset;
    gridEl.style.top = (inset.top * 100) + '%';
    gridEl.style.right = (inset.right * 100) + '%';
    gridEl.style.bottom = (inset.bottom * 100) + '%';
    gridEl.style.left = (inset.left * 100) + '%';
    sizeHuntGrid(gridEl);
  }

  function sizeHuntGrid(gridEl) {
    if (!gridEl) return;
    const hs = huntSettings();
    const cols = hs.cols;
    const rows = hs.rows;
    const gap = Math.max(4, Math.min(10, Math.round(Math.min(gridEl.clientWidth, gridEl.clientHeight) * 0.012)));
    const w = gridEl.clientWidth;
    const h = gridEl.clientHeight;
    const cell = Math.max(28, Math.floor(Math.min(
      (w - gap * (cols - 1)) / cols,
      (h - gap * (rows - 1)) / rows
    )));
    gridEl.style.gap = gap + 'px';
    gridEl.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cell + 'px)';
    gridEl.style.gridTemplateRows = 'repeat(' + rows + ', ' + cell + 'px)';
    gridEl.style.placeContent = 'center';
    gridEl.style.setProperty('--moss-cell', cell + 'px');
  }

  function renderHunt() {
    const field = document.getElementById('hunt-field');
    field.innerHTML = '';
    const hs = huntSettings();
    const bg = document.createElement('img');
    bg.className = 'hunt-bg';
    bg.src = assetPath(hs.background);
    bg.alt = '';
    field.appendChild(bg);

    const grid = document.createElement('div');
    grid.className = 'hunt-grid';
    grid.id = 'hunt-grid';
    applyGridInset(grid);
    field.appendChild(grid);

    const brushRadius = hs.brushRadius;
    const threshold = hs.revealThreshold;

    digStates.forEach(function (state) {
      const wrap = document.createElement('div');
      wrap.className = 'dig-spot' + (state.hasItem ? ' has-fossil' : '');
      wrap.dataset.index = String(state.index);

      if (state.hasItem) {
        const fossilImg = document.createElement('img');
        fossilImg.className = 'fossil-img';
        fossilImg.src = itemImagePath(state.itemIndex);
        fossilImg.alt = 'Relic';
        wrap.appendChild(fossilImg);
      } else {
        const emptyBadge = document.createElement('div');
        emptyBadge.className = 'empty-badge';
        emptyBadge.textContent = 'Nothing here';
        wrap.appendChild(emptyBadge);
      }

      const canvas = document.createElement('canvas');
      canvas.className = 'dirt-layer';
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d');
      const dirtImg = new Image();
      dirtImg.onload = function () {
        ctx.drawImage(dirtImg, 0, 0, canvas.width, canvas.height);
      };
      dirtImg.src = assetPath(hs.coverSquare);

      function brushAt(clientX, clientY) {
        if (state.done || state.challenged) return;
        const rect = canvas.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * canvas.width;
        const y = ((clientY - rect.top) / rect.height) * canvas.height;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, brushRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        state.progress = dirtProgress(canvas);
        if (state.progress >= threshold && !state.challenged) {
          state.challenged = true;
          if (audio) audio.stopBrushing(true);
          showDiscrimination(function (ok) {
            if (ok) {
              state.done = true;
              if (state.hasItem) {
                wrap.classList.add('found');
                itemsFound++;
              } else {
                wrap.classList.add('empty-done');
              }
              updateHuntStatus();
            } else {
              state.challenged = false;
            }
          });
        }
      }

      function endBrush() {
        if (painting) {
          painting = false;
          if (audio) audio.stopBrushing();
        }
      }

      let painting = false;
      canvas.addEventListener('pointerdown', function (e) {
        if (state.done) return;
        painting = true;
        if (audio) audio.startBrushing();
        canvas.setPointerCapture(e.pointerId);
        brushAt(e.clientX, e.clientY);
      });
      canvas.addEventListener('pointermove', function (e) {
        if (painting) brushAt(e.clientX, e.clientY);
      });
      canvas.addEventListener('pointerup', endBrush);
      canvas.addEventListener('pointercancel', endBrush);

      wrap.appendChild(canvas);
      grid.appendChild(wrap);
    });
    updateHuntStatus();
    requestAnimationFrame(function () {
      sizeHuntGrid(grid);
      requestAnimationFrame(function () { sizeHuntGrid(grid); });
    });
    if (!huntResizeBound) {
      huntResizeBound = true;
      window.addEventListener('resize', function () {
        const g = document.getElementById('hunt-grid');
        if (g) sizeHuntGrid(g);
      });
    }
  }

  function updateHuntStatus() {
    const need = huntSettings().itemsPerGame;
    const el = document.getElementById('hunt-status');
    el.textContent = 'Relics found: ' + itemsFound + ' / ' + need;
    if (itemsFound >= need) {
      document.getElementById('hunt-continue-btn').disabled = false;
    }
  }

  function startHunt() {
    equipped = {};
    selectedPatternId = null;
    selectedAccessoryIds = [];
    patternColor = (config.patternColors && config.patternColors[0]) || '#2d2d2d';
    accessoryColor = '#c47f2a';
    tintColor = (config.tintColors && config.tintColors[0]) || '#4a8c3f';
    customColor = (config.tintColors && config.tintColors[12]) || '#6b4c9a';
    customizePhase = 'assemble';
    itemsFound = 0;
    huntComplete = false;
    initWordRoundPools();
    initDigStates();
    showScreen('hunt-screen');
    renderHunt();
    document.getElementById('hunt-continue-btn').disabled = true;
  }

  async function renderDinoCanvas(canvasId, renderPhase) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !composer) return;
    const phase = renderPhase || customizePhase;
    const useTint = phase === 'color' || phase === 'pattern' || phase === 'accessory' || phase === 'victory';
    const includePattern = phase === 'pattern' || phase === 'accessory' || phase === 'victory';
    const includeAccessory = phase === 'accessory' || phase === 'victory';
    const ctx = canvas.getContext('2d');
    await composer.render(ctx, equipped, {
      tint: useTint,
      color: tintColor,
      customColor: customColor,
      pattern: includePattern ? getSelectedPattern() : null,
      patternColor: patternColor,
      accessories: includeAccessory ? getSelectedAccessories() : [],
      accessoryColor: accessoryColor,
      destW: canvas.width,
      destH: canvas.height,
    });
  }

  function visibleAssemblySlots() {
    return SLOT_ORDER.slice();
  }

  function unequipPart(slot) {
    if (!isOptionalSlot(slot) || !equipped[slot]) return;
    delete equipped[slot];
    if (audio) audio.playClick();
    renderAssembly();
  }

  function equipPart(slot, species) {
    if (isOptionalSlot(slot) && equipped[slot] === species) {
      unequipPart(slot);
      return;
    }
    equipped[slot] = species;
    if (audio) audio.playClick();
    renderAssembly();
  }

  function selectBackground(path) {
    selectedBackground = path;
    applyStageBackgrounds();
    renderPartsPicker();
    renderAssemblyMenu();
  }

  function getElScroll(id) {
    const el = document.getElementById(id);
    return el ? el.scrollTop : 0;
  }

  function restoreElScroll(id, y, after) {
    requestAnimationFrame(function () {
      const el = document.getElementById(id);
      if (el) el.scrollTop = y;
      if (after) after();
    });
  }

  function resetPartsPickerScroll() {
    const viewport = document.getElementById('parts-picker-viewport');
    if (viewport) viewport.scrollTop = 0;
  }

  function updateMenuScrollButtons() {
    const menu = document.getElementById('assembly-menu');
    const up = document.getElementById('menu-scroll-up');
    const down = document.getElementById('menu-scroll-down');
    const nav = menu && menu.parentElement
      ? menu.parentElement.querySelector('.assembly-menu-nav')
      : null;
    if (!menu || !up || !down) return;
    const needsScroll = menu.scrollHeight > menu.clientHeight + 2;
    if (nav) nav.style.display = needsScroll ? 'flex' : 'none';
    if (!needsScroll) return;
    const maxScroll = Math.max(0, menu.scrollHeight - menu.clientHeight - 2);
    up.disabled = menu.scrollTop <= 2;
    down.disabled = menu.scrollTop >= maxScroll;
  }

  function scrollAssemblyMenu(direction) {
    const menu = document.getElementById('assembly-menu');
    if (!menu) return;
    menu.scrollBy({ top: direction * 72, behavior: 'smooth' });
  }

  function updatePartsScrollButtons() {
    const viewport = document.getElementById('parts-picker-viewport');
    const up = document.getElementById('parts-scroll-up');
    const down = document.getElementById('parts-scroll-down');
    if (!viewport || !up || !down) return;
    const maxScroll = Math.max(0, viewport.scrollHeight - viewport.clientHeight - 2);
    const needsScroll = maxScroll > 2;
    up.style.visibility = 'visible';
    down.style.visibility = 'visible';
    up.disabled = !needsScroll || viewport.scrollTop <= 2;
    down.disabled = !needsScroll || viewport.scrollTop >= maxScroll;
  }

  function scrollPartsPicker(direction) {
    const viewport = document.getElementById('parts-picker-viewport');
    if (!viewport) return;
    const amount = Math.max(PART_CARD_STEP * 2, Math.floor(viewport.clientHeight * 0.7));
    viewport.scrollBy({ top: direction * amount, behavior: 'smooth' });
  }

  function renderColorPicker() {
    const pickerY = getElScroll('parts-picker-viewport');
    const track = document.getElementById('parts-picker-track');
    const label = document.getElementById('parts-picker-label');
    if (!track) return;
    track.innerHTML = '';
    if (label) label.textContent = 'Pick a body color';
    (config.tintColors || ['#4a8c3f']).forEach(function (c) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'part-card color-card' + (c === tintColor ? ' selected' : '');
      const swatch = document.createElement('span');
      swatch.className = 'color-swatch-inner';
      swatch.style.background = c;
      card.appendChild(swatch);
      card.addEventListener('click', function () {
        tintColor = c;
        if (audio) audio.playClick();
        renderColorPicker();
        renderDinoCanvas('assembly-canvas', 'color');
      });
      track.appendChild(card);
    });
    renderSideColorPanel();
    restoreElScroll('parts-picker-viewport', pickerY, updatePartsScrollButtons);
  }

  function renderSideColorPanel() {
    const panelY = getElScroll('assembly-color-panel-grid');
    const panelLabel = document.getElementById('assembly-color-panel-label');
    const grid = document.getElementById('assembly-color-panel-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const isPattern = isPatternPhase();
    const isAccessory = isAccessoryPhase();
    const isColor = isColorPhase();
    const showCustom = isColor && composer && composer.hasCustomParts(equipped);
    if (!isPattern && !(isAccessory && accessoryColorizeEnabled()) && !showCustom) return;

    const colors = isColor ? (config.tintColors || config.patternColors || ['#6b4c9a']) : (config.patternColors || ['#2d2d2d']);
    const activeColor = isColor ? customColor : (isPattern ? patternColor : accessoryColor);
    if (panelLabel) {
      panelLabel.textContent = isColor ? 'Accent color' : (isPattern ? 'Pattern color' : 'Accessory color');
    }

    colors.forEach(function (c) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'side-color-swatch' + (c === activeColor ? ' selected' : '');
      btn.style.background = c;
      btn.setAttribute('aria-label', 'Color ' + c);
      btn.addEventListener('click', function () {
        if (isColor) customColor = c;
        else if (isPattern) patternColor = c;
        else accessoryColor = c;
        if (audio) audio.playClick();
        renderSideColorPanel();
        renderDinoCanvas('assembly-canvas', customizePhase);
      });
      grid.appendChild(btn);
    });
    restoreElScroll('assembly-color-panel-grid', panelY);
  }

  function renderPatternPicker() {
    const pickerY = getElScroll('parts-picker-viewport');
    const track = document.getElementById('parts-picker-track');
    const headerLabel = document.getElementById('parts-picker-label');
    if (!track) return;
    track.innerHTML = '';
    if (headerLabel) headerLabel.textContent = 'Pick a pattern';

    (config.patterns || []).forEach(function (pat) {
      const card = document.createElement('button');
      card.type = 'button';
      const isNone = pat.id === 'none';
      const isSelected = isNone ? !selectedPatternId : selectedPatternId === pat.id;
      card.className = 'part-card pattern-card' + (isSelected ? ' selected' : '');
      if (isNone) {
        const noneIcon = document.createElement('div');
        noneIcon.className = 'part-none-icon';
        noneIcon.textContent = '—';
        card.appendChild(noneIcon);
      } else {
        const img = document.createElement('img');
        img.className = 'part-thumb-img';
        img.src = assetPath(pat.preview || pat.path) + '?v=' + composer.getAssetVersion();
        img.alt = pat.label;
        card.appendChild(img);
      }
      const cap = document.createElement('div');
      cap.className = 'part-label';
      cap.textContent = pat.label;
      card.appendChild(cap);
      card.addEventListener('click', function () {
        selectedPatternId = isNone ? null : pat.id;
        if (audio) audio.playClick();
        renderPatternPicker();
        renderDinoCanvas('assembly-canvas', 'pattern');
      });
      track.appendChild(card);
    });

    renderSideColorPanel();
    restoreElScroll('parts-picker-viewport', pickerY, updatePartsScrollButtons);
  }

  function renderAccessoryPicker() {
    const pickerY = getElScroll('parts-picker-viewport');
    const track = document.getElementById('parts-picker-track');
    const headerLabel = document.getElementById('parts-picker-label');
    if (!track) return;
    sanitizeAccessorySelection();
    track.innerHTML = '';
    if (headerLabel) headerLabel.textContent = 'Pick accessories';

    (config.accessories || []).forEach(function (acc) {
      if (!isAccessoryAvailable(acc)) return;
      const card = document.createElement('button');
      card.type = 'button';
      const isNone = acc.id === 'none';
      const isSelected = isNone
        ? selectedAccessoryIds.length === 0
        : isAccessorySelected(acc.id);
      card.className = 'part-card pattern-card' + (isSelected ? ' selected' : '');
      if (isNone) {
        const noneIcon = document.createElement('div');
        noneIcon.className = 'part-none-icon';
        noneIcon.textContent = '—';
        card.appendChild(noneIcon);
      } else {
        const img = document.createElement('img');
        img.className = 'part-thumb-img';
        img.alt = acc.label;
        if (acc.preview) {
          img.src = assetPath(acc.preview) + '?v='
            + (config.accessoriesVersion != null ? config.accessoriesVersion : composer.getAssetVersion());
          img.onerror = function () {
            const thumb = document.createElement('canvas');
            thumb.width = 108;
            thumb.height = 108;
            thumb.className = 'part-thumb-img';
            img.replaceWith(thumb);
            composer.fillAccessoryThumb(thumb, acc).catch(function () { /* optional */ });
          };
        } else {
          const thumb = document.createElement('canvas');
          thumb.width = 108;
          thumb.height = 108;
          thumb.className = 'part-thumb-img';
          card.appendChild(thumb);
          composer.fillAccessoryThumb(thumb, acc).catch(function () { /* optional */ });
        }
        if (acc.preview) card.appendChild(img);
      }
      const cap = document.createElement('div');
      cap.className = 'part-label';
      cap.textContent = acc.label;
      card.appendChild(cap);
      card.addEventListener('click', function () {
        toggleAccessory(acc);
        if (audio) audio.playClick();
        updateAssemblyChrome();
        renderAccessoryPicker();
        renderDinoCanvas('assembly-canvas', 'accessory');
      });
      track.appendChild(card);
    });

    renderSideColorPanel();
    restoreElScroll('parts-picker-viewport', pickerY, updatePartsScrollButtons);
  }

  function renderPartsPicker() {
    if (isColorPhase()) {
      renderColorPicker();
      return;
    }
    if (isPatternPhase()) {
      renderPatternPicker();
      return;
    }
    if (isAccessoryPhase()) {
      renderAccessoryPicker();
      return;
    }
    const pickerY = getElScroll('parts-picker-viewport');
    const track = document.getElementById('parts-picker-track');
    const label = document.getElementById('parts-picker-label');
    if (!track) return;
    track.innerHTML = '';

    if (!catalogReady()) {
      if (label) label.textContent = 'Loading parts…';
      showAssemblyLoadError('Creature parts are still loading. If this stays empty, refresh the page (Cmd+Shift+R).');
      return;
    }

    if (assemblyCategory === 'background') {
      if (label) label.textContent = 'Choose a background';
      const bgs = config.assemblyBackgrounds || [];
      bgs.forEach(function (bg) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'part-card part-card-bg' + (selectedBackground === bg.path ? ' selected' : '');
        const img = document.createElement('img');
        img.className = 'part-thumb-img';
        img.src = assetPath(bg.path);
        img.alt = bg.label;
        card.appendChild(img);
        const cap = document.createElement('div');
        cap.className = 'part-label';
        cap.textContent = bg.label;
        card.appendChild(cap);
        card.addEventListener('click', function () { selectBackground(bg.path); });
        track.appendChild(card);
      });
    } else {
      const slot = assemblyCategory;
      const optional = isOptionalSlot(slot);
      if (label) {
        label.textContent = (SLOT_LABELS[slot] || slot) + ' parts' + (optional ? ' (optional)' : '');
      }

      if (optional) {
        const noneCard = document.createElement('button');
        noneCard.type = 'button';
        const noneSelected = !equipped[slot];
        noneCard.className = 'part-card part-card-none' + (noneSelected ? ' selected' : '');
        const noneIcon = document.createElement('div');
        noneIcon.className = 'part-none-icon';
        noneIcon.textContent = '—';
        noneCard.appendChild(noneIcon);
        const noneCap = document.createElement('div');
        noneCap.className = 'part-label';
        noneCap.textContent = 'None';
        noneCard.appendChild(noneCap);
        noneCard.addEventListener('click', function () { unequipPart(slot); });
        track.appendChild(noneCard);
      }

      const parts = composer.allParts().filter(function (p) { return p.slot === slot; });
      parts.forEach(function (part) {
        const card = document.createElement('button');
        card.type = 'button';
        const isSelected = equipped[slot] === part.species;
        card.className = 'part-card' + (isSelected ? ' selected' : '');
        const thumb = document.createElement('canvas');
        thumb.width = 108;
        thumb.height = 108;
        card.appendChild(thumb);
        const cap = document.createElement('div');
        cap.className = 'part-label';
        cap.textContent = part.speciesLabel;
        card.appendChild(cap);

        (function (p, cvs) {
          const eq = {};
          eq[p.slot] = p.species;
          composer.render(cvs.getContext('2d'), eq, { tint: false, destW: 108, destH: 108 })
            .catch(function () { /* thumbnail optional */ });
        })(part, thumb);

        card.addEventListener('click', function () { equipPart(slot, part.species); });
        track.appendChild(card);
      });
    }

    restoreElScroll('parts-picker-viewport', pickerY, updatePartsScrollButtons);
  }

  function renderAssemblyMenu() {
    const menu = document.getElementById('assembly-menu');
    if (!menu) return;
    const menuY = menu.scrollTop;
    menu.innerHTML = '';
    if (!catalogReady()) return;
    visibleAssemblySlots().forEach(function (slot) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-menu-btn'
        + (assemblyCategory === slot ? ' active' : '')
        + (equipped[slot] ? ' filled' : '');
      const species = equipped[slot];
      const speciesLabel = species ? ((composer.getSpecies(species) || {}).label || species) : '';
      btn.textContent = speciesLabel
        ? (SLOT_LABELS[slot] + (isOptionalSlot(slot) ? ' (opt.)' : '') + '\n' + speciesLabel)
        : SLOT_LABELS[slot] + (isOptionalSlot(slot) ? '\n(optional)' : '');
      btn.addEventListener('click', function () {
        assemblyCategory = slot;
        resetPartsPickerScroll();
        renderAssemblyMenu();
        renderPartsPicker();
      });
      menu.appendChild(btn);
    });

    const bgBtn = document.createElement('button');
    bgBtn.type = 'button';
    bgBtn.className = 'slot-menu-btn bg-btn' + (assemblyCategory === 'background' ? ' active' : '');
    bgBtn.textContent = 'Background';
    bgBtn.addEventListener('click', function () {
      assemblyCategory = 'background';
      resetPartsPickerScroll();
      renderAssemblyMenu();
      renderPartsPicker();
    });
    menu.appendChild(bgBtn);
    restoreElScroll('assembly-menu', menuY, updateMenuScrollButtons);
  }

  function setupAssemblyUi() {
    if (assemblyUiReady) return;
    assemblyUiReady = true;
    const up = document.getElementById('parts-scroll-up');
    const down = document.getElementById('parts-scroll-down');
    const viewport = document.getElementById('parts-picker-viewport');
    const menu = document.getElementById('assembly-menu');
    const menuUp = document.getElementById('menu-scroll-up');
    const menuDown = document.getElementById('menu-scroll-down');
    if (up) up.addEventListener('click', function () { scrollPartsPicker(-1); });
    if (down) down.addEventListener('click', function () { scrollPartsPicker(1); });
    if (viewport) {
      viewport.addEventListener('scroll', function () {
        updatePartsScrollButtons();
      }, { passive: true });
    }
    if (menu) {
      menu.addEventListener('scroll', function () {
        updateMenuScrollButtons();
      }, { passive: true });
    }
    if (menuUp) menuUp.addEventListener('click', function () { scrollAssemblyMenu(-1); });
    if (menuDown) menuDown.addEventListener('click', function () { scrollAssemblyMenu(1); });
    window.addEventListener('resize', function () {
      if (!document.getElementById('assembly-screen').classList.contains('hidden')) {
        updatePartsScrollButtons();
        updateMenuScrollButtons();
      }
    });
  }

  function populateAssemblyUi() {
    updateAssemblyChrome();
    if (isAssemblePhase()) renderAssemblyMenu();
    renderPartsPicker();
  }

  async function renderAssembly() {
    populateAssemblyUi();
    try {
      await renderDinoCanvas('assembly-canvas');
    } catch (e) {
      console.error('Assembly preview failed', e);
    }
    const btn = document.getElementById('assembly-continue-btn');
    if (btn) btn.disabled = !assemblyComplete();
  }

  function enterColorMode() {
    if (!assemblyComplete()) return;
    customizePhase = 'color';
    resetPartsPickerScroll();
    renderAssembly();
  }

  function exitColorMode() {
    customizePhase = 'assemble';
    resetPartsPickerScroll();
    renderAssembly();
  }

  function enterPatternMode() {
    customizePhase = 'pattern';
    resetPartsPickerScroll();
    renderAssembly();
  }

  function exitPatternMode() {
    customizePhase = 'color';
    resetPartsPickerScroll();
    renderAssembly();
  }

  function enterAccessoryMode() {
    customizePhase = 'accessory';
    sanitizeAccessorySelection();
    resetPartsPickerScroll();
    renderAssembly();
  }

  function exitAccessoryMode() {
    customizePhase = 'pattern';
    resetPartsPickerScroll();
    renderAssembly();
  }

  function skipToAssembly() {
    customizePhase = 'assemble';
    showAssembly();
  }

  function showAssembly() {
    assemblyCategory = 'head';
    customizePhase = 'assemble';
    if (audio) {
      audio.stopBrushing(true);
      audio.unlock();
      audio.ensurePlayback();
    }
    showScreen('assembly-screen');
    setupAssemblyUi();
    applyStageBackgrounds();
    populateAssemblyUi();
    renderAssembly().catch(function (err) {
      console.error('renderAssembly failed', err);
    });
  }

  async function showVictory() {
    showScreen('victory-screen');
    applyStageBackgrounds();
    await renderDinoCanvas('victory-canvas', 'victory');
    const listenAgainBtn = document.getElementById('listen-again-btn');
    if (listenAgainBtn) {
      const hasCall = !!(audio && equipped.head && audio.speciesCalls && audio.speciesCalls[equipped.head]);
      listenAgainBtn.hidden = !hasCall;
    }
    if (audio) audio.playHeadCall(equipped);
  }

  function init() {
    loadEmbeddedConfig();
    applyConfigChrome();
    ensureWordSetChoose();
    document.getElementById('start-btn').addEventListener('click', openWordMenu);

    loadConfig().then(function () {
      ensureWordSetChoose();

      document.getElementById('hunt-continue-btn').addEventListener('click', showAssembly);
      const skipBtn = document.getElementById('hunt-skip-btn');
      if (skipBtn) skipBtn.addEventListener('click', skipToAssembly);
      document.getElementById('assembly-continue-btn').addEventListener('click', enterColorMode);
      const assemblyBackBtn = document.getElementById('assembly-back-btn');
      if (assemblyBackBtn) assemblyBackBtn.addEventListener('click', exitColorMode);
      const assemblyPatternBtn = document.getElementById('assembly-pattern-btn');
      if (assemblyPatternBtn) assemblyPatternBtn.addEventListener('click', enterPatternMode);
      const patternBackBtn = document.getElementById('pattern-back-btn');
      if (patternBackBtn) patternBackBtn.addEventListener('click', exitPatternMode);
      const assemblyFinishBtn = document.getElementById('assembly-finish-btn');
      if (assemblyFinishBtn) assemblyFinishBtn.addEventListener('click', enterAccessoryMode);
      const accessoryBackBtn = document.getElementById('accessory-back-btn');
      if (accessoryBackBtn) accessoryBackBtn.addEventListener('click', exitAccessoryMode);
      const accessoryFinishBtn = document.getElementById('accessory-finish-btn');
      if (accessoryFinishBtn) accessoryFinishBtn.addEventListener('click', showVictory);
      const listenAgainBtn = document.getElementById('listen-again-btn');
      if (listenAgainBtn) {
        listenAgainBtn.addEventListener('click', function () {
          if (audio) {
            audio.unlock();
            audio.playHeadCall(equipped);
          }
        });
      }
      document.getElementById('play-again-btn').addEventListener('click', openWordMenu);
    }).catch(function (err) {
      console.error(err);
      alert(formatLoadError(err));
    });
  }

  init();
})();
