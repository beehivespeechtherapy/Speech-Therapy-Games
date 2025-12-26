/**
 * GameUI - DOM rendering and user interaction
 * Handles displaying challenges, map, feedback, and victory screen
 */
class GameUI {
  constructor(containerElement) {
    this.container = containerElement;
    this.answerCallback = null;
    this.mapContainer = null;
    this.challengeContainer = null;
    this.victoryModal = null;
  }

  /**
   * Initialize UI with container elements
   */
  init() {
    this.mapContainer = this.container.querySelector('#game-map');
    this.challengeContainer = this.container.querySelector('#word-pairs');
    this.victoryModal = this.container.querySelector('#victory-modal');
    this.challengePrompt = this.container.querySelector('#challenge-prompt');

    // Set up play again button
    const playAgainBtn = this.container.querySelector('#play-again');
    if (playAgainBtn) {
      playAgainBtn.addEventListener('click', () => {
        if (this.playAgainCallback) {
          this.playAgainCallback();
        }
      });
    }
  }

  /**
   * Render the current challenge
   * @param {object} challenge - Challenge object with pairs
   */
  renderChallenge(challenge) {
    if (!challenge || !this.challengeContainer) {
      console.warn('Cannot render challenge: missing challenge or container');
      return;
    }

    // Clear previous challenge
    this.challengeContainer.innerHTML = '';

    // Update prompt
    if (this.challengePrompt) {
      this.challengePrompt.textContent = `Choose: ${challenge.correctWord}`;
    }

    // Shuffle pairs for randomness (optional - makes game less predictable)
    const shuffledPairs = this.shuffleArray([...challenge.pairs]);

    // Create button for each pair
    shuffledPairs.forEach((pair, originalIndex) => {
      const button = this.createPairButton(pair, challenge.pairs.indexOf(pair));
      this.challengeContainer.appendChild(button);
    });
  }

  /**
   * Create a button element for a word pair
   * @param {object} pair - Pair object with word, image, alt
   * @param {number} index - Index in original pairs array
   * @returns {HTMLElement} - Button element
   */
  createPairButton(pair, index) {
    const button = document.createElement('button');
    button.className = 'pair-button';
    button.setAttribute('data-index', index);
    button.setAttribute('aria-label', `Choose ${pair.word} - ${pair.sound} sound`);

    // Image
    const img = document.createElement('img');
    img.src = pair.image;
    img.alt = pair.alt || pair.word;
    img.className = 'pair-image';
    button.appendChild(img);

    // Word label
    const label = document.createElement('span');
    label.className = 'word-label';
    label.textContent = pair.word;
    button.appendChild(label);

    // Click handler
    button.addEventListener('click', () => {
      if (this.answerCallback) {
        this.answerCallback(index);
      }
    });

    return button;
  }

