/**
 * GameEngine - Core game state management and logic
 * Handles config loading, challenge progression, answer validation, and persistence
 */
class GameEngine {
  constructor(configPath) {
    this.configPath = configPath;
    this.config = null;
    this.currentPosition = 0;
    this.attempts = [];
    this.gameId = null;
  }

  /**
   * Stable cache-bust token (set window.GAME_CONFIG_BUILD in each game when config changes).
   * Avoids a unique URL on every refresh, which can trigger GitHub Pages rate limits.
   * @param {string} path
   * @returns {string}
   */
  static _cacheBustFetchUrl(path) {
    if (!path || typeof path !== 'string') return path;
    const build = typeof window !== 'undefined' && window.GAME_CONFIG_BUILD;
    if (!build) return path;
    const sep = path.includes('?') ? '&' : '?';
    return `${path}${sep}v=${encodeURIComponent(build)}`;
  }

  static _configCacheKey(configPath) {
    const build = (typeof window !== 'undefined' && window.GAME_CONFIG_BUILD) || '1';
    return `stg-game-config:${configPath}:${build}`;
  }

  static _readEmbeddedConfig() {
    const el = document.getElementById('game-config');
    if (el && el.textContent && el.textContent.trim()) {
      return JSON.parse(el.textContent.trim());
    }
    return null;
  }

