/**
 * Shared word-set browse UI: Minimal pairs | Single words | Show all,
 * plus process/phoneme index for pair sets only.
 */
(function (global) {
  'use strict';

  function el(id) {
    return document.getElementById(id);
  }

  function loadCentralWordLists(options) {
    const opts = options || {};
    const base = (opts.basePath || '../../word-lists').replace(/\/$/, '');
    const cache = opts.cacheBust !== false ? '?v=' + (opts.cacheVersion || '3') : '';
    const target = opts.target || {};
    const assignSets = opts.onWordSets || function (sets) {
      if (target.wordSets !== undefined) target.wordSets = sets;
    };
    const assignIndex = opts.onIndex || function (index) {
      if (target.wordSetsIndex !== undefined) target.wordSetsIndex = index;
    };

    return Promise.all([
      fetch(base + '/word-sets.json' + cache, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; }),
      fetch(base + '/word-sets-index.json' + cache, { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .catch(function () { return null; })
    ]).then(function (results) {
      const sets = results[0];
      const index = results[1];
      if (Array.isArray(sets) && sets.length) {
        assignSets(sets);
        if (opts.mergeInto && Array.isArray(opts.mergeInto)) {
          opts.mergeInto.length = 0;
          (opts.prepend || []).forEach(function (s) { opts.mergeInto.push(s); });
          sets.forEach(function (s) { opts.mergeInto.push(s); });
        }
        if (opts.onFoldersMap && sets.length) {
          opts.onFoldersMap(Object.fromEntries(sets.map(function (s) {
            return [s.id, s.folder || ''];
          })));
        }
      }
      if (index) assignIndex(index);
      return { sets: sets, index: index };
    });
  }

  function create(options) {
    const opts = options || {};
    const rootId = opts.rootId || 'choice-index-root';
    const listId = opts.listId || 'word-set-list';
    const hintColor = opts.hintColor || '#555';
    const WC = function () { return global.WordChallenges; };
    const WM = function () { return global.WordSetMenus; };

    function root() { return el(rootId); }
    function list() { return el(listId); }
    function getSets() {
      const s = opts.getWordSets();
      return Array.isArray(s) ? s : [];
    }
    function getIndex() {
      return opts.getWordSetsIndex ? opts.getWordSetsIndex() : null;
    }

    function setsForFolder(folder) {
      return getSets().filter(function (s) {
        return (s.folder || '').trim() === (folder || '').trim();
      });
    }

    function renderSetList(sets, onPick, onBack) {
      const r = root();
      const l = list();
      if (!l || !r) return;
      r.style.display = 'none';
      if (WM() && WM().renderSetList) {
        WM().renderSetList(l, sets, onPick, onBack);
        return;
      }
      l.style.display = 'flex';
      l.innerHTML = '';
      if (onBack) {
        const backWrap = document.createElement('div');
        backWrap.className = 'back-row';
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', onBack);
        backWrap.appendChild(backBtn);
        l.appendChild(backWrap);
      }
      (sets || []).forEach(function (set) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'word-set-btn';
        btn.textContent = set.label;
        btn.addEventListener('click', function () { onPick(set); });
        l.appendChild(btn);
      });
    }

    function pickSet(set) {
      if (!WC() || !opts.onBeginGame) {
        opts.onBeginGame(set, 2);
        return;
      }
      if (WC().getSetType(set) === 'single') {
        const r = root();
        const l = list();
        if (!r || !l) {
          const count = WM() ? WM().getChoiceCount() : 2;
          opts.onBeginGame(set, count);
          return;
        }
        l.style.display = 'none';
        r.style.display = 'block';
        WM().renderChoiceCountPicker(r, function (count) {
          opts.onBeginGame(set, count);
        }, showMainChoice);
      } else {
        opts.onBeginGame(set, 2);
      }
    }

    function showMainChoice() {
      const r = root();
      const l = list();
      if (!r || !l) return;
      l.style.display = 'none';
      r.style.display = 'block';
      WM().renderSetTypeMenu(r, {
        hintColor: hintColor,
        onPairs: showPairsBrowseEntry,
        onSingle: showSingleWordSets,
        onAll: function () { showAllWordSets(); }
      });
    }

    function showPairsBrowseEntry() {
      const r = root();
      const l = list();
      if (!r || !l) return;
      l.style.display = 'none';
      r.style.display = 'block';
      r.innerHTML = '';
      const backRow = document.createElement('div');
      backRow.className = 'back-row';
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.textContent = '← Back';
      backBtn.addEventListener('click', showMainChoice);
      backRow.appendChild(backBtn);
      r.appendChild(backRow);
      const div = document.createElement('div');
      div.className = 'choice-index-options';
      const wordSetsIndex = getIndex();
      const hasIndex = wordSetsIndex && wordSetsIndex.byProcess && wordSetsIndex.byPhoneme;
      if (hasIndex) {
        const byProcessBtn = document.createElement('button');
        byProcessBtn.type = 'button';
        byProcessBtn.className = 'index-btn';
        byProcessBtn.textContent = 'By phonological process';
        byProcessBtn.addEventListener('click', showProcessList);
        div.appendChild(byProcessBtn);
        const byPhonemeBtn = document.createElement('button');
        byPhonemeBtn.type = 'button';
        byPhonemeBtn.className = 'index-btn';
        byPhonemeBtn.textContent = 'By phoneme (choose two sounds + position)';
        byPhonemeBtn.addEventListener('click', showPhonemeFilters);
        div.appendChild(byPhonemeBtn);
      }
      const allPairsBtn = document.createElement('button');
      allPairsBtn.type = 'button';
      allPairsBtn.className = 'index-btn' + (hasIndex ? ' secondary' : '');
      allPairsBtn.textContent = 'Show all minimal-pair sets';
      allPairsBtn.addEventListener('click', function () { showAllWordSets('pairs'); });
      div.appendChild(allPairsBtn);
      r.appendChild(div);
    }

    function showSingleWordSets() {
      const sets = WC().filterSetsByType(getSets(), 'single');
      const r = root();
      const l = list();
      if (!r || !l) return;
      l.style.display = 'none';
      if (sets.length === 0) {
        r.style.display = 'block';
        r.innerHTML = '';
        const backRow = document.createElement('div');
        backRow.className = 'back-row';
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', showMainChoice);
        backRow.appendChild(backBtn);
        r.appendChild(backRow);
        const p = document.createElement('p');
        p.style.color = hintColor;
        p.style.textAlign = 'center';
        p.textContent = 'No single-word sets yet. Add setType: single in your Google Sheet.';
        r.appendChild(p);
        return;
      }
      renderSetList(sets, pickSet, showMainChoice);
    }

    function showProcessList() {
      const r = root();
      const wordSetsIndex = getIndex();
      if (!r || !wordSetsIndex || !wordSetsIndex.byProcess) return;
      r.innerHTML = '';
      const backRow = document.createElement('div');
      backRow.className = 'back-row';
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.textContent = '← Back';
      backBtn.addEventListener('click', showPairsBrowseEntry);
      backRow.appendChild(backBtn);
      r.appendChild(backRow);
      const div = document.createElement('div');
      div.className = 'choice-index-options';
      Object.keys(wordSetsIndex.byProcess).sort().forEach(function (processName) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'word-set-btn';
        btn.textContent = processName;
        btn.addEventListener('click', function () { showProcessSets(processName); });
        div.appendChild(btn);
      });
      r.appendChild(div);
    }

    function showProcessSets(processName) {
      const entries = getIndex().byProcess[processName] || [];
      const sets = [];
      entries.forEach(function (entry) {
        setsForFolder(entry.folder).forEach(function (s) {
          if (WC().getSetType(s) === 'pairs') sets.push(s);
        });
      });
      const r = root();
      if (!r) return;
      r.innerHTML = '';
      const backRow = document.createElement('div');
      backRow.className = 'back-row';
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.textContent = '← Back to processes';
      backBtn.addEventListener('click', showProcessList);
      backRow.appendChild(backBtn);
      r.appendChild(backRow);
      if (sets.length === 0) {
        const noSets = document.createElement('p');
        noSets.style.color = hintColor;
        noSets.textContent = 'No minimal-pair sets for this process. Try Single words or Show all word sets.';
        r.appendChild(noSets);
        return;
      }
      renderSetList(sets, pickSet, showProcessList);
    }

    function showPhonemeFilters() {
      const r = root();
      const wordSetsIndex = getIndex();
      if (!r || !wordSetsIndex || !wordSetsIndex.byPhoneme) return;
      const sounds = new Set();
      const positions = new Set();
      wordSetsIndex.byPhoneme.forEach(function (e) {
        if (e.sound_a) sounds.add(e.sound_a);
        if (e.sound_b) sounds.add(e.sound_b);
        if (e.position) positions.add(e.position);
      });
      const soundList = Array.from(sounds).sort();
      const positionList = Array.from(positions).sort();
      r.innerHTML = '';
      const backRow = document.createElement('div');
      backRow.className = 'back-row';
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.textContent = '← Back';
      backBtn.addEventListener('click', showPairsBrowseEntry);
      backRow.appendChild(backBtn);
      r.appendChild(backRow);
      const filters = document.createElement('div');
      filters.className = 'phoneme-filters';
      const firstLabel = document.createElement('label');
      firstLabel.textContent = 'First sound:';
      const firstSelect = document.createElement('select');
      firstSelect.id = 'phoneme-first';
      firstSelect.innerHTML = '<option value="">--</option>' + soundList.map(function (s) {
        return '<option value="' + s + '">' + s + '</option>';
      }).join('');
      const secondLabel = document.createElement('label');
      secondLabel.textContent = 'Second sound:';
      const secondSelect = document.createElement('select');
      secondSelect.id = 'phoneme-second';
      secondSelect.innerHTML = '<option value="">--</option>' + soundList.map(function (s) {
        return '<option value="' + s + '">' + s + '</option>';
      }).join('');
      const posLabel = document.createElement('label');
      posLabel.textContent = 'Position:';
      const posSelect = document.createElement('select');
      posSelect.id = 'phoneme-position';
      posSelect.innerHTML = '<option value="">--</option>' + positionList.map(function (p) {
        return '<option value="' + p + '">' + p + '</option>';
      }).join('');
      const showBtn = document.createElement('button');
      showBtn.type = 'button';
      showBtn.className = 'show-sets-btn';
      showBtn.textContent = 'Show sets';
      showBtn.addEventListener('click', function () {
        showPhonemeResults(firstSelect.value, secondSelect.value, posSelect.value);
      });
      filters.appendChild(firstLabel);
      filters.appendChild(firstSelect);
      filters.appendChild(secondLabel);
      filters.appendChild(secondSelect);
      filters.appendChild(posLabel);
      filters.appendChild(posSelect);
      filters.appendChild(showBtn);
      r.appendChild(filters);
    }

    function showPhonemeResults(sound_a, sound_b, position) {
      const entries = (getIndex().byPhoneme || []).filter(function (e) {
        const matchA = !sound_a || e.sound_a === sound_a || e.sound_b === sound_a;
        const matchB = !sound_b || e.sound_a === sound_b || e.sound_b === sound_b;
        const matchPos = !position || e.position === position;
        const bothSounds = !sound_a || !sound_b ||
          (e.sound_a === sound_a && e.sound_b === sound_b) ||
          (e.sound_a === sound_b && e.sound_b === sound_a);
        return matchA && matchB && matchPos && bothSounds;
      });
      const sets = [];
      entries.forEach(function (entry) {
        setsForFolder(entry.folder).forEach(function (s) {
          if (WC().getSetType(s) === 'pairs') sets.push(s);
        });
      });
      const r = root();
      if (!r) return;
      if (sets.length === 0) {
        r.innerHTML = '';
        const backRow = document.createElement('div');
        backRow.className = 'back-row';
        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.textContent = '← Back';
        backBtn.addEventListener('click', showPhonemeFilters);
        backRow.appendChild(backBtn);
        r.appendChild(backRow);
        const p = document.createElement('p');
        p.style.color = hintColor;
        p.textContent = 'No word sets match. Try different sounds/position or Show all word sets.';
        r.appendChild(p);
        return;
      }
      renderSetList(sets, pickSet, showPhonemeFilters);
    }

    function showAllWordSets(setTypeFilter) {
      let sets = getSets();
      if (setTypeFilter) sets = WC().filterSetsByType(sets, setTypeFilter);
      renderSetList(sets, pickSet, showMainChoice);
    }

    function showChooseScreenIfIndexed() {
      const wordSetsIndex = getIndex();
      const l = list();
      if (wordSetsIndex && wordSetsIndex.byProcess && l) {
        showMainChoice();
        return true;
      }
      return false;
    }

    return {
      showMainChoice: showMainChoice,
      showPairsBrowseEntry: showPairsBrowseEntry,
      showSingleWordSets: showSingleWordSets,
      showAllWordSets: showAllWordSets,
      pickSet: pickSet,
      renderSetList: renderSetList,
      showChooseScreenIfIndexed: showChooseScreenIfIndexed
    };
  }

  global.WordSetChoose = {
    create: create,
    loadCentralWordLists: loadCentralWordLists
  };
})(typeof window !== 'undefined' ? window : globalThis);