  /**
   * Shuffle array (Fisher-Yates algorithm)
   * @param {Array} array - Array to shuffle
   * @returns {Array} - Shuffled array
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Render the game map/path with checkpoints
   * @param {number} totalChallenges - Total number of challenges
   * @param {number} currentPosition - Current player position
   */
  renderMap(totalChallenges, currentPosition) {
    if (!this.mapContainer) {
      console.warn('Cannot render map: missing map container');
      return;
    }

    // Clear previous map
    this.mapContainer.innerHTML = '';

    // Calculate checkpoint positions
    const mapWidth = 800;
    const mapHeight = 150;
    const padding = 50;
    const pathY = mapHeight / 2;

    // Create SVG container
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${mapWidth} ${mapHeight}`);
    svg.setAttribute('class', 'path-svg');

    // Draw path line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathD = `M ${padding},${pathY} L ${mapWidth - padding},${pathY}`;
    path.setAttribute('d', pathD);
    path.setAttribute('class', 'path-line');
    path.setAttribute('stroke', '#ccc');
    path.setAttribute('stroke-width', '4');
    path.setAttribute('fill', 'none');
    svg.appendChild(path);

    // Calculate positions for checkpoints
    const checkpoints = [];
    const stepWidth = (mapWidth - 2 * padding) / totalChallenges;

    for (let i = 0; i <= totalChallenges; i++) {
      const x = padding + (i * stepWidth);
      const y = pathY;
      checkpoints.push({ x, y });

      // Draw checkpoint circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', i === 0 ? '12' : (i === totalChallenges ? '14' : '8'));

      // Style based on position
      let circleClass = 'checkpoint';
      if (i === 0) {
        circleClass += ' start';
      } else if (i === totalChallenges) {
        circleClass += ' finish';
      }
      if (i < currentPosition) {
        circleClass += ' completed';
      } else if (i === currentPosition) {
        circleClass += ' current';
      }

      circle.setAttribute('class', circleClass);
      svg.appendChild(circle);

      // Add checkpoint number (except for start/finish)
      if (i > 0 && i < totalChallenges) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', x);
        text.setAttribute('y', y + 25);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('class', 'checkpoint-label');
        text.textContent = i;
        svg.appendChild(text);
      }
    }

    this.mapContainer.appendChild(svg);

    // Store checkpoints for animator
    this.checkpoints = checkpoints;

    // Create protagonist element if it doesn't exist
    if (!this.protagonistElement) {
      this.protagonistElement = document.createElement('div');
      this.protagonistElement.className = 'protagonist';

      const img = document.createElement('img');
      img.src = '../../assets/protagonist/idle.png';
      img.alt = 'Character';
      img.className = 'protagonist-image';

      this.protagonistElement.appendChild(img);
      this.mapContainer.appendChild(this.protagonistElement);
    }

    // Position protagonist at current checkpoint
    if (currentPosition >= 0 && currentPosition <= totalChallenges) {
      const checkpoint = checkpoints[currentPosition];
      this.protagonistElement.style.left = `${checkpoint.x}px`;
      this.protagonistElement.style.top = `${checkpoint.y - 40}px`;
    }
  }

  /**
   * Show feedback for answer (correct or wrong)
   * @param {boolean} isCorrect - Whether the answer was correct
   */
  showFeedback(isCorrect) {
    if (!this.challengeContainer) return;

    // Add feedback class
    const feedbackClass = isCorrect ? 'correct-feedback' : 'wrong-feedback';
    this.challengeContainer.classList.add(feedbackClass);

    // Remove class after animation
    setTimeout(() => {
      this.challengeContainer.classList.remove(feedbackClass);
    }, 600);

    // Also show a temporary message
    this.showTemporaryMessage(isCorrect ? 'Correct!' : 'Oops! Try again!', isCorrect);
  }

  /**
   * Show a temporary feedback message
   * @param {string} message - Message to display
   * @param {boolean} isPositive - Whether it's a positive message
   */
  showTemporaryMessage(message, isPositive = true) {
    // Remove existing message if any
    const existingMsg = this.container.querySelector('.feedback-message');
    if (existingMsg) {
      existingMsg.remove();
    }

    // Create message element
    const msgElement = document.createElement('div');
    msgElement.className = `feedback-message ${isPositive ? 'positive' : 'negative'}`;
    msgElement.textContent = message;

    this.container.appendChild(msgElement);

    // Remove after delay
    setTimeout(() => {
      msgElement.classList.add('fade-out');
      setTimeout(() => msgElement.remove(), 300);
    }, 1500);
  }

  /**
   * Show victory screen with animation
   * @param {object} config - Game config with victory message
   */
  showVictory(config) {
    if (!this.victoryModal) {
      console.warn('Cannot show victory: missing victory modal');
      return;
    }

    // Update victory message
    const messageElement = this.victoryModal.querySelector('#victory-message');
    if (messageElement && config.victory) {
      messageElement.textContent = config.victory.message || 'Congratulations! You won!';
    }

    // Show modal
    this.victoryModal.classList.remove('hidden');
    this.victoryModal.classList.add('show');

    // Trigger confetti animation
    this.triggerConfetti();
  }

  /**
   * Hide victory screen
   */
  hideVictory() {
    if (this.victoryModal) {
      this.victoryModal.classList.remove('show');
      this.victoryModal.classList.add('hidden');
    }
  }

  /**
   * Trigger confetti animation
   */
  triggerConfetti() {
    // Simple confetti using CSS animations
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3'];

    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 3 + 's';
      confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';

      if (this.victoryModal) {
        this.victoryModal.appendChild(confetti);

        // Remove after animation
        setTimeout(() => confetti.remove(), 5000);
      }
    }
  }

  /**
   * Register callback for answer selection
   * @param {Function} callback - Function to call when answer is selected
   */
  onAnswer(callback) {
    this.answerCallback = callback;
  }

  /**
   * Register callback for play again button
   * @param {Function} callback - Function to call when play again is clicked
   */
  onPlayAgain(callback) {
    this.playAgainCallback = callback;
  }

  /**
   * Get protagonist element for animator
   * @returns {HTMLElement} - Protagonist element
   */
  getProtagonistElement() {
    return this.protagonistElement;
  }

  /**
   * Get checkpoint positions for animator
   * @returns {Array} - Array of {x, y} checkpoint positions
   */
  getCheckpoints() {
    return this.checkpoints || [];
  }
}
