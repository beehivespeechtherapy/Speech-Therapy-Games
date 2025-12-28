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
   * Get image path with extension fallback
   * Tries multiple extensions if the specified one doesn't exist
   * @param {string} imagePath - Original image path (with or without extension)
   * @returns {Promise<string>} - Resolved path that works
   */
  async resolveImagePath(imagePath) {
    // If path already has an extension, try it first, then try alternatives
    const hasExtension = /\.(png|jpg|jpeg|gif)$/i.test(imagePath);

    if (hasExtension) {
      // Try the specified path first
      if (await this.imageExists(imagePath)) {
        return imagePath;
      }

      // If it fails, try other extensions
      const basePath = imagePath.replace(/\.(png|jpg|jpeg|gif)$/i, '');
      return await this.tryImageExtensions(basePath);
    } else {
      // No extension specified, try all extensions
      return await this.tryImageExtensions(imagePath);
    }
  }

  /**
   * Try multiple image extensions
   * @param {string} basePath - Path without extension
   * @returns {Promise<string>} - Path with working extension
   */
  async tryImageExtensions(basePath) {
    const extensions = ['.png', '.jpg', '.jpeg', '.gif'];

    for (const ext of extensions) {
      const path = basePath + ext;
      if (await this.imageExists(path)) {
        return path;
      }
    }

    // If nothing works, return original path (will show broken image)
    return basePath + '.png';
  }

  /**
   * Check if image exists by trying to load it
   * @param {string} path - Image path to check
   * @returns {Promise<boolean>} - True if image loads
   */
  imageExists(path) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = path;
    });
  }

  /**
   * Initialize UI with container elements
   */
  init() {
    this.mapContainer = this.container.querySelector('#game-map');
    this.challengeContainer = this.container.querySelector('#word-pairs');
    this.challengeModal = this.container.querySelector('#challenge-modal');
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
   * Show challenge modal
   */
  showChallengeModal() {
    if (this.challengeModal) {
      this.challengeModal.classList.remove('hidden');
      this.challengeModal.classList.add('show');
    }
  }

  /**
   * Hide challenge modal
   */
  hideChallengeModal() {
    if (this.challengeModal) {
      this.challengeModal.classList.remove('show');
      this.challengeModal.classList.add('hidden');
    }
  }

  /**
   * Render the current challenge
   * @param {object} challenge - Challenge object with pairs
   * @param {object} gameConfig - Game configuration (for prompt)
   */
  async renderChallenge(challenge, gameConfig = {}) {
    if (!challenge || !this.challengeContainer) {
      console.warn('Cannot render challenge: missing challenge or container');
      return;
    }

    // Clear previous challenge
    this.challengeContainer.innerHTML = '';

    // Update prompt based on target sound
    if (this.challengePrompt) {
      const targetSound = challenge.correctSound || gameConfig.targetSound || '';
      const soundDisplay = targetSound.toUpperCase();
      this.challengePrompt.textContent = `Listen for the "${soundDisplay}" sound`;
    }

    // Shuffle pairs for randomness (optional - makes game less predictable)
    const shuffledPairs = this.shuffleArray([...challenge.pairs]);

    // Create button for each pair
    for (const pair of shuffledPairs) {
      const button = await this.createPairButton(pair, challenge.pairs.indexOf(pair));
      this.challengeContainer.appendChild(button);
    }

    // Show the challenge modal
    this.showChallengeModal();
  }

  /**
   * Create a button element for a word pair
   * @param {object} pair - Pair object with word, image, alt
   * @param {number} index - Index in original pairs array
   * @returns {Promise<HTMLElement>} - Button element
   */
  async createPairButton(pair, index) {
    const button = document.createElement('button');
    button.className = 'pair-button';
    button.setAttribute('data-index', index);
    button.setAttribute('aria-label', `Choose ${pair.word} - ${pair.sound} sound`);

    // Image with extension fallback
    const img = document.createElement('img');
    img.src = await this.resolveImagePath(pair.image);
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
   * Generate path coordinates based on style
   * @param {string} pathStyle - Path style ('winding', 'zigzag', 'curved', 'mountainous')
   * @param {number} steps - Number of checkpoints
   * @param {number} width - Map width
   * @param {number} height - Map height
   * @param {number} padding - Edge padding
   * @returns {Array} - Array of {x, y} coordinates
   */
  generatePathCoordinates(pathStyle, steps, width, height, padding) {
    const checkpoints = [];
    const pathWidth = width - 2 * padding;
    const pathHeight = height - 2 * padding;
    const stepX = pathWidth / steps;

    switch (pathStyle) {
      case 'winding':
        // Sinusoidal winding path
        for (let i = 0; i <= steps; i++) {
          const x = padding + (i * stepX);
          const amplitude = pathHeight * 0.3;
          const frequency = (2 * Math.PI) / steps;
          const y = (height / 2) + Math.sin(i * frequency * 1.5) * amplitude;
          checkpoints.push({ x, y });
        }
        break;

      case 'zigzag':
        // Zigzag up and down
        for (let i = 0; i <= steps; i++) {
          const x = padding + (i * stepX);
          const y = (i % 2 === 0)
            ? padding + pathHeight * 0.3
            : padding + pathHeight * 0.7;
          checkpoints.push({ x, y });
        }
        break;

      case 'mountainous':
        // Random hills and valleys
        for (let i = 0; i <= steps; i++) {
          const x = padding + (i * stepX);
          const baseY = height / 2;
          const variation = pathHeight * 0.35;
          const randomOffset = Math.sin(i * 0.7) * variation + Math.cos(i * 1.3) * (variation * 0.5);
          const y = baseY + randomOffset;
          checkpoints.push({ x, y });
        }
        break;

      case 'ascending':
        // Climbing upward
        for (let i = 0; i <= steps; i++) {
          const x = padding + (i * stepX);
          const progress = i / steps;
          const y = padding + pathHeight - (progress * pathHeight * 0.8);
          checkpoints.push({ x, y });
        }
        break;

      case 'straight':
      default:
        // Simple horizontal path
        const y = height / 2;
        for (let i = 0; i <= steps; i++) {
          const x = padding + (i * stepX);
          checkpoints.push({ x, y });
        }
        break;
    }

    return checkpoints;
  }

  /**
   * Create SVG path string from checkpoints with C1 continuity
   * @param {Array} checkpoints - Array of {x, y} coordinates
   * @returns {string} - SVG path d attribute
   */
  createSVGPath(checkpoints) {
    if (checkpoints.length === 0) return '';
    if (checkpoints.length === 1) return `M ${checkpoints[0].x},${checkpoints[0].y}`;
    if (checkpoints.length === 2) {
      return `M ${checkpoints[0].x},${checkpoints[0].y} L ${checkpoints[1].x},${checkpoints[1].y}`;
    }

    // Calculate tangent vectors at each point for smooth curves
    const tangents = [];
    for (let i = 0; i < checkpoints.length; i++) {
      let tx, ty;
      if (i === 0) {
        // First point: tangent points to next point
        tx = checkpoints[1].x - checkpoints[0].x;
        ty = checkpoints[1].y - checkpoints[0].y;
      } else if (i === checkpoints.length - 1) {
        // Last point: tangent from previous point
        tx = checkpoints[i].x - checkpoints[i - 1].x;
        ty = checkpoints[i].y - checkpoints[i - 1].y;
      } else {
        // Middle points: average of incoming and outgoing directions
        tx = (checkpoints[i + 1].x - checkpoints[i - 1].x) * 0.5;
        ty = (checkpoints[i + 1].y - checkpoints[i - 1].y) * 0.5;
      }
      tangents.push({ x: tx, y: ty });
    }

    let pathD = `M ${checkpoints[0].x},${checkpoints[0].y}`;

    // Create cubic Bezier curves between each pair of points
    const tension = 0.3; // Controls how tight the curves are
    for (let i = 0; i < checkpoints.length - 1; i++) {
      const p0 = checkpoints[i];
      const p1 = checkpoints[i + 1];
      const t0 = tangents[i];
      const t1 = tangents[i + 1];

      // Control points for cubic Bezier
      const cp1x = p0.x + t0.x * tension;
      const cp1y = p0.y + t0.y * tension;
      const cp2x = p1.x - t1.x * tension;
      const cp2y = p1.y - t1.y * tension;

      pathD += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p1.x},${p1.y}`;
    }

    return pathD;
  }

  /**
   * Render the game map/path with checkpoints
   * @param {number} totalChallenges - Total number of challenges
   * @param {number} currentPosition - Current player position
   * @param {object} mapConfig - Map configuration from game config
   */
  renderMap(totalChallenges, currentPosition, mapConfig = {}) {
    if (!this.mapContainer) {
      console.warn('Cannot render map: missing map container');
      return;
    }

    // Clear previous map
    this.mapContainer.innerHTML = '';

    // Set background image if provided
    if (mapConfig.backgroundImage) {
      this.mapContainer.style.backgroundImage = `url(${mapConfig.backgroundImage})`;
      this.mapContainer.style.backgroundSize = 'cover';
      this.mapContainer.style.backgroundPosition = 'center';
    }

    // Add theme class
    const theme = mapConfig.theme || 'default';
    this.mapContainer.setAttribute('data-theme', theme);

    // Map dimensions
    const mapWidth = 1000;
    const mapHeight = 400;
    const padding = 80;

    // Get path style
    const pathStyle = mapConfig.pathStyle || 'winding';

    // Generate checkpoint positions based on path style
    const checkpoints = this.generatePathCoordinates(
      pathStyle,
      totalChallenges,
      mapWidth,
      mapHeight,
      padding
    );

    // Create SVG container
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${mapWidth} ${mapHeight}`);
    svg.setAttribute('class', 'path-svg');

    // Create smooth path through checkpoints
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathD = this.createSVGPath(checkpoints);
    path.setAttribute('d', pathD);
    path.setAttribute('class', `path-line path-${pathStyle}`);
    path.setAttribute('stroke', '#8B4513');
    path.setAttribute('stroke-width', '8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.7');
    svg.appendChild(path);

    // Draw waypoint markers
    for (let i = 0; i <= totalChallenges; i++) {
      const checkpoint = checkpoints[i];

      // Draw small waypoint circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', checkpoint.x);
      circle.setAttribute('cy', checkpoint.y);
      circle.setAttribute('r', i === 0 ? '8' : (i === totalChallenges ? '10' : '6'));

      // Style based on position
      let circleClass = 'waypoint';
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
      circle.setAttribute('fill', i === 0 ? '#4CAF50' : (i === totalChallenges ? '#FF9800' : '#fff'));
      circle.setAttribute('stroke', i < currentPosition ? '#66bb6a' : '#999');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('opacity', '0.8');
      svg.appendChild(circle);
    }

    // Add flag at finish
    const finishCheckpoint = checkpoints[totalChallenges];
    if (finishCheckpoint) {
      const flagImg = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      flagImg.setAttribute('x', finishCheckpoint.x);
      flagImg.setAttribute('y', finishCheckpoint.y - 25);
      flagImg.setAttribute('text-anchor', 'middle');
      flagImg.setAttribute('font-size', '30');
      flagImg.textContent = '🏁';
      svg.appendChild(flagImg);
    }

    // Add protagonist to SVG (before appending SVG to container)
    const protagonistConfig = mapConfig.protagonist || {};
    const protagonistImages = protagonistConfig.images || {};

    // Store protagonist images for animator
    this.protagonistImages = {
      idle: protagonistImages.idle || '../../assets/protagonist/idle.png',
      walking: protagonistImages.walking || '../../assets/protagonist/walking.png',
      celebrating: protagonistImages.celebrating || '../../assets/protagonist/celebrating.png'
    };

    // Create protagonist as SVG image element
    const protagonistGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    protagonistGroup.setAttribute('class', 'protagonist-group');

    const protagonistImage = document.createElementNS('http://www.w3.org/2000/svg', 'image');
    protagonistImage.setAttribute('href', this.protagonistImages.idle);
    protagonistImage.setAttribute('width', '60');
    protagonistImage.setAttribute('height', '60');
    protagonistImage.setAttribute('class', 'protagonist-svg-image');

    // Position at current checkpoint
    if (currentPosition >= 0 && currentPosition <= totalChallenges) {
      const checkpoint = checkpoints[currentPosition];
      // Center the image on the checkpoint (image is 60x60, so offset by -30)
      protagonistImage.setAttribute('x', checkpoint.x - 30);
      protagonistImage.setAttribute('y', checkpoint.y - 30);
    }

    protagonistGroup.appendChild(protagonistImage);
    svg.appendChild(protagonistGroup);

    this.mapContainer.appendChild(svg);

    // Store checkpoints for animator
    this.checkpoints = checkpoints;

    // Store reference to protagonist SVG element
    this.protagonistElement = protagonistImage;
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
   * Fetch a random celebration GIF from Giphy
   * @returns {Promise<string>} - GIF URL
   */
  async fetchCelebrationGif() {
    // Giphy API public beta key (for testing - replace with your own)
    const apiKey = 'sXpGFDGZs0Dv1mmNFvYaGUvYwKX0PWIh';

    // Fun celebration search terms
    const searchTerms = [
      'funny celebration',
      'cartoon victory dance',
      'kids celebration',
      'happy dance cartoon',
      'woohoo celebration',
      'funny success',
      'cartoon party'
    ];

    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];

    try {
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(randomTerm)}&limit=20&rating=g`
      );

      if (!response.ok) {
        throw new Error('Giphy API request failed');
      }

      const data = await response.json();

      if (data.data && data.data.length > 0) {
        // Pick a random GIF from results
        const randomIndex = Math.floor(Math.random() * data.data.length);
        return data.data[randomIndex].images.fixed_height.url;
      }
    } catch (error) {
      console.warn('Failed to fetch Giphy GIF:', error);
    }

    // Fallback: return a default celebration GIF URL
    return 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif';
  }

  /**
   * Show victory screen with animation
   * @param {object} config - Game config with victory message
   */
  async showVictory(config) {
    if (!this.victoryModal) {
      console.warn('Cannot show victory: missing victory modal');
      return;
    }

    // Update victory message
    const messageElement = this.victoryModal.querySelector('#victory-message');
    if (messageElement && config.victory) {
      messageElement.textContent = config.victory.message || 'Congratulations! You won!';
    }

    // Display celebration GIF - use config URL or fetch random from Giphy
    const gifElement = this.victoryModal.querySelector('#victory-gif');
    if (gifElement) {
      let gifUrl;

      // Check if a specific GIF URL is provided in config
      if (config.victory && config.victory.gif) {
        gifUrl = config.victory.gif;
      } else {
        // No GIF specified, fetch random from Giphy
        gifUrl = await this.fetchCelebrationGif();
      }

      gifElement.src = gifUrl;
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
    // Bright, kid-friendly confetti colors
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f7b731', '#5f27cd', '#00d2d3', '#ff6348', '#ffa502', '#26de81', '#fd79a8'];

    // Create lots of confetti for a celebration!
    for (let i = 0; i < 80; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = Math.random() * 100 + '%';
      confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      confetti.style.animationDelay = Math.random() * 2 + 's';
      confetti.style.animationDuration = (Math.random() * 2 + 3) + 's';

      // Add horizontal drift for more natural falling
      const drift = (Math.random() - 0.5) * 2; // Range: -1 to 1
      confetti.style.setProperty('--confetti-drift', drift);

      if (this.victoryModal) {
        this.victoryModal.appendChild(confetti);

        // Remove after animation completes
        setTimeout(() => confetti.remove(), 6000);
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
