/**
 * Build discrimination / sentence rounds from word-sets.json entries.
 */
(function (global) {
  'use strict';

  const SENTENCE_PROMPT = 'Make a sentence with the words!';

  function getSetType(set) {
    const t = (set && set.setType || '').trim().toLowerCase();
    if (t === 'single') return 'single';
    return 'pairs';
  }

  function getWordsList(set) {
    if (getSetType(set) === 'single') {
      if (Array.isArray(set.words) && set.words.length) {
        return set.words.map(function (w) { return String(w).trim(); }).filter(Boolean);
      }
      return [];
    }
    const seen = {};
    const out = [];
    (set.pairs || []).forEach(function (pair) {
      (pair || []).forEach(function (w) {
        const s = String(w || '').trim();
        if (s && !seen[s.toLowerCase()]) {
          seen[s.toLowerCase()] = true;
          out.push(s);
        }
      });
    });
    return out;
  }

  function sampleWithoutReplacement(arr, n) {
    const copy = arr.slice();
    const out = [];
    const want = Math.min(n, copy.length);
    while (out.length < want && copy.length) {
      const i = Math.floor(Math.random() * copy.length);
      out.push(copy.splice(i, 1)[0]);
    }
    return out;
  }

  function promptForSingle(set, wordCount) {
    if (wordCount > 1) return SENTENCE_PROMPT;
    return (set.prompt && String(set.prompt).trim()) || 'Say the word';
  }

  function pickDistractor(pairsList, targetWord, contrastWord) {
    for (let t = 0; t < 30; t++) {
      const pair = pairsList[Math.floor(Math.random() * pairsList.length)];
      const w = pair[Math.floor(Math.random() * pair.length)];
      if (w !== targetWord && w !== contrastWord) return w;
    }
    return contrastWord;
  }

  /**
   * @param {object} set
   * @param {number} choiceCount 1–3
   * @param {function(string): string} imagePathFn
   */
  function buildRound(set, choiceCount, imagePathFn) {
    const n = Math.max(1, Math.min(3, choiceCount || 2));
    const type = getSetType(set);

    if (type === 'single') {
      const pool = getWordsList(set);
      if (!pool.length) return null;
      const words = sampleWithoutReplacement(pool, n);
      const prompt = promptForSingle(set, words.length);
      const targetSound = set.targetSound || '';
      const pairs = words.map(function (w) {
        return {
          word: w,
          sound: targetSound,
          image: imagePathFn(w),
          alt: w
        };
      });
      return {
        prompt: prompt,
        pairs: pairs,
        correctWord: words[0],
        correctSound: targetSound,
        anyAnswerCorrect: true
      };
    }

    const pairsList = set.pairs || [];
    if (!pairsList.length) return null;
    const pair = pairsList[Math.floor(Math.random() * pairsList.length)];
    const targetWord = pair[0];
    const contrastWord = pair[1];
    const targetSound = set.targetSound || 'k';
    const contrastSound = set.contrastSound || 't';
    const prompt = set.prompt || '';

    if (n === 1) {
      return {
        prompt: prompt,
        pairs: [{
          word: targetWord,
          sound: targetSound,
          image: imagePathFn(targetWord),
          alt: targetWord
        }],
        correctWord: targetWord,
        correctSound: targetSound
      };
    }

    if (n === 2) {
      return {
        prompt: prompt,
        pairs: [
          { word: targetWord, sound: targetSound, image: imagePathFn(targetWord), alt: targetWord },
          { word: contrastWord, sound: contrastSound, image: imagePathFn(contrastWord), alt: contrastWord }
        ],
        correctWord: targetWord,
        correctSound: targetSound
      };
    }

    const distractor = pickDistractor(pairsList, targetWord, contrastWord);
    return {
      prompt: prompt,
      pairs: [
        { word: targetWord, sound: targetSound, image: imagePathFn(targetWord), alt: targetWord },
        { word: contrastWord, sound: contrastSound, image: imagePathFn(contrastWord), alt: contrastWord },
        { word: distractor, sound: contrastSound, image: imagePathFn(distractor), alt: distractor }
      ],
      correctWord: targetWord,
      correctSound: targetSound
    };
  }

  function buildChallengesFromWordSet(set, count, choiceCount, imagePathFn) {
    const challenges = [];
    for (let i = 0; i < count; i++) {
      const round = buildRound(set, choiceCount, imagePathFn);
      if (!round) break;
      challenges.push(Object.assign({ id: i + 1 }, round));
    }
    return challenges;
  }

  function buildBossChallenges(set, count, choiceCount, imagePathFn) {
    const out = [];
    const used = new Set();
    let guard = 0;
    while (out.length < count && guard < count * 40) {
      guard++;
      const round = buildRound(set, choiceCount, imagePathFn);
      if (!round) break;
      const key = round.pairs.map(function (p) { return p.word; }).join('|');
      if (used.has(key)) continue;
      used.add(key);
      out.push(Object.assign({ id: out.length + 1 }, round));
    }
    return out;
  }

  function filterSetsByType(sets, setType) {
    const want = (setType || '').trim().toLowerCase();
    return (sets || []).filter(function (s) {
      return getSetType(s) === (want === 'single' ? 'single' : 'pairs');
    });
  }

  global.WordChallenges = {
    SENTENCE_PROMPT: SENTENCE_PROMPT,
    getSetType: getSetType,
    getWordsList: getWordsList,
    buildRound: buildRound,
    buildChallengesFromWordSet: buildChallengesFromWordSet,
    buildBossChallenges: buildBossChallenges,
    filterSetsByType: filterSetsByType
  };
})(typeof window !== 'undefined' ? window : globalThis);
