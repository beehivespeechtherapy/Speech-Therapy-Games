/**
 * Sound Ninjas — stage BGM, mute toggle, and music volume.
 */
(function (global) {
  'use strict';

  var MUTE_KEY = 'soundNinjasMuted';
  var BGM_VOL_KEY = 'soundNinjasBgmVolume';
  var DEFAULT_BGM_USER_VOLUME = 0.75;

  function NinjaAudio(assetPathFn) {
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
      click: 'sounds/click.mp3',
      weapon: 'sounds/weapon.mp3',
      smokeBomb: 'sounds/smoke-bomb.mp3',
      bgmSneak: 'sounds/sound-ninjas-sneak.mp4',
      bgmBoss: 'sounds/final-battle.mp4'
    };
  }

  NinjaAudio.prototype.loadConfig = function (audioCfg) {
    if (!audioCfg) return;
    if (audioCfg.click) this.paths.click = audioCfg.click;
    if (audioCfg.weapon) this.paths.weapon = audioCfg.weapon;
    if (audioCfg.smokeBomb) this.paths.smokeBomb = audioCfg.smokeBomb;
    if (audioCfg.bgm) {
      if (audioCfg.bgm.sneak) this.paths.bgmSneak = audioCfg.bgm.sneak;
      if (audioCfg.bgm.boss) this.paths.bgmBoss = audioCfg.bgm.boss;
    }
  };

  NinjaAudio.prototype.pauseAll = function () {
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

  NinjaAudio.prototype.bindLifecycle = function () {
    var self = this;
    function halt() { self.pauseAll(); }
    window.addEventListener('pagehide', halt);
    window.addEventListener('beforeunload', halt);
  };

  NinjaAudio.prototype.init = function () {
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

    this.bindUnlock();
    this.bindLifecycle();

    var self = this;
    var btn = document.getElementById('audio-mute-btn');
    if (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        self.unlock();
        self.setMuted(!self.muted);
      });
    }

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

  NinjaAudio.prototype.makeAudio = function (relativePath, opts) {
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

  NinjaAudio.prototype.showControls = function () {
    var panel = document.getElementById('audio-controls');
    if (panel) panel.hidden = false;
    this.updateMuteButton();
  };

  NinjaAudio.prototype.hideControls = function () {
    var panel = document.getElementById('audio-controls');
    if (panel) panel.hidden = true;
  };

  NinjaAudio.prototype.ensurePlayback = function () {
    if (this.muted || !this.currentScreen) return;
    if (this.bgm && !this.bgm.paused) return;
    this.onScreen(this.currentScreen);
  };

  NinjaAudio.prototype.bindUnlock = function () {
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

  NinjaAudio.prototype.unlock = function () {
    if (this.unlocked) return;
    this.unlocked = true;
    var silent = this.makeAudio(this.paths.click, { volume: 0.01 });
    silent.play().then(function () {
      silent.pause();
      silent.currentTime = 0;
    }).catch(function () { /* ignore */ });
  };

  NinjaAudio.prototype.setMuted = function (muted) {
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

  NinjaAudio.prototype.updateMuteButton = function () {
    var btn = document.getElementById('audio-mute-btn');
    if (!btn) return;
    btn.setAttribute('aria-pressed', this.muted ? 'true' : 'false');
    btn.title = this.muted ? 'Unmute music and sounds' : 'Mute music and sounds (Esc)';
    btn.innerHTML = this.muted
      ? '<span class="audio-mute-icon" aria-hidden="true">🔇</span><span class="audio-mute-label">Muted</span>'
      : '<span class="audio-mute-icon" aria-hidden="true">🔊</span><span class="audio-mute-label">Sound</span>';
  };

  NinjaAudio.prototype.getBgmBaseVolume = function () {
    return this.challengeOpen ? this.bgmDuckedVolume : this.bgmNormalVolume;
  };

  NinjaAudio.prototype.getBgmEffectiveVolume = function () {
    return this.getBgmBaseVolume() * this.bgmUserVolume;
  };

  NinjaAudio.prototype.setBgmUserVolume = function (volume) {
    this.bgmUserVolume = Math.max(0, Math.min(1, volume));
    try {
      sessionStorage.setItem(BGM_VOL_KEY, String(this.bgmUserVolume));
    } catch (e) { /* ignore */ }
    this.applyBgmVolume();
  };

  NinjaAudio.prototype.stopBgm = function (hard) {
    var self = this;
    [this.paths.bgmSneak, this.paths.bgmBoss].forEach(function (p) {
      var a = self.cache[self.resolve(p)];
      if (a) {
        a.pause();
        if (hard) a.currentTime = 0;
      }
    });
    if (this.bgm) {
      this.bgm.pause();
      if (hard) this.bgm.currentTime = 0;
    }
    if (hard) {
      this.bgm = null;
      this.bgmKey = null;
    }
  };

  NinjaAudio.prototype.applyBgmVolume = function () {
    var vol = this.getBgmEffectiveVolume();
    if (this.bgm) this.bgm.volume = vol;
    var self = this;
    [this.paths.bgmSneak, this.paths.bgmBoss].forEach(function (p) {
      var a = self.cache[self.resolve(p)];
      if (a) a.volume = vol;
    });
  };

  NinjaAudio.prototype.setChallengeOpen = function (open) {
    this.challengeOpen = !!open;
    this.applyBgmVolume();
  };

  NinjaAudio.prototype.playBgm = function (key, relativePath) {
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

  NinjaAudio.prototype.onScreen = function (screenId) {
    this.currentScreen = screenId || null;
    if (this.muted || !screenId) {
      this.stopBgm(true);
      return;
    }
    if (screenId === 'sneak') {
      this.playBgm('sneak', this.paths.bgmSneak);
    } else if (screenId === 'boss') {
      this.playBgm('boss', this.paths.bgmBoss);
    } else {
      this.stopBgm(true);
    }
  };

  NinjaAudio.prototype.playOneShot = function (relativePath, volume) {
    if (this.muted) return;
    this.unlock();
    var url = this.resolve(relativePath);
    var a = new Audio(url);
    a.volume = volume != null ? volume : 0.75;
    a.play().catch(function () { /* ignore */ });
  };

  NinjaAudio.prototype.playClick = function () {
    this.playOneShot(this.paths.click, 0.65);
  };

  NinjaAudio.prototype.playWeapon = function () {
    this.playOneShot(this.paths.weapon, 0.78);
  };

  NinjaAudio.prototype.playSmokeBomb = function () {
    this.playOneShot(this.paths.smokeBomb, 0.78);
  };

  global.NinjaAudio = NinjaAudio;
})(typeof window !== 'undefined' ? window : globalThis);
