(function () {
  'use strict';

  // Black openings in assets/background.png (1536×1024), as percentages.
  const SHELF_SLOTS = [
    { left: 62.50, top: 13.28, width: 13.54, height: 19.14 },
    { left: 81.25, top: 13.67, width: 13.80, height: 18.75 },
    { left: 63.28, top: 40.23, width: 14.06, height: 19.14 },
    { left: 81.25, top: 40.23, width: 13.80, height: 19.14 },
    { left: 62.50, top: 65.63, width: 14.84, height: 22.27 },
    { left: 81.25, top: 69.53, width: 13.80, height: 18.36 },
  ];

  let config = null;
  let selectedWordSet = null;
  let sessionChoiceCount = 2;
  let wordSetsIndex = null;
  let wordSetChoose = null;

  let shelf = [];
  let recipe = [];
  let potionDeck = [];
  let potionsMade = 0;
  let challengeOpen = false;
  let placing = false;
  let brewSerial = 0;
  let celebrationShown = false;
  let bubblingAudio = null;
  let completeAudio = null;

  function assetPath(relative) {
    const loc = window.location.href.split('#')[0].split('?')[0];
    const dir = loc.lastIndexOf('/') >= 0 ? loc.substring(0, loc.lastIndexOf('/') + 1) : '';
    try {
      return new URL(relative.replace(/^\//, ''), dir).href;
    } catch (e) {
      return dir + relative.replace(/^\//, '');
    }
  }

  function pairImagePath(word) {
    if (window.WordImages) return WordImages.libraryImagePath(word);
    return assetPath('../../word-images/_library/' + encodeURIComponent(word) + '.png');
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(function (s) {
      s.classList.add('hidden');
    });
    const el = document.getElementById(id);
    if (el) el.classList.remove('hidden');
  }

  function goalCount() {
    return (config && config.potionsPerGame) || 5;
  }

  function placedRecipeCount() {
    return shelf.filter(function (slot) {
      return slot.inRecipe && slot.placed;
    }).length;
  }

  async function loadConfig() {
    try {
      const r = await fetch('config.json', { cache: 'no-store' });
      if (r.ok) config = await r.json();
    } catch (e) { /* embedded fallback */ }
    if (!config) throw new Error('Missing config');

    document.title = (config.title || 'Bubbling Brews') + ' - Speech Therapy Game';
    const intro = config.intro && config.intro.message;
    if (intro) document.getElementById('intro-message').textContent = intro;
    const title = document.getElementById('intro-title');
    if (title) title.textContent = config.title || 'Bubbling Brews';

    const spellabelleSrc = config.assets && config.assets.spellabelle;
    ['spellabelle-img', 'victory-spellabelle'].forEach(function (id) {
      const img = document.getElementById(id);
      if (img && spellabelleSrc) img.src = assetPath(spellabelleSrc);
    });
    const portrait = document.getElementById('spellabelle-img');
    if (portrait) {
      portrait.addEventListener('error', function () {
        portrait.classList.add('missing');
        const note = document.getElementById('spellabelle-fallback');
        if (note) note.hidden = false;
      });
    }

    await WordSetChoose.loadCentralWordLists({
      cacheVersion: '3',
      onWordSets: function (sets) {
        if (sets && sets.length) config.wordSets = sets;
      },
      onIndex: function (index) { wordSetsIndex = index; },
    }).catch(function () { /* word lists optional when offline */ });
  }

  function buildStage() {
    const ingredients = shuffle((config.assets && config.assets.ingredients) || []);
    const covers = shuffle((config.assets && config.assets.covers) || []);
    const onShelf = ingredients.slice(0, SHELF_SLOTS.length);
    const recipeImages = shuffle(onShelf).slice(0, 3);
    recipe = recipeImages.slice();
    shelf = onShelf.map(function (image, i) {
      return {
        image: image,
        cover: covers[i % Math.max(covers.length, 1)] || '',
        inRecipe: recipeImages.indexOf(image) >= 0,
        revealed: false,
        placed: false,
      };
    });
  }

  function renderRecipe() {
    const row = document.getElementById('recipe-slots');
    row.innerHTML = '';
    const placed = {};
    shelf.forEach(function (slot) {
      if (slot.placed) placed[slot.image] = true;
    });
    recipe.forEach(function (image) {
      const slot = document.createElement('div');
      slot.className = 'recipe-slot' + (placed[image] ? ' placed' : '');
      const img = document.createElement('img');
      img.src = assetPath(image);
      img.alt = '';
      slot.appendChild(img);
      const mark = document.createElement('span');
      mark.className = 'found-mark';
      mark.textContent = '✓';
      mark.setAttribute('aria-hidden', 'true');
      slot.appendChild(mark);
      row.appendChild(slot);
    });
  }

  function renderShelf() {
    const root = document.getElementById('shelf');
    root.innerHTML = '';
    shelf.forEach(function (slot, index) {
      const box = SHELF_SLOTS[index];
      const el = document.createElement('div');
      el.className = 'shelf-slot';
      el.dataset.index = String(index);
      el.style.left = box.left + '%';
      el.style.top = box.top + '%';
      el.style.width = box.width + '%';
      el.style.height = box.height + '%';

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cover-btn';
      btn.setAttribute('aria-label', 'Covered ingredient');
      const cover = document.createElement('img');
      cover.className = 'cover';
      cover.alt = '';
      cover.draggable = false;
      if (slot.cover) cover.src = assetPath(slot.cover);
      btn.appendChild(cover);
      btn.addEventListener('click', function () { onCoverClick(index); });
      el.appendChild(btn);
      root.appendChild(el);
    });
  }

  function updateHint() {
    const waiting = shelf.some(function (slot) {
      return slot.revealed && slot.inRecipe && !slot.placed;
    });
    document.getElementById('brew-hint').classList.toggle('hidden', !waiting);
    document.getElementById('cauldron-drop').classList.toggle('active', waiting);
  }

  function renderPlay() {
    const bg = document.getElementById('scene-bg');
    if (bg && config.assets && config.assets.background) {
      bg.src = assetPath(config.assets.background);
    }
    renderRecipe();
    renderShelf();
    updateHint();
  }

  function startStage() {
    if (potionsMade >= goalCount()) {
      showVictory();
      return;
    }
    challengeOpen = false;
    placing = false;
    celebrationShown = false;
    buildStage();
    renderPlay();
    showScreen('play-screen');
  }

  function startGame() {
    const potions = (config.assets && config.assets.potions) || [];
    potionDeck = shuffle(potions).slice(0, goalCount());
    potionsMade = 0;
    startStage();
  }

  function showPotionCelebration() {
    const frame = document.getElementById('potion-art');
    frame.innerHTML = '';
    const img = document.createElement('img');
    img.className = 'potion-img';
    img.alt = 'Finished potion';
    img.src = assetPath(potionDeck[potionsMade] || '');
    frame.appendChild(img);

    const remaining = goalCount() - (potionsMade + 1);
    const btn = document.getElementById('potion-continue');
    if (remaining > 0) {
      btn.textContent = 'make another! We need ' + remaining + ' more!';
    } else {
      btn.textContent = 'See Spellabelle!';
    }
    showScreen('potion-screen');
  }

  function showVictory() {
    const msg = document.getElementById('victory-message');
    if (msg) msg.textContent = config.victoryMessage || 'You helped Spellabelle make every potion!';
    showScreen('victory-screen');
  }

  function onCoverClick(index) {
    const slot = shelf[index];
    if (challengeOpen || placing || !slot || slot.revealed) return;
    challengeOpen = true;
    showDiscrimination(function (correct) {
      challengeOpen = false;
      if (!correct) return;
      revealSlot(index);
    });
  }

  function revealSlot(index) {
    const slot = shelf[index];
    slot.revealed = true;
    const el = document.querySelector('.shelf-slot[data-index="' + index + '"]');
    if (!el) return;
    const btn = el.querySelector('.cover-btn');
    if (btn) btn.remove();

    const img = document.createElement('img');
    img.className = 'ingredient-img';
    img.alt = 'Ingredient';
    img.draggable = false;
    img.src = assetPath(slot.image);
    el.appendChild(img);

    if (slot.inRecipe) {
      img.classList.add('nudge');
      bindIngredient(img, slot);
    }
    updateHint();
  }

  function bindIngredient(img, slot) {
    let startX = 0;
    let startY = 0;
    let origin = null;
    let moved = false;
    let dragging = false;

    function resetStyle() {
      img.style.position = '';
      img.style.left = '';
      img.style.top = '';
      img.style.width = '';
      img.style.height = '';
      img.style.margin = '';
      img.style.zIndex = '';
      img.style.transform = '';
      img.style.transition = '';
      img.style.pointerEvents = '';
      img.style.opacity = '';
      if (!slot.placed) img.classList.add('nudge');
    }

    function pointOverCauldron(x, y) {
      const drop = document.getElementById('cauldron-drop');
      if (!drop) return false;
      const rect = drop.getBoundingClientRect();
      return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
    }

    function move(ev) {
      if (!dragging || !origin) return;
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.hypot(dx, dy) > 8) moved = true;
      img.style.position = 'fixed';
      img.style.left = (origin.left + dx) + 'px';
      img.style.top = (origin.top + dy) + 'px';
      img.style.width = origin.width + 'px';
      img.style.height = origin.height + 'px';
      img.style.margin = '0';
      img.style.transform = 'none';
      img.style.zIndex = '30';
    }

    function endDrag(ev) {
      if (!dragging) return;
      dragging = false;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', endDrag);
      window.removeEventListener('pointercancel', endDrag);
      if (slot.placed) return;
      const droppedIn = !moved || pointOverCauldron(ev.clientX, ev.clientY);
      if (droppedIn && !placing) {
        placeIngredient(slot, img);
      } else {
        resetStyle();
      }
    }

    img.addEventListener('pointerdown', function (e) {
      if (slot.placed || placing || challengeOpen || dragging) return;
      e.preventDefault();
      moved = false;
      dragging = true;
      startX = e.clientX;
      startY = e.clientY;
      origin = img.getBoundingClientRect();
      img.classList.remove('nudge');
      img.style.transform = 'none';
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', endDrag);
      window.addEventListener('pointercancel', endDrag);
    });
  }

  function placeIngredient(slot, img) {
    if (slot.placed || placing) return;
    slot.placed = true;
    placing = true;
    img.classList.remove('nudge');
    const from = img.getBoundingClientRect();
    const drop = document.getElementById('cauldron-drop').getBoundingClientRect();
    img.style.position = 'fixed';
    img.style.left = from.left + 'px';
    img.style.top = from.top + 'px';
    img.style.width = from.width + 'px';
    img.style.height = from.height + 'px';
    img.style.margin = '0';
    img.style.transform = 'none';
    img.style.zIndex = '30';
    img.style.pointerEvents = 'none';
    img.style.transition = 'left 0.4s ease, top 0.4s ease, width 0.4s ease, height 0.4s ease, opacity 0.4s ease';
    requestAnimationFrame(function () {
      const size = Math.min(from.width, drop.width) * 0.55;
      img.style.left = (drop.left + drop.width / 2 - size / 2) + 'px';
      img.style.top = (drop.top + drop.height * 0.35) + 'px';
      img.style.width = size + 'px';
      img.style.height = size + 'px';
      img.style.opacity = '0';
    });

    const isLast = placedRecipeCount() >= recipe.length;
    window.setTimeout(function () {
      if (img.parentNode) img.remove();
      placing = false;
      renderRecipe();
      updateHint();
      playBubblingThenFinish(isLast);
    }, 460);
  }

  function audioClip(which) {
    const src = config.assets && config.assets[which];
    if (!src) return null;
    if (which === 'bubbling') {
      if (!bubblingAudio) bubblingAudio = new Audio(assetPath(src));
      return bubblingAudio;
    }
    if (!completeAudio) completeAudio = new Audio(assetPath(src));
    return completeAudio;
  }

  function playBubblingThenFinish(isLast) {
    const serial = ++brewSerial;
    const bubbling = audioClip('bubbling');
    if (!bubbling) {
      if (isLast) playCompleteThenShow(serial);
      return;
    }
    bubbling.onended = function () {
      if (serial !== brewSerial) return;
      if (isLast) playCompleteThenShow(serial);
    };
    try { bubbling.currentTime = 0; } catch (e) { /* ignore */ }
    bubbling.play().catch(function () {
      if (isLast && serial === brewSerial) playCompleteThenShow(serial);
    });
  }

  function playCompleteThenShow(serial) {
    const done = audioClip('potionComplete');
    const show = function () {
      if (serial !== brewSerial || celebrationShown) return;
      celebrationShown = true;
      showPotionCelebration();
    };
    if (!done) {
      show();
      return;
    }
    done.onended = show;
    try { done.currentTime = 0; } catch (e2) { /* ignore */ }
    done.play().catch(show);
  }

  function showDiscrimination(onDone) {
    const set = selectedWordSet;
    const round = set && window.DiscriminationRound
      ? DiscriminationRound.buildRound(set, sessionChoiceCount, pairImagePath)
      : null;
    const overlay = document.getElementById('discrimination-overlay');
    const container = document.getElementById('word-choices');
    const promptEl = document.getElementById('discrimination-prompt');
    container.innerHTML = '';
    if (!round || !round.pairs || !round.pairs.length) {
      onDone(true);
      return;
    }
    if (promptEl) promptEl.textContent = round.prompt || 'Which word?';

    const choices = round.pairs.map(function (pair, idx) {
      return { pair: pair, originalIndex: idx };
    });
    const ordered = shuffle(choices);
    const choiceButtons = [];

    ordered.forEach(function (entry) {
      const pair = entry.pair;
      const idx = entry.originalIndex;
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'word-btn';
      const img = document.createElement('img');
      img.src = pair.image || pairImagePath(pair.word);
      img.alt = pair.alt || pair.word;
      img.className = 'word-pair-img';
      img.addEventListener('error', function () { img.style.display = 'none'; });
      btn.appendChild(img);
      const label = document.createElement('span');
      label.className = 'word-label';
      label.textContent = pair.word;
      btn.appendChild(label);
      btn.addEventListener('click', function () {
        container.querySelectorAll('.word-btn').forEach(function (b) {
          b.disabled = true;
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
        window.setTimeout(function () {
          overlay.classList.add('hidden');
          onDone(ok);
        }, 1200);
      });
      choiceButtons.push({ btn: btn, originalIndex: idx });
      container.appendChild(btn);
    });

    overlay.classList.remove('hidden');
  }

  function beginGameWithSet(set, choiceCount) {
    selectedWordSet = set;
    sessionChoiceCount = choiceCount || 2;
    startGame();
  }

  function showChoose() {
    showScreen('choose-screen');
    if (wordSetChoose) wordSetChoose.showMainChoice();
  }

  function init() {
    loadConfig().then(function () {
      wordSetChoose = WordSetChoose.create({
        getWordSets: function () { return config.wordSets || []; },
        getWordSetsIndex: function () { return wordSetsIndex; },
        onBeginGame: beginGameWithSet,
        hintColor: '#3a2458',
      });

      document.getElementById('start-btn').addEventListener('click', function () {
        if (config.wordSets && config.wordSets.length) showChoose();
        else beginGameWithSet(null, 2);
      });

      document.getElementById('potion-continue').addEventListener('click', function () {
        potionsMade += 1;
        if (potionsMade >= goalCount()) showVictory();
        else startStage();
      });

      document.getElementById('play-again-btn').addEventListener('click', function () {
        if (config.wordSets && config.wordSets.length) showChoose();
        else startGame();
      });
    }).catch(function (err) {
      console.error(err);
      const message = document.getElementById('intro-message');
      if (message) message.textContent = 'Could not load the game. ' + (err && err.message ? err.message : '');
    });
  }

  init();
})();
