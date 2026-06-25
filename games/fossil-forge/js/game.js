(function () {
  'use strict';

  const SLOT_ORDER = ['head', 'body', 'frontLegs', 'backLegs', 'tail'];
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

  let equipped = {};
  let tintColor = '#4a8c3f';
  let selectedBackground = null;
  let fossilsFound = 0;
  let digStates = [];
  let huntComplete = false;
  let pairQueue = [];
  let singleWordPool = [];

  let assemblyCategory = 'head';
  let assemblyUiReady = false;

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
    return SLOT_ORDER.slice();
  }

  function assemblyComplete() {
    return requiredSlots().every(function (slot) { return !!equipped[slot]; });
  }

  async function loadConfig() {
    try {
      const r = await fetch('config.json');
      if (r.ok) config = await r.json();
    } catch (e) { /* embedded fallback */ }
    if (!config) {
      const el = document.getElementById('game-config');
      if (el && el.textContent) {
        try { config = JSON.parse(el.textContent.trim()); } catch (e2) {}
      }
    }
    if (!config) throw new Error('Missing config');

    document.title = config.title || 'Fossil Forge';
    const intro = config.intro && config.intro.message;
    if (intro) document.getElementById('intro-message').textContent = intro;
    if (config.victoryMessage) {
      document.getElementById('victory-msg').textContent = config.victoryMessage;
    }
    tintColor = (config.tintColors && config.tintColors[0]) || '#4a8c3f';
    const bgs = config.assemblyBackgrounds || [];
    selectedBackground = bgs.length ? bgs[0].path : null;

    await WordSetChoose.loadCentralWordLists({
      cacheVersion: '3',
      onWordSets: function (sets) {
        if (sets && sets.length) config.wordSets = sets;
      },
      onIndex: function (index) { wordSetsIndex = index; },
    }).catch(function () { /* word lists optional when offline */ });

    composer = new DinoComposer(assetPath(''));
    await composer.loadCatalog(assetPath('assets/parts-catalog.json'));
  }

  function formatLoadError(err) {
    const msg = (err && err.message) ? String(err.message) : String(err);
    if (window.location.protocol === 'file:' || /failed to fetch/i.test(msg)) {
      return (
        'Fossil Forge needs a local web server.\n\n' +
        '1. Open Terminal\n' +
        '2. Run: tools/serve-fossil-forge.sh\n' +
        '3. Open the URL it prints (http://127.0.0.1:8888/...)\n\n' +
        'Do not double-click index.html.'
      );
    }
    return 'Failed to load game: ' + msg;
  }

  function beginGameWithSet(set, choiceCount) {
    selectedWordSet = set;
    sessionChoiceCount = choiceCount;
    startHunt();
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
          overlay.classList.add('hidden');
          onDone(ok);
        }, 1200);
      });
      choiceButtons.push({ btn: btn, originalIndex: idx });
      container.appendChild(btn);
    });
    overlay.classList.remove('hidden');
  }

  function huntSettings() {
    const h = config.hunt || {};
    const cols = h.gridCols || 4;
    const rows = h.gridRows || 5;
    return {
      cols: cols,
      rows: rows,
      totalCells: cols * rows,
      fossilsPerGame: h.fossilsPerGame || 10,
      fossilImageCount: h.fossilImageCount || 16,
      brushRadius: h.brushRadius || 22,
      revealThreshold: h.revealThreshold || 0.72,
      inset: h.gridInset || { top: 0.08, right: 0.04, bottom: 0.1, left: 0.04 },
    };
  }

  function fossilImagePath(num) {
    return assetPath('Fossils/fossil ' + num + '.png');
  }

  function initDigStates() {
    const hs = huntSettings();
    const positions = shuffle(Array.from({ length: hs.totalCells }, function (_, i) { return i; }))
      .slice(0, hs.fossilsPerGame);
    const fossilNums = shuffle(Array.from({ length: hs.fossilImageCount }, function (_, i) { return i + 1; }))
      .slice(0, hs.fossilsPerGame);

    digStates = [];
    for (let i = 0; i < hs.totalCells; i++) {
      const posIdx = positions.indexOf(i);
      const hasFossil = posIdx >= 0;
      digStates.push({
        index: i,
        hasFossil: hasFossil,
        fossilNum: hasFossil ? fossilNums[posIdx] : null,
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
    if (!selectedBackground) return;
    const url = assetPath(selectedBackground);
    ['assembly-stage-bg', 'customize-stage-bg', 'victory-stage-bg'].forEach(function (id) {
      const img = document.getElementById(id);
      if (img) img.src = url;
    });
  }

  function applyGridInset(gridEl) {
    const hs = huntSettings();
    gridEl.style.gridTemplateColumns = 'repeat(' + hs.cols + ', 1fr)';
    gridEl.style.gridTemplateRows = 'repeat(' + hs.rows + ', 1fr)';
  }

  function renderHunt() {
    const field = document.getElementById('hunt-field');
    field.innerHTML = '';
    const bg = document.createElement('img');
    bg.className = 'hunt-bg';
    bg.src = assetPath('background.png');
    bg.alt = '';
    field.appendChild(bg);

    const grid = document.createElement('div');
    grid.className = 'hunt-grid';
    grid.id = 'hunt-grid';
    applyGridInset(grid);
    field.appendChild(grid);

    const hs = huntSettings();
    const brushRadius = hs.brushRadius;
    const threshold = hs.revealThreshold;

    digStates.forEach(function (state) {
      const wrap = document.createElement('div');
      wrap.className = 'dig-spot' + (state.hasFossil ? ' has-fossil' : '');
      wrap.dataset.index = String(state.index);

      if (state.hasFossil) {
        const fossilImg = document.createElement('img');
        fossilImg.className = 'fossil-img';
        fossilImg.src = fossilImagePath(state.fossilNum);
        fossilImg.alt = 'Fossil';
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
      dirtImg.src = assetPath('dirt-square.png');

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
          showDiscrimination(function (ok) {
            if (ok) {
              state.done = true;
              if (state.hasFossil) {
                wrap.classList.add('found');
                fossilsFound++;
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

      let painting = false;
      canvas.addEventListener('pointerdown', function (e) {
        if (state.done) return;
        painting = true;
        canvas.setPointerCapture(e.pointerId);
        brushAt(e.clientX, e.clientY);
      });
      canvas.addEventListener('pointermove', function (e) {
        if (painting) brushAt(e.clientX, e.clientY);
      });
      canvas.addEventListener('pointerup', function () { painting = false; });
      canvas.addEventListener('pointercancel', function () { painting = false; });

      wrap.appendChild(canvas);
      grid.appendChild(wrap);
    });
    updateHuntStatus();
  }

  function updateHuntStatus() {
    const need = huntSettings().fossilsPerGame;
    const el = document.getElementById('hunt-status');
    el.textContent = 'Fossils found: ' + fossilsFound + ' / ' + need;
    if (fossilsFound >= need) {
      document.getElementById('hunt-continue-btn').disabled = false;
    }
  }

  function startHunt() {
    equipped = {};
    fossilsFound = 0;
    huntComplete = false;
    initWordRoundPools();
    initDigStates();
    showScreen('hunt-screen');
    renderHunt();
    document.getElementById('hunt-continue-btn').disabled = true;
  }

  async function renderDinoCanvas(canvasId, useTint) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !composer) return;
    const ctx = canvas.getContext('2d');
    await composer.render(ctx, equipped, {
      tint: useTint,
      color: tintColor,
      destW: canvas.width,
      destH: canvas.height,
    });
  }

  function visibleAssemblySlots() {
    return SLOT_ORDER.slice();
  }

  function equipPart(slot, species) {
    equipped[slot] = species;
    resetPartsPickerScroll();
    renderAssembly();
  }

  function selectBackground(path) {
    selectedBackground = path;
    applyStageBackgrounds();
    renderPartsPicker();
    renderAssemblyMenu();
  }

  function resetPartsPickerScroll() {
    const viewport = document.getElementById('parts-picker-viewport');
    if (viewport) viewport.scrollLeft = 0;
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
    const left = document.getElementById('parts-scroll-left');
    const right = document.getElementById('parts-scroll-right');
    if (!viewport || !left || !right) return;
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth - 2);
    left.disabled = viewport.scrollLeft <= 2;
    right.disabled = viewport.scrollLeft >= maxScroll;
  }

  function scrollPartsPicker(direction) {
    const viewport = document.getElementById('parts-picker-viewport');
    if (!viewport) return;
    const amount = Math.max(PART_CARD_STEP * 2, Math.floor(viewport.clientWidth * 0.75));
    viewport.scrollBy({ left: direction * amount, behavior: 'smooth' });
  }

  function renderPartsPicker() {
    const track = document.getElementById('parts-picker-track');
    const label = document.getElementById('parts-picker-label');
    if (!track) return;
    track.innerHTML = '';

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
      if (label) label.textContent = (SLOT_LABELS[slot] || slot) + ' parts';
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
          composer.render(cvs.getContext('2d'), eq, { tint: false, destW: 108, destH: 108 });
        })(part, thumb);

        card.addEventListener('click', function () { equipPart(slot, part.species); });
        track.appendChild(card);
      });
    }

    requestAnimationFrame(function () {
      updatePartsScrollButtons();
    });
  }

  function renderAssemblyMenu() {
    const menu = document.getElementById('assembly-menu');
    if (!menu) return;
    menu.innerHTML = '';
    visibleAssemblySlots().forEach(function (slot) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-menu-btn'
        + (assemblyCategory === slot ? ' active' : '')
        + (equipped[slot] ? ' filled' : '');
      const species = equipped[slot];
      const speciesLabel = species ? ((composer.getSpecies(species) || {}).label || species) : '';
      btn.textContent = speciesLabel
        ? (SLOT_LABELS[slot] + '\n' + speciesLabel)
        : SLOT_LABELS[slot];
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
    requestAnimationFrame(updateMenuScrollButtons);
  }

  function setupAssemblyUi() {
    if (assemblyUiReady) return;
    assemblyUiReady = true;
    const left = document.getElementById('parts-scroll-left');
    const right = document.getElementById('parts-scroll-right');
    const viewport = document.getElementById('parts-picker-viewport');
    const menu = document.getElementById('assembly-menu');
    const menuUp = document.getElementById('menu-scroll-up');
    const menuDown = document.getElementById('menu-scroll-down');
    if (left) {
      left.addEventListener('click', function () { scrollPartsPicker(-1); });
    }
    if (right) {
      right.addEventListener('click', function () { scrollPartsPicker(1); });
    }
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

  async function renderAssembly() {
    renderAssemblyMenu();
    await renderDinoCanvas('assembly-canvas', false);
    renderPartsPicker();
    const btn = document.getElementById('assembly-continue-btn');
    if (btn) btn.disabled = !assemblyComplete();
  }

  function skipToAssembly() {
    showAssembly();
  }

  function showAssembly() {
    assemblyCategory = 'head';
    showScreen('assembly-screen');
    setupAssemblyUi();
    applyStageBackgrounds();
    renderAssembly();
  }

  function renderColorSwatches() {
    const row = document.getElementById('color-swatches');
    row.innerHTML = '';
    (config.tintColors || ['#4a8c3f']).forEach(function (c) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'color-swatch' + (c === tintColor ? ' active' : '');
      b.style.background = c;
      b.addEventListener('click', function () {
        tintColor = c;
        renderCustomize();
      });
      row.appendChild(b);
    });
  }

  async function renderCustomize() {
    renderColorSwatches();
    await renderDinoCanvas('customize-canvas', true);
  }

  function showCustomize() {
    showScreen('customize-screen');
    applyStageBackgrounds();
    renderCustomize();
  }

  async function showVictory() {
    showScreen('victory-screen');
    applyStageBackgrounds();
    await renderDinoCanvas('victory-canvas', true);
  }

  function init() {
    loadConfig().then(function () {
      wordSetChoose = WordSetChoose.create({
        getWordSets: function () { return config.wordSets || []; },
        getWordSetsIndex: function () { return wordSetsIndex; },
        onBeginGame: beginGameWithSet,
        hintColor: '#5c4a32',
      });

      document.getElementById('start-btn').addEventListener('click', function () {
        if (config.wordSets && config.wordSets.length > 0) {
          showScreen('choose-screen');
          wordSetChoose.showMainChoice();
        } else {
          beginGameWithSet(null, 2);
        }
      });

      document.getElementById('hunt-continue-btn').addEventListener('click', showAssembly);
      const skipBtn = document.getElementById('hunt-skip-btn');
      if (skipBtn) skipBtn.addEventListener('click', skipToAssembly);
      document.getElementById('assembly-continue-btn').addEventListener('click', showCustomize);
      document.getElementById('customize-finish-btn').addEventListener('click', showVictory);
      document.getElementById('play-again-btn').addEventListener('click', function () {
        if (config.wordSets && config.wordSets.length > 0) {
          showScreen('choose-screen');
          wordSetChoose.showMainChoice();
        } else {
          startHunt();
        }
      });
    }).catch(function (err) {
      console.error(err);
      alert(formatLoadError(err));
    });
  }

  init();
})();
