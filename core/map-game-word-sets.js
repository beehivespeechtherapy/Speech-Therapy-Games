/**
 * Hook engine-based map/path games into central word-sets.json + shared choose UI.
 */
(function (global) {
  'use strict';

  function wire(opts) {
    const options = opts || {};
    let wordSetsIndex = null;
    let sessionChoiceCount = 2;
    let defaultChallengeCount = 12;
    let wordSetChoose = null;

    function getEngine() {
      return options.getEngine();
    }

    function wordImagePath(word) {
      return WordImages.libraryImagePath(word, {
        relativeBase: options.imagesBase || '../../word-images'
      });
    }

    function buildChallengesFromWordSet(set) {
      const engine = getEngine();
      const count = defaultChallengeCount;
      const choiceCount = DiscriminationRound.choiceCountForSet(set, sessionChoiceCount);
      return WordChallenges.buildChallengesFromWordSet(set, count, choiceCount, wordImagePath);
    }

    function beginGameWithSet(set, choiceCount) {
      sessionChoiceCount = choiceCount;
      const engine = getEngine();
      engine.config.challenges = buildChallengesFromWordSet(set);
      if (set.prompt) engine.config.discriminationPrompt = set.prompt;
      engine.reset();
      const chooseEl = document.getElementById(options.chooseScreenId || 'choose-screen');
      if (chooseEl) chooseEl.classList.add('hidden');
      if (options.onStartGame) options.onStartGame();
    }

    async function loadCentralLists() {
      const engine = getEngine();
      if (engine.config.challenges && engine.config.challenges.length) {
        defaultChallengeCount = engine.config.challenges.length;
      }
      await WordSetChoose.loadCentralWordLists({
        cacheVersion: options.cacheVersion || '3',
        onWordSets: function (sets) {
          if (sets && sets.length) engine.config.wordSets = sets;
        },
        onIndex: function (index) { wordSetsIndex = index; }
      });
    }

    function initChooseUI() {
      wordSetChoose = WordSetChoose.create({
        rootId: options.rootId || 'choice-index-root',
        listId: options.listId || 'word-set-list',
        getWordSets: function () { return getEngine().config.wordSets || []; },
        getWordSetsIndex: function () { return wordSetsIndex; },
        onBeginGame: beginGameWithSet,
        hintColor: options.hintColor || '#555'
      });
    }

    function showChooseScreen() {
      const chooseEl = document.getElementById(options.chooseScreenId || 'choose-screen');
      if (chooseEl) chooseEl.classList.remove('hidden');
      if (wordSetChoose) wordSetChoose.showMainChoice();
    }

    function tryShowChooseOrStart(onFallbackStart) {
      const engine = getEngine();
      if ((engine.config.wordSets || []).length > 0 && wordSetChoose) {
        showChooseScreen();
        return true;
      }
      if (onFallbackStart) onFallbackStart();
      return false;
    }

    return {
      loadCentralLists: loadCentralLists,
      initChooseUI: initChooseUI,
      showChooseScreen: showChooseScreen,
      tryShowChooseOrStart: tryShowChooseOrStart
    };
  }

  global.MapGameWordSets = { wire: wire };
})(typeof window !== 'undefined' ? window : globalThis);
