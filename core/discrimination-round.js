/**
 * Build discrimination rounds and score answers (all games).
 */
(function (global) {
  'use strict';

  function choiceCountForSet(set, sessionChoiceCount) {
    if (global.WordChallenges && global.WordChallenges.getSetType(set) === 'single') {
      return Math.max(1, Math.min(3, sessionChoiceCount || 2));
    }
    return 2;
  }

  function buildRound(set, sessionChoiceCount, imagePathFn) {
    if (!global.WordChallenges) return null;
    const n = choiceCountForSet(set, sessionChoiceCount);
    return global.WordChallenges.buildRound(set, n, imagePathFn);
  }

  function isChoiceCorrect(round, choiceIndex) {
    if (!round || !round.pairs || choiceIndex < 0 || choiceIndex >= round.pairs.length) {
      return false;
    }
    if (round.anyAnswerCorrect) return true;
    const selected = round.pairs[choiceIndex];
    if (round.correctWord && selected.word === round.correctWord) return true;
    return selected.sound === round.correctSound;
  }

  function correctChoiceIndex(round) {
    if (!round || !round.pairs) return 0;
    if (round.anyAnswerCorrect) return 0;
    for (let i = 0; i < round.pairs.length; i++) {
      if (isChoiceCorrect(round, i)) return i;
    }
    return 0;
  }

  global.DiscriminationRound = {
    choiceCountForSet: choiceCountForSet,
    buildRound: buildRound,
    isChoiceCorrect: isChoiceCorrect,
    correctChoiceIndex: correctChoiceIndex
  };
})(typeof window !== 'undefined' ? window : globalThis);
