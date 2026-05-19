/**
 * Shared choose-screen helpers: set type, word count, set lists.
 */
(function (global) {
  'use strict';

  const CHOICE_COUNT_KEY = 'speechTherapyChoiceCount';

  function getChoiceCount() {
    try {
      const n = parseInt(sessionStorage.getItem(CHOICE_COUNT_KEY), 10);
      if (n >= 1 && n <= 3) return n;
    } catch (e) { /* ignore */ }
    return 2;
  }

  function setChoiceCount(n) {
    try {
      sessionStorage.setItem(CHOICE_COUNT_KEY, String(Math.max(1, Math.min(3, n))));
    } catch (e) { /* ignore */ }
  }

  function filterSets(sets, setType) {
    if (global.WordChallenges && global.WordChallenges.filterSetsByType) {
      return global.WordChallenges.filterSetsByType(sets, setType);
    }
    return sets || [];
  }

  /**
   * Top menu: Minimal pairs | Single words | Show all
   */
  function renderSetTypeMenu(root, options) {
    const opts = options || {};
    root.innerHTML = '';
    const div = document.createElement('div');
    div.className = opts.optionsClass || 'choice-index-options';

    function addBtn(label, className, onClick) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = (opts.buttonClass || 'index-btn') + (className ? ' ' + className : '');
      btn.textContent = label;
      btn.addEventListener('click', onClick);
      div.appendChild(btn);
    }

    addBtn('Minimal pairs', '', function () { opts.onPairs && opts.onPairs(); });
    addBtn('Single words', '', function () { opts.onSingle && opts.onSingle(); });
    addBtn('Show all word sets', ' secondary', function () { opts.onAll && opts.onAll(); });

    root.appendChild(div);
  }

  /**
   * Pick 1, 2, or 3 words per challenge; then onDone(count).
   */
  function renderChoiceCountPicker(root, onDone, onBack) {
    root.innerHTML = '';
    if (onBack) {
      const backRow = document.createElement('div');
      backRow.className = 'back-row';
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.textContent = '← Back';
      backBtn.addEventListener('click', onBack);
      backRow.appendChild(backBtn);
      root.appendChild(backRow);
    }
    const p = document.createElement('p');
    p.style.color = '#a2a8d3';
    p.style.textAlign = 'center';
    p.textContent = 'How many words appear on each challenge?';
    root.appendChild(p);
    const div = document.createElement('div');
    div.className = 'choice-index-options';
    [1, 2, 3].forEach(function (n) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'index-btn';
      btn.textContent = n === 1 ? '1 word' : n + ' words';
      btn.addEventListener('click', function () {
        setChoiceCount(n);
        onDone(n);
      });
      div.appendChild(btn);
    });
    root.appendChild(div);
  }

  function renderSetList(container, sets, onPick, onBack) {
    container.innerHTML = '';
    container.style.display = 'flex';
    if (onBack) {
      const backRow = document.createElement('div');
      backRow.className = 'back-row';
      const backBtn = document.createElement('button');
      backBtn.type = 'button';
      backBtn.textContent = '← Back';
      backBtn.addEventListener('click', onBack);
      backRow.appendChild(backBtn);
      container.appendChild(backRow);
    }
    (sets || []).forEach(function (set) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'word-set-btn';
      const type = global.WordChallenges ? global.WordChallenges.getSetType(set) : 'pairs';
      const extra = type === 'single'
        ? ((set.words && set.words.length) || 0) + ' words'
        : ((set.pairs && set.pairs.length) || 0) + ' pairs';
      btn.textContent = set.label + ' (' + extra + ')';
      btn.addEventListener('click', function () { onPick(set); });
      container.appendChild(btn);
    });
  }

  global.WordSetMenus = {
    CHOICE_COUNT_KEY: CHOICE_COUNT_KEY,
    getChoiceCount: getChoiceCount,
    setChoiceCount: setChoiceCount,
    filterSets: filterSets,
    renderSetTypeMenu: renderSetTypeMenu,
    renderChoiceCountPicker: renderChoiceCountPicker,
    renderSetList: renderSetList
  };
})(typeof window !== 'undefined' ? window : globalThis);
