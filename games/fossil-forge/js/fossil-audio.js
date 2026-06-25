/**
 * Fossil Forge — BGM, SFX, species calls, mute toggle.
 */
(function (global) {
  'use strict';

  var DEFAULT_CALLS = {
    't-rex': 'Sounds/t-rex roar.mp3',
    triceratops: 'Sounds/triceratops roar.mp3',
    brachiosaurus: 'Sounds/brachiosaurus call.mp3',
    velociraptor: 'Sounds/velociraptor roar.mp3',
    pterodactyl: 'Sounds/pterodactyl call.mp3',
    stegosaurus: 'Sounds/stegosaurus call.mp3',
    mosasaurus: 'Sounds/mosasaurus roar.mp3',
    spinosaurus: 'Sounds/spinosaurus roar.mp3',
  };

  var MUTE_KEY = 'fossilForgeMuted';

  function FossilAudio(assetPathFn) {
    this.resolve = assetPathFn || function (p) { return p; };
    this.muted = false;
    this.unlocked = false;
    this.currentScreen = null;
    this.bgm = null;
    this.bgmKey = null;
    this.bgmNormalVolume = 0.45;
    this.bgmDuckedVolume = 0.12;
    this.challengeOpen = false;
    this.brush = null;
    this.brushActive = 0;
    this.cache = {};
    this.speciesCalls = DEFAULT_CALLS;
    this.paths = {
      brush: 'Sounds/dirt-brushing.mp3',
      click: 'Sounds/click.mp3',
      bgmHunt: 'Sounds/fossil forge fossil hunt.mp4',
      bgmAssembly: 'Sounds/fossil forge assembly stage.mp4',
    };
  }

  FossilAudio.prototype.loadConfig = function (audioCfg) {
    if (!audioCfg) return;
    if (audioCfg.brush) this.paths.brush = audioCfg.brush;
    if (audioCfg.click) this.paths.click = audioCfg.click;
    if (audioCfg.bgm) {
      if (audioCfg.bgm.hunt) this.paths.bgmHunt = audioCfg.bgm.hunt;
      if (audioCfg.bgm.assembly) this.paths.bgmAssembly = audioCfg.bgm.assembly;
    }
    if (audioCfg.speciesCalls) {
      Object.assign(this.speciesCalls, audioCfg.speciesCalls);
    }
  };

  FossilAudio.prototype.pauseAll = function () {
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
    this.brushActive = 0;
  };

  FossilAudio.prototype.bindLifecycle = function () {
    var self = this;
    function halt() { self.pauseAll(); }
    window.addEventListener('pagehide', halt);
    window.addEventListener('beforeunload', halt);
  };

  FossilAudio.prototype.init = function () {
    try {
      this.muted = sessionStorage.getItem(MUTE_KEY) === '1';
    } catch (e) { /* ignore */ }

    this.brush = this.makeAudio(this.paths.brush, { loop: true, volume: 0.55 });
    this.mountMuteButton();
    this.bindUnlock();
    this.bindLifecycle();

    var self = this;
    document.getElementById('audio-mute-btn').addEventListener('click', function (e) {
      e.stopPropagation();
      self.unlock();
      self.setMuted(!self.muted);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        self.setMuted(!self.muted);
      }
    });

    this.updateMuteButton();
  };

  FossilAudio.prototype.makeAudio = function (relativePath, opts) {
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

  FossilAudio.prototype.ensurePlayback = function () {
    if (this.muted || !this.currentScreen) return;
    if (this.bgm && !this.bgm.paused) return;
    this.onScreen(this.currentScreen);
  };

  FossilAudio.prototype.bindUnlock = function () {
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

  FossilAudio.prototype.unlock = function () {
    if (this.unlocked) return;
    this.unlocked = true;
    var silent = this.makeAudio(this.paths.click, { volume: 0.01 });
    silent.play().then(function () {
      silent.pause();
      silent.currentTime = 0;
    }).catch(function () { /* ignore */ });
  };

  FossilAudio.prototype.setMuted = function (muted) {
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

  FossilAudio.prototype.updateMuteButton = function () {
    var btn = document.getElementById('audio-mute-btn');
    if (!btn) return;
    btn.hidden = false;
    btn.setAttribute('aria-pressed', this.muted ? 'true' : 'false');
    btn.title = this.muted ? 'Unmute music and sounds' : 'Mute music and sounds (Esc)';
    btn.innerHTML = this.muted
      ? '<span class="audio-mute-icon" aria-hidden="true">🔇</span><span class="audio-mute-label">Muted</span>'
      : '<span class="audio-mute-icon" aria-hidden="true">🔊</span><span class="audio-mute-label">Sound</span>';
  };

  FossilAudio.prototype.mountMuteButton = function () {
    if (document.getElementById('audio-mute-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'audio-mute-btn';
    btn.className = 'audio-mute-btn';
    btn.setAttribute('aria-label', 'Toggle mute');
    btn.innerHTML = '<span class="audio-mute-icon" aria-hidden="true">🔊</span><span class="audio-mute-label">Sound</span>';
    document.body.appendChild(btn);
  };

  FossilAudio.prototype.stopBgm = function (hard) {
    var self = this;
    [this.paths.bgmHunt, this.paths.bgmAssembly].forEach(function (p) {
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

  FossilAudio.prototype.pauseBgmTracks = function () {
    this.stopBgm(true);
  };

  FossilAudio.prototype.applyBgmVolume = function () {
    if (!this.bgm) return;
    this.bgm.volume = this.challengeOpen ? this.bgmDuckedVolume : this.bgmNormalVolume;
  };

  FossilAudio.prototype.setChallengeOpen = function (open) {
    this.challengeOpen = !!open;
    this.applyBgmVolume();
  };

  FossilAudio.prototype.playBgm = function (key, relativePath) {
    if (this.muted) return;
    var track = this.makeAudio(relativePath, { loop: true, volume: this.bgmNormalVolume });

    if (this.bgmKey === key && track === this.bgm && !track.paused) {
      this.applyBgmVolume();
      return;
    }

    this.pauseBgmTracks();
    this.bgm = track;
    this.bgmKey = key;
    this.applyBgmVolume();
    var playPromise = track.play();
    if (playPromise && playPromise.catch) {
      playPromise.catch(function () { /* needs unlock */ });
    }
  };

  FossilAudio.prototype.onScreen = function (screenId) {
    this.currentScreen = screenId;
    if (this.muted) {
      this.stopBgm(true);
      return;
    }
    if (screenId === 'hunt-screen') {
      this.playBgm('hunt', this.paths.bgmHunt);
    } else if (screenId === 'assembly-screen') {
      this.playBgm('assembly', this.paths.bgmAssembly);
    } else {
      this.stopBgm(true);
    }
  };

  FossilAudio.prototype.startBrushing = function () {
    if (this.muted) return;
    this.unlock();
    this.brushActive++;
    if (this.brushActive === 1 && this.brush) {
      this.brush.currentTime = 0;
      this.brush.play().catch(function () { /* ignore */ });
    }
  };

  FossilAudio.prototype.stopBrushing = function (force) {
    if (force) this.brushActive = 0;
    else this.brushActive = Math.max(0, this.brushActive - 1);
    if (this.brushActive === 0 && this.brush) {
      this.brush.pause();
      this.brush.currentTime = 0;
    }
  };

  FossilAudio.prototype.playClick = function () {
    if (this.muted) return;
    this.unlock();
    this.playOneShot(this.paths.click, 0.65);
  };

  FossilAudio.prototype.playOneShot = function (relativePath, volume) {
    if (this.muted) return;
    var url = this.resolve(relativePath);
    var a = new Audio(url);
    a.volume = volume != null ? volume : 0.75;
    a.play().catch(function () { /* ignore */ });
  };

  FossilAudio.prototype.playSpeciesCall = function (speciesId) {
    if (this.muted || !speciesId) return;
    this.unlock();
    var path = this.speciesCalls[speciesId];
    if (!path) return;
    this.playOneShot(path, 0.8);
  };

  FossilAudio.prototype.playHeadCall = function (equipped) {
    if (!equipped || !equipped.head) return;
    this.playSpeciesCall(equipped.head);
  };

  global.FossilAudio = FossilAudio;
})(typeof window !== 'undefined' ? window : globalThis);
