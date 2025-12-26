/**
 * AudioManager - Handles victory music playback
 * Includes iOS audio unlock support (requires user interaction)
 */
class AudioManager {
  constructor() {
    this.audio = null;
    this.isUnlocked = false;
    this.victoryAudioPath = null;
  }

  /**
   * Initialize audio manager with victory music path
   * @param {string} audioPath - Path to victory music file
   */
  init(audioPath) {
    if (!audioPath) {
      console.warn('No audio path provided');
      return;
    }

    this.victoryAudioPath = audioPath;

    try {
      this.audio = new Audio(audioPath);
      this.audio.volume = 0.7;

      // Preload audio
      this.audio.load();
    } catch (error) {
      console.warn('Failed to initialize audio:', error);
    }
  }

  /**
   * Unlock audio on iOS (must be called from user interaction)
   * iOS requires user interaction before playing audio
   */
  unlockAudio() {
    if (this.isUnlocked || !this.audio) return;

    // Play and immediately pause to unlock
    const playPromise = this.audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.audio.pause();
          this.audio.currentTime = 0;
          this.isUnlocked = true;
          console.log('Audio unlocked');
        })
        .catch((error) => {
          console.warn('Audio unlock failed:', error);
        });
    }
  }

  /**
   * Play victory music
   * @returns {Promise} - Resolves when playback starts or fails gracefully
   */
  playVictory() {
    return new Promise((resolve) => {
      if (!this.audio) {
        console.warn('No audio available');
        resolve();
        return;
      }

      // Reset to start
      this.audio.currentTime = 0;

      // Play
      const playPromise = this.audio.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Victory music playing');
            resolve();
          })
          .catch((error) => {
            console.warn('Failed to play victory music:', error);
            // Fail gracefully - game continues without music
            resolve();
          });
      } else {
        resolve();
      }
    });
  }

  /**
   * Stop current audio playback
   */
  stop() {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  /**
   * Set volume
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  setVolume(volume) {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Check if audio is ready
   * @returns {boolean} - True if audio is initialized
   */
  isReady() {
    return this.audio !== null;
  }
}
