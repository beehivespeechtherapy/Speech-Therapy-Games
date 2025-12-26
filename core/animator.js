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

      // Get current position
      const currentX = parseFloat(this.protagonistElement.getAttribute('x')) || 0;
      const currentY = parseFloat(this.protagonistElement.getAttribute('y')) || 0;

      // Animate using SVG attributes
      const startTime = Date.now();
      const targetX = checkpoint.x - 30; // Center the 60x60 image
      const targetY = checkpoint.y - 30;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Ease-in-out function
        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const x = currentX + (targetX - currentX) * easeProgress;
        const y = currentY + (targetY - currentY) * easeProgress;

        this.protagonistElement.setAttribute('x', x);
        this.protagonistElement.setAttribute('y', y);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // After animation completes, return to idle
          this.setAnimationState('idle');
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Set protagonist animation state
   * @param {string} state - Animation state ('idle', 'walking', 'celebrating')
   */
  setAnimationState(state) {
    if (!this.protagonistElement) return;

    this.currentAnimationState = state;

    // Update image source based on state (SVG image element)
    const protagonistImages = this.ui.protagonistImages || {};
    const imagePath = protagonistImages[state] || `../../assets/protagonist/${state}.png`;
    this.protagonistElement.setAttribute('href', imagePath);

    // Update class for additional CSS animations
    this.protagonistElement.setAttribute('class', `protagonist-svg-image ${state}`);
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

      // Get current position
      const currentX = parseFloat(this.protagonistElement.getAttribute('x')) || 0;
      const currentY = parseFloat(this.protagonistElement.getAttribute('y')) || 0;
      const centerX = currentX + 30; // Center of 60x60 image
      const centerY = currentY + 30;

      // Energetic bouncing and rotating animation
      const startTime = Date.now();
      const duration = 2000;
      const bounces = 4;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress < 1) {
          // Bounce effect (vertical movement)
          const bounceAmount = Math.abs(Math.sin(progress * Math.PI * bounces)) * 20;

          // Rotation effect
          const rotation = Math.sin(progress * Math.PI * bounces * 2) * 15;

          // Scale effect (pulse)
          const scale = 1 + Math.abs(Math.sin(progress * Math.PI * bounces)) * 0.3;

          // Apply combined transform
          this.protagonistElement.setAttribute('transform',
            `translate(${centerX}, ${centerY - bounceAmount}) rotate(${rotation}) scale(${scale}) translate(${-centerX}, ${-centerY})`
          );

          requestAnimationFrame(animate);
        } else {
          // Reset transform
          this.protagonistElement.removeAttribute('transform');
          resolve();
        }
      };

      requestAnimationFrame(animate);
    });
  }

  /**
   * Play forward movement feedback (small jump)
   */
  playForwardFeedback() {
    // Feedback handled by movement animation
  }

  /**
   * Play backward movement feedback (small shake)
   */
  playBackwardFeedback() {
    // Feedback handled by movement animation
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
