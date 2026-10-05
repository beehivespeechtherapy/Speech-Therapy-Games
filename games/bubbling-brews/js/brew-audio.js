/**
 * Bubbling Brews — BGM, SFX, mute, and music volume (same controls as Fossil Forge).
 */
(function (global) {
  'use strict';

  var MUTE_KEY = 'bubblingBrewsMuted';
  var BGM_VOL_KEY = 'bubblingBrewsBgmVolume';
  var DEFAULT_BGM_USER_VOLUME = 0.75;

  function BrewAudio(assetPathFn) {
    this.resolve = assetPathFn || function (p) { return p; };
    this.muted = false;
    this.unlocked = false;
    this.currentScreen = null;
    this.bgm = null;
    this.bgmKey = null;
    this.bgmNormalVolume = 0.45;
    this.bgmDuckedVolume = 0.12;
    this.bgmUserVolume = DEFAULT_BGM_USER_VOLUME;
    this.challengeOpen = false;
    this.cache = {};
    this.paths = {
      bgm: 'assets/bubbling_brews.mp3',
      bubbling: 'assets/bubbling.mp3',
      potionComplete: 'assets/potion_complete.mp3',
    };
  }

  BrewAudio.prototype.loadConfig = function (audioCfg) {
    if (!audioCfg) return;
    if (audioCfg.bgm) this.paths.bgm = audioCfg.bgm;
    if (audioCfg.bubbling) this.paths.bubbling = audioCfg.bubbling;
    if (audioCfg.potionComplete) this.paths.potionComplete = audioCfg.potionComplete;
  };

  BrewAudio.prototype.pauseAll = function () {
    var self = this;
    Object.keys(this.cache).forEach(function (url) {
      var a = self.cache[url];
      if (!a) return;
      try {
        a.pause();
        a.currentTime = 0;
      } catch (e) { /* ignore */ }
    });
    this.bgm = null;
    this.bgmKey = null;
  };

  BrewAudio.prototype.bindLifecycle = function () {
    var self = this;
    function halt() { self.pauseAll(); }
    window.addEventListener('pagehide', halt);
    window.addEventListener('beforeunload', halt);
  };

  BrewAudio.prototype.init = function () {
    try {
      this.muted = sessionStorage.getItem(MUTE_KEY) === '1';
    } catch (e) { /* ignore */ }
    try {
      var storedVol = sessionStorage.getItem(BGM_VOL_KEY);
      if (storedVol != null && storedVol !== '') {
        var parsed = parseFloat(storedVol);
        if (!isNaN(parsed)) this.bgmUserVolume = Math.max(0, Math.min(1, parsed));
      }
    } catch (e) { /* ignore */ }

    this.mountAudioControls();
    this.bindUnlock();
    this.bindLifecycle();

    var self = this;
    document.getElementById('audio-mute-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      self.unlock();
      self.setMuted(!self.muted);
    });

    var volSlider = document.getElementById('audio-bgm-volume');
    if (volSlider) {
      volSlider.value = String(Math.round(this.bgmUserVolume * 100));
      volSlider.addEventListener('input', function (e) {
        e.stopPropagation();
        self.unlock();
        self.setBgmUserVolume(parseInt(volSlider.value, 10) / 100);
      });
      volSlider.addEventListener('click', function (e) { e.stopPropagation(); });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        self.setMuted(!self.muted);
      }
    });

    this.updateMuteButton();
  };

  BrewAudio.prototype.makeAudio = function (relativePath, opts) {
    opts = opts || {};
    var url = this.resolve(relativePath);
    if (this.cache[url]) return this.cache[url];
    var a = new Audio(url);
    a.preload = 'auto';
    a.loop = !!opts.loop;
    a.volume = opts.volume != null ? opts.volume : 0.75;
    this.cache[url] = a;
    return a;
  };

  BrewAudio.prototype.ensurePlayback = function () {
    if (this.muted || !this.currentScreen) return;
    if (this.bgm && !this.bgm.paused) return;
    this.onScreen(this.currentScreen);
  };

  BrewAudio.prototype.bindUnlock = function () {
    var self = this;
    function once() {
      self.unlock();
      self.ensurePlayback();
      document.removeEventListener('pointerdown', once, true);
      document.removeEventListener('keydown', once, true);
    }
    document.addEventListener('pointerdown', once, true);
    document.addEventListener('keydown', once, true);
  };

  BrewAudio.prototype.unlock = function () {
    if (this.unlocked) return;
    this.unlocked = true;
    var silent = this.makeAudio(this.paths.bubbling, { volume: 0.01 });
    silent.play().then(function () {
      silent.pause();
      silent.currentTime = 0;
    }).catch(function () { /* ignore */ });
  };

  BrewAudio.prototype.setMuted = function (muted) {
    this.muted = !!muted;
    try {
      sessionStorage.setItem(MUTE_KEY, this.muted ? '1' : '0');
    } catch (e) { /* ignore */ }
    this.updateMuteButton();
    if (this.muted) {
      this.pauseAll();
    } else if (this.currentScreen) {
      this.onScreen(this.currentScreen);
    }
  };

  BrewAudio.prototype.updateMuteButton = function () {
    var panel = document.getElementById('audio-controls');
    var btn = document.getElementById('audio-mute-btn');
    if (!btn) return;
    if (panel) panel.hidden = false;
    btn.setAttribute('aria-pressed', this.muted ? 'true' : 'false');
    btn.title = this.muted ? 'Unmute music and sounds' : 'Mute music and sounds (Esc)';
    btn.innerHTML = this.muted
      ? '<span class="audio-mute-icon" aria-hidden="true">🔇</span><span class="audio-mute-label">Muted</span>'
      : '<span class="audio-mute-icon" aria-hidden="true">🔊</span><span class="audio-mute-label">Sound</span>';
  };

  BrewAudio.prototype.getBgmBaseVolume = function () {
    return this.challengeOpen ? this.bgmDuckedVolume : this.bgmNormalVolume;
  };

  BrewAudio.prototype.getBgmEffectiveVolume = function () {
    return this.getBgmBaseVolume() * this.bgmUserVolume;
  };

  BrewAudio.prototype.setBgmUserVolume = function (volume) {
    this.bgmUserVolume = Math.max(0, Math.min(1, volume));
    try {
      sessionStorage.setItem(BGM_VOL_KEY, String(this.bgmUserVolume));
    } catch (e) { /* ignore */ }
    this.applyBgmVolume();
  };

  BrewAudio.prototype.mountAudioControls = function () {
    if (document.getElementById('audio-controls')) return;
    var panel = document.createElement('div');
    panel.id = 'audio-controls';
    panel.className = 'audio-controls';
    panel.innerHTML = ''
      + '<label class="audio-bgm-volume-wrap" title="Game music only — does not change your computer or call volume">'
      + '<span class="audio-bgm-volume-label">Music</span>'
      + '<input type="range" id="audio-bgm-volume" class="audio-bgm-volume" min="0" max="100" value="75" aria-label="Game music volume">'
      + '</label>'
      + '<button type="button" id="audio-mute-btn" class="audio-mute-btn" aria-label="Toggle mute">'
      + '<span class="audio-mute-icon" aria-hidden="true">🔊</span><span class="audio-mute-label">Sound</span>'
      + '</button>';
    document.body.appendChild(panel);
  };

  BrewAudio.prototype.stopBgm = function (hard) {
    var a = this.cache[this.resolve(this.paths.bgm)];
    if (a) {
      a.pause();
      if (hard) a.currentTime = 0;
    }
    if (this.bgm) {
      this.bgm.pause();
      if (hard) this.bgm.currentTime = 0;
    }
    if (hard) {
      this.bgm = null;
      this.bgmKey = null;
    }
  };

  BrewAudio.prototype.applyBgmVolume = function () {
    var vol = this.getBgmEffectiveVolume();
    if (this.bgm) this.bgm.volume = vol;
    var a = this.cache[this.resolve(this.paths.bgm)];
    if (a) a.volume = vol;
  };

  BrewAudio.prototype.setChallengeOpen = function (open) {
    this.challengeOpen = !!open;
    this.applyBgmVolume();
  };

  BrewAudio.prototype.playBgm = function (key, relativePath) {
    if (this.muted) return;
    var track = this.makeAudio(relativePath, { loop: true, volume: this.bgmNormalVolume });

    if (this.bgmKey === key && track === this.bgm && !track.paused) {
      this.applyBgmVolume();
      return;
    }

    this.stopBgm(true);
    this.bgm = track;
    this.bgmKey = key;
    this.applyBgmVolume();
    var playPromise = track.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () { /* needs unlock */ });
    }
  };

  BrewAudio.prototype.onScreen = function (screenId) {
    this.currentScreen = screenId;
    if (this.muted) {
      this.stopBgm(true);
      return;
    }
    if (screenId === 'play-screen' || screenId === 'potion-screen') {
      this.playBgm('kitchen', this.paths.bgm);
    } else {
      this.stopBgm(true);
    }
  };

  BrewAudio.prototype.playSfx = function (relativePath, opts) {
    opts = opts || {};
    var finished = false;
    function done() {
      if (finished) return;
      finished = true;
      if (opts.onEnded) opts.onEnded();
    }
    if (this.muted || !relativePath) {
      done();
      return;
    }
    this.unlock();
    var a = new Audio(this.resolve(relativePath));
    a.volume = opts.volume != null ? opts.volume : 0.8;
    a.onended = done;
    a.play().catch(done);
  };

  global.BrewAudio = BrewAudio;
})(typeof window !== 'undefined' ? window : globalThis);
