/**
 * PathAnimator - Handles protagonist movement and animations
 * Uses CSS transforms for smooth, GPU-accelerated animations
 */
class PathAnimator {
  constructor(ui) {
    this.ui = ui;
    this.protagonistElement = null;
    this.checkpoints = [];
    this.currentAnimationState = 'idle';
  }

  /**
   * Initialize animator with protagonist element and checkpoints
   */
  init() {
    this.protagonistElement = this.ui.getProtagonistElement();
    this.checkpoints = this.ui.getCheckpoints();
  }

  /**
   * Move protagonist to a specific position
   * @param {number} position - Target checkpoint position
   * @param {number} duration - Animation duration in milliseconds
   * @returns {Promise} - Resolves when animation completes
   */
  moveToPosition(position, duration = 800) {
    return new Promise((resolve) => {
      if (!this.protagonistElement || !this.checkpoints || position < 0 || position >= this.checkpoints.length) {
        console.warn('Cannot move protagonist: invalid parameters');
        resolve();
        return;
      }

      const checkpoint = this.checkpoints[position];

      // Update protagonist image to walking
      this.setAnimationState('walking');

      // Apply transition
      this.protagonistElement.style.transition = `left ${duration}ms ease-in-out, top ${duration}ms ease-in-out`;
      this.protagonistElement.style.left = `${checkpoint.x}px`;
      this.protagonistElement.style.top = `${checkpoint.y - 40}px`;

      // After animation completes, return to idle
      setTimeout(() => {
        this.setAnimationState('idle');
        resolve();
      }, duration);
    });
  }

  /**
   * Set protagonist animation state
   * @param {string} state - Animation state ('idle', 'walking', 'celebrating')
   */
  setAnimationState(state) {
    if (!this.protagonistElement) return;

    this.currentAnimationState = state;

    const img = this.protagonistElement.querySelector('.protagonist-image');
    if (img) {
      // Update image source based on state
      const imagePath = `../../assets/protagonist/${state}.png`;
      img.src = imagePath;
    }

    // Update class for additional CSS animations
    this.protagonistElement.className = `protagonist ${state}`;
  }

  /**
   * Play celebration animation
   * @returns {Promise} - Resolves when animation completes
   */
  celebrate() {
    return new Promise((resolve) => {
      if (!this.protagonistElement) {
        resolve();
        return;
      }

      // Set to celebrating state
      this.setAnimationState('celebrating');

      // Add bounce animation class
      this.protagonistElement.classList.add('celebrating-bounce');

      // Remove after animation
      setTimeout(() => {
        this.protagonistElement.classList.remove('celebrating-bounce');
        resolve();
      }, 2000);
    });
  }

  /**
   * Play forward movement feedback (small jump)
   */
  playForwardFeedback() {
    if (!this.protagonistElement) return;

    this.protagonistElement.classList.add('jump-forward');

    setTimeout(() => {
      this.protagonistElement.classList.remove('jump-forward');
    }, 400);
  }

  /**
   * Play backward movement feedback (small shake)
   */
  playBackwardFeedback() {
    if (!this.protagonistElement) return;

    this.protagonistElement.classList.add('shake-backward');

    setTimeout(() => {
      this.protagonistElement.classList.remove('shake-backward');
    }, 400);
  }

  /**
   * Reset protagonist to initial position
   * @param {number} duration - Animation duration in milliseconds
   * @returns {Promise} - Resolves when animation completes
   */
  reset(duration = 800) {
    return this.moveToPosition(0, duration);
  }
}