  static _loadConfigFromSession(configPath) {
    try {
      const raw = sessionStorage.getItem(GameEngine._configCacheKey(configPath));
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  static _saveConfigToSession(configPath, config) {
    try {
      sessionStorage.setItem(GameEngine._configCacheKey(configPath), JSON.stringify(config));
    } catch (_) {
      /* quota or private mode */
    }
  }

  /**
   * Load game configuration from JSON file or embedded script (for file:// protocol)
   * @returns {Promise<void>}
   */
  async loadConfig() {
    try {
      const isHttp =
        typeof window !== 'undefined' &&
        (window.location.protocol === 'http:' || window.location.protocol === 'https:');

      if (isHttp && this.configPath) {
        this.config = GameEngine._loadConfigFromSession(this.configPath);
      }

      if (!this.config) {
        this.config = GameEngine._readEmbeddedConfig();
      }

      if (!this.config && this.configPath) {
        try {
          const response = await fetch(
            GameEngine._cacheBustFetchUrl(this.configPath),
            { cache: isHttp ? 'default' : 'no-store' }
          );
          if (response.ok) {
            this.config = await response.json();
            if (isHttp) GameEngine._saveConfigToSession(this.configPath, this.config);
          }
        } catch (_) {
          /* fall back to embedded JSON below */
        }
      }

      if (!this.config) {
        this.config = GameEngine._readEmbeddedConfig();
      }

      if (!this.config) {
        throw new Error('No game configuration found');
      }

      // Validate config
      this.validateConfig();

      // Generate unique game ID
      this.gameId = this.generateGameId(this.config.title);

      // Always start fresh - clear any saved progress
      this.clearProgress();
    } catch (error) {
      console.error('Error loading config:', error);
      throw error;
    }
  }

  /**
   * Validate that config has required fields
   * @throws {Error} if config is invalid
   */
  validateConfig() {
    if (!this.config) {
      throw new Error('Config is null');
    }
    if (!this.config.title) {
      throw new Error('Config missing title');
    }
    if (!this.config.challenges || this.config.challenges.length === 0) {
      throw new Error('Config missing challenges');
    }

    // Validate each challenge (1–3 word choices; minimal pairs use 2, single-word lists may use 1–3)
    this.config.challenges.forEach((challenge, index) => {
      const n = challenge.pairs ? challenge.pairs.length : 0;
      if (!challenge.pairs || n < 1 || n > 3) {
        throw new Error(`Challenge ${index + 1} must have 1 to 3 word choices`);
      }
      challenge.pairs.forEach((pair, pairIndex) => {
        if (!pair.word) {
          throw new Error(`Challenge ${index + 1}, pair ${pairIndex + 1} missing word`);
        }
        if (!pair.image) {
          throw new Error(`Challenge ${index + 1}, pair ${pairIndex + 1} missing image`);
        }
      });
    });
  }

  /**
   * Generate a unique game ID from title
   * @param {string} title - Game title
   * @returns {string} - Unique ID
   */
  generateGameId(title) {
    return 'game_' + title.toLowerCase().replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Get the current challenge based on position
   * @returns {object|null} - Current challenge or null if out of bounds
   */
  getCurrentChallenge() {
    if (this.currentPosition < 0 || this.currentPosition >= this.config.challenges.length) {
      return null;
    }
    return this.config.challenges[this.currentPosition];
  }

  /**
   * Submit an answer for the current challenge
   * @param {number} choiceIndex - Index of the selected pair (0 or 1)
   * @returns {object} - Result object with {correct: boolean, newPosition: number, message: string}
   */
  submitAnswer(choiceIndex) {
    const challenge = this.getCurrentChallenge();
    if (!challenge) {
      return {
        correct: false,
        newPosition: this.currentPosition,
        message: 'Invalid challenge'
      };
    }

    const selectedPair = challenge.pairs[choiceIndex];
    const isCorrect = challenge.anyAnswerCorrect === true
      || (challenge.correctWord && selectedPair.word === challenge.correctWord)
      || selectedPair.sound === challenge.correctSound;

    // Record attempt
    this.attempts.push({
      challengeId: challenge.id,
      position: this.currentPosition,
      selected: selectedPair.word,
      correct: isCorrect,
      timestamp: Date.now()
    });

    // Update position (optional: wrong answer does not move back, e.g. config.wrongAnswerMovesBack === false)
    let newPosition = this.currentPosition;
    if (isCorrect) {
      newPosition = Math.min(this.currentPosition + 1, this.config.challenges.length);
    } else {
      if (this.config.wrongAnswerMovesBack !== false) {
        newPosition = Math.max(this.currentPosition - 1, 0);
      }
    }

    this.currentPosition = newPosition;

    // Save progress
    this.saveProgress();

    return {
      correct: isCorrect,
      newPosition: newPosition,
      message: isCorrect ? 'Great job!' : 'Try again!'
    };
  }

  /**
   * Check if the player has completed all challenges (victory condition)
   * @returns {boolean} - True if all challenges completed
   */
  isVictory() {
    return this.currentPosition >= this.config.challenges.length;
  }

  /**
   * Reset the game to initial state
   */
  reset() {
    this.currentPosition = 0;
    this.attempts = [];
    this.saveProgress();
  }

  /**
   * Save current progress to LocalStorage
   */
  saveProgress() {
    if (!this.gameId) return;

    const state = {
      gameId: this.gameId,
      position: this.currentPosition,
      attempts: this.attempts,
      timestamp: Date.now()
    };

    try {
      localStorage.setItem(this.gameId, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to save progress:', error);
    }
  }

  /**
   * Load saved progress from LocalStorage
   */
  loadProgress() {
    if (!this.gameId) return;

    try {
      const saved = localStorage.getItem(this.gameId);
      if (saved) {
        const state = JSON.parse(saved);
        this.currentPosition = state.position || 0;
        this.attempts = state.attempts || [];
        console.log('Loaded saved progress:', state);
      }
    } catch (error) {
      console.warn('Failed to load progress:', error);
    }
  }

  /**
   * Clear saved progress
   */
  clearProgress() {
    if (!this.gameId) return;

    try {
      localStorage.removeItem(this.gameId);
      this.reset();
    } catch (error) {
      console.warn('Failed to clear progress:', error);
    }
  }

  /**
   * Get game statistics
   * @returns {object} - Stats object with various metrics
   */
  getStats() {
    const totalAttempts = this.attempts.length;
    const correctAttempts = this.attempts.filter(a => a.correct).length;
    const wrongAttempts = totalAttempts - correctAttempts;
    const accuracy = totalAttempts > 0 ? (correctAttempts / totalAttempts * 100).toFixed(1) : 0;

    return {
      totalAttempts,
      correctAttempts,
      wrongAttempts,
      accuracy: parseFloat(accuracy),
      currentPosition: this.currentPosition,
      totalChallenges: this.config.challenges.length,
      progress: ((this.currentPosition / this.config.challenges.length) * 100).toFixed(1)
    };
  }
}
