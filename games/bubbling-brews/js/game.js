(function () {
  'use strict';

  let config = null;
  let selectedWordSet = null;
  let sessionChoiceCount = 2;
  let wordSetsIndex = null;
  let wordSetChoose = null;

  let potionIndex = 0;
  let shelf = [];
  let challengeOpen = false;

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

  function bottleById(id) {
    const bottles = (config && config.bottles) || [];
    for (let i = 0; i < bottles.length; i++) {
      if (bottles[i].id === id) return bottles[i];
    }
    return { id: id, label: id, image: '' };
  }

  function currentPotion() {
    const potions = (config && config.potions) || [];
    return potions[potionIndex] || null;
  }

  function fileLabel(path) {
    const parts = String(path || '').split('/');
    return parts[parts.length - 1] || path;
  }

  function mountImage(parent, src, alt, className) {
    const img = document.createElement('img');
    img.className = className;
    img.alt = alt || '';
    const fallback = document.createElement('span');
    fallback.className = 'art-fallback';
    fallback.textContent = fileLabel(src);
    fallback.hidden = true;
    img.addEventListener('error', function () {
      img.classList.add('missing');
      fallback.hidden = false;
    });
    if (src) img.src = assetPath(src);
    else {
      img.classList.add('missing');
      fallback.hidden = false;
      fallback.textContent = alt || 'missing image';
    }
    parent.appendChild(img);
    parent.appendChild(fallback);
    return img;
  }

  async function loadConfig() {
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

    document.title = (config.title || 'Bubbling Brews') + ' - Speech Therapy Game';
    const intro = config.intro && config.intro.message;
    if (intro) document.getElementById('intro-message').textContent = intro;
    const title = document.getElementById('intro-title');
    if (title) title.textContent = config.title || 'Bubbling Brews';
    const portrait = document.getElementById('spellabelle-img');
    if (portrait && config.assets && config.assets.spellabelle) {
      portrait.src = assetPath(config.assets.spellabelle);
      portrait.addEventListener('error', function () {
        portrait.classList.add('missing');
        const note = document.getElementById('spellabelle-fallback');
        if (note) {
          note.hidden = false;
          note.textContent = fileLabel(config.assets.spellabelle);
        }
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

  function assignCovers(count) {
    const covers = ((config.assets && config.assets.covers) || []).slice();
    const assigned = [];
    if (!covers.length) {
      for (let i = 0; i < count; i++) assigned.push('');
      return assigned;
    }
    let deck = [];
    for (let i = 0; i < count; i++) {
      if (!deck.length) deck = shuffle(covers);
      if (assigned.length && deck.length > 1 && deck[deck.length - 1] === assigned[assigned.length - 1]) {
        const swapAt = deck.findIndex(function (cover) {
          return cover !== assigned[assigned.length - 1];
        });
        if (swapAt >= 0) {
          const last = deck.length - 1;
          const tmp = deck[last];
          deck[last] = deck[swapAt];
          deck[swapAt] = tmp;
        }
      }
      assigned.push(deck.pop());
    }
    return assigned;
  }

  function buildShelf(potion) {
    const allIds = (config.bottles || []).map(function (b) { return b.id; });
    const recipe = potion.recipe.slice();
    const size = config.shelfSize || 7;
    const distractors = shuffle(allIds.filter(function (id) {
      return recipe.indexOf(id) < 0;
    }));
    const items = shuffle(recipe.concat(distractors.slice(0, Math.max(0, size - recipe.length))));
    const covers = assignCovers(items.length);
    return items.map(function (id, i) {
      return { id: id, cover: covers[i] || '', revealed: false };
    });
  }

  function recipeFoundCount(potion) {
    const remaining = {};
    potion.recipe.forEach(function (id) {
      remaining[id] = (remaining[id] || 0) + 1;
    });
    shelf.forEach(function (slot) {
      if (slot.revealed && remaining[slot.id]) remaining[slot.id] -= 1;
    });
    let found = 0;
    potion.recipe.forEach(function (id) {
      if (!remaining[id]) found += 1;
      else remaining[id] -= 1;
    });
    return found;
  }

  function recipeComplete(potion) {
    return recipeFoundCount(potion) >= potion.recipe.length;
  }

  function renderRecipe(potion) {
    const row = document.getElementById('recipe-slots');
    row.innerHTML = '';
    const remaining = {};
    shelf.forEach(function (slot) {
      if (!slot.revealed) return;
      remaining[slot.id] = (remaining[slot.id] || 0) + 1;
    });
    potion.recipe.forEach(function (id) {
      const bottle = bottleById(id);
      const slot = document.createElement('div');
      slot.className = 'recipe-slot';
      if (remaining[id]) {
        slot.classList.add('found');
        remaining[id] -= 1;
      }
      mountImage(slot, bottle.image, bottle.label, 'bottle');
      const mark = document.createElement('span');
      mark.className = 'found-mark';
      mark.textContent = '✓';
      mark.setAttribute('aria-hidden', 'true');
      slot.appendChild(mark);
      row.appendChild(slot);
    });
    const progress = document.getElementById('progress-label');
    const potions = config.potions || [];
    progress.textContent = 'Potion ' + (potionIndex + 1) + ' of ' + potions.length
      + '  ·  Found ' + recipeFoundCount(potion) + ' of ' + potion.recipe.length;
  }

  function renderShelf() {
    const grid = document.getElementById('shelf');
    grid.innerHTML = '';
    shelf.forEach(function (slot, index) {
      const bottle = bottleById(slot.id);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'shelf-slot' + (slot.revealed ? ' revealed' : '');
      btn.dataset.index = String(index);
      mountImage(btn, bottle.image, bottle.label, 'bottle');
      const cover = document.createElement('img');
      cover.className = 'cover';
      cover.alt = '';
      const coverFallback = document.createElement('span');
      coverFallback.className = 'cover-fallback';
      coverFallback.textContent = slot.cover ? fileLabel(slot.cover) : 'cover';
      if (slot.cover) {
        cover.src = assetPath(slot.cover);
        cover.addEventListener('error', function () {
          cover.classList.add('missing');
        });
      } else {
        cover.classList.add('missing');
      }
      btn.appendChild(cover);
      btn.appendChild(coverFallback);
      btn.addEventListener('click', function () { onShelfClick(index); });
      grid.appendChild(btn);
    });
  }

  function renderPlay() {
    const potion = currentPotion();
    if (!potion) return;
    const bg = document.getElementById('scene-bg');
    if (bg && config.assets && config.assets.background) {
      bg.src = assetPath(config.assets.background);
      bg.addEventListener('error', function () { bg.classList.add('missing'); });
    }
    renderRecipe(potion);
    renderShelf();
  }

  function startPotion(index) {
    potionIndex = index;
    const potion = currentPotion();
    if (!potion) {
      showVictory();
      return;
    }
    shelf = buildShelf(potion);
    challengeOpen = false;
    renderPlay();
    showScreen('play-screen');
  }

  function startGame() {
    startPotion(0);
  }

  function showPotionCelebration() {
    const potion = currentPotion();
    if (!potion) return;
    const msg = document.getElementById('potion-message');
    msg.textContent = potion.message || ('You made a ' + potion.name + '!!');
    const frame = document.getElementById('potion-art');
    frame.innerHTML = '';
    mountImage(frame, potion.image, potion.name, 'potion-img');
    const btn = document.getElementById('potion-continue');
    const potions = config.potions || [];
    const last = potionIndex >= potions.length - 1;
    btn.textContent = last ? 'All done!' : 'Next potion';
    showScreen('potion-screen');
  }

  function showVictory() {
    const msg = document.getElementById('victory-message');
    if (msg) msg.textContent = config.victoryMessage || 'You helped Spellabelle make every potion!';
    showScreen('victory-screen');
  }

  function onShelfClick(index) {
    const potion = currentPotion();
    if (challengeOpen || !potion || recipeComplete(potion)) return;
    const slot = shelf[index];
    if (!slot || slot.revealed) return;
    challengeOpen = true;
    showDiscrimination(function (correct) {
      challengeOpen = false;
      if (!correct) return;
      slot.revealed = true;
      renderRecipe(potion);
      const btn = document.querySelector('.shelf-slot[data-index="' + index + '"]');
      if (btn) btn.classList.add('revealed');
      if (recipeComplete(potion)) {
        setTimeout(showPotionCelebration, 450);
      }
    });
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
        const potions = config.potions || [];
        if (potionIndex >= potions.length - 1) showVictory();
        else startPotion(potionIndex + 1);
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
