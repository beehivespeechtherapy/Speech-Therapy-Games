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
    this.walkingSpriteConfig = this.ui.getWalkingSpriteConfig();
    this.walkingSpriteImage = this.ui.getWalkingSpriteImage();
    this.protagonistIdleImage = this.ui.getProtagonistIdleImage();
    this.protagonistWalkingWrap = this.ui.getProtagonistWalkingWrap();
    this.useSpriteSheet = !!(this.walkingSpriteConfig && this.walkingSpriteImage);
  }

  /**
   * Move protagonist to a specific position
   * @param {number} position - Target checkpoint position
   * @param {number} duration - Animation duration in milliseconds
   * @returns {Promise} - Resolves when animation completes
   */
  _getPosition() {
    if (!this.protagonistElement) return { x: 0, y: 0 };
    const t = this.protagonistElement.getAttribute('transform');
    if (t) {
      const m = t.match(/translate\s*\(\s*([-\d.]+)\s*[, ]\s*([-\d.]+)\s*\)/);
      if (m) return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
    }
    return {
      x: parseFloat(this.protagonistElement.getAttribute('x')) || 0,
      y: parseFloat(this.protagonistElement.getAttribute('y')) || 0
    };
  }

  _setPosition(x, y) {
    if (!this.protagonistElement) return;
    if (this.useSpriteSheet && this.protagonistElement.tagName && this.protagonistElement.tagName.toLowerCase() === 'g') {
      this.protagonistElement.setAttribute('transform', `translate(${x}, ${y})`);
    } else {
      this.protagonistElement.setAttribute('x', x);
      this.protagonistElement.setAttribute('y', y);
    }
  }

  moveToPosition(position, duration = 800) {
    return new Promise((resolve) => {
      if (!this.protagonistElement || !this.checkpoints || position < 0 || position >= this.checkpoints.length) {
        console.warn('Cannot move protagonist: invalid parameters');
        resolve();
        return;
      }

      const checkpoint = this.checkpoints[position];
      const centerOffset = 30;
      const targetX = checkpoint.x - centerOffset;
      const targetY = checkpoint.y - centerOffset;

      this.setAnimationState('walking');

      const pos = this._getPosition();
      const currentX = pos.x;
      const currentY = pos.y;

      const startTime = Date.now();
      let lastFrameTime = startTime;
      let frameIndex = 0;
      const spriteConfig = this.walkingSpriteConfig;
      const frameDuration = spriteConfig ? Math.max(50, duration / (spriteConfig.frames * 2)) : 0;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const easeProgress = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        const x = currentX + (targetX - currentX) * easeProgress;
        const y = currentY + (targetY - currentY) * easeProgress;

        this._setPosition(x, y);

        if (spriteConfig && this.walkingSpriteImage) {
          const now = Date.now();
          if (now - lastFrameTime >= frameDuration) {
            lastFrameTime = now;
            frameIndex = (frameIndex + 1) % spriteConfig.frames;
            const cols = spriteConfig.columns || spriteConfig.frames;
            const frameX = (frameIndex % cols) * spriteConfig.frameWidth;
            const frameY = Math.floor(frameIndex / cols) * spriteConfig.frameHeight;
            this.walkingSpriteImage.setAttribute('x', -frameX);
            this.walkingSpriteImage.setAttribute('y', -frameY);
          }
        }

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
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

    if (this.useSpriteSheet && this.protagonistIdleImage && this.protagonistWalkingWrap) {
      if (state === 'walking') {
        // Keep idle visible during walk so ninja is never invisible (walking sprite has rendering issues)
        this.protagonistIdleImage.setAttribute('visibility', 'visible');
        this.protagonistWalkingWrap.setAttribute('visibility', 'hidden');
      } else {
        this.protagonistIdleImage.setAttribute('visibility', 'visible');
        this.protagonistWalkingWrap.setAttribute('visibility', 'hidden');
        const protagonistImages = this.ui.protagonistImages || {};
        const imagePath = protagonistImages[state] || `../../assets/protagonist/${state}.png`;
        this.protagonistIdleImage.setAttribute('href', imagePath);
      }
      this.protagonistElement.setAttribute('class', 'protagonist-group ' + state);
    } else {
      const protagonistImages = this.ui.protagonistImages || {};
      const imagePath = protagonistImages[state] || `../../assets/protagonist/${state}.png`;
      this.protagonistElement.setAttribute('href', imagePath);
      this.protagonistElement.setAttribute('class', `protagonist-svg-image ${state}`);
    }
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

      this.setAnimationState('celebrating');

      const pos = this._getPosition();
      const centerOffset = 30;
      const centerX = pos.x + centerOffset;
      const centerY = pos.y + centerOffset;

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
          this.protagonistElement.removeAttribute('transform');
          if (this.useSpriteSheet && this.protagonistElement.tagName && this.protagonistElement.tagName.toLowerCase() === 'g') {
            this._setPosition(pos.x, pos.y);
          }
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
