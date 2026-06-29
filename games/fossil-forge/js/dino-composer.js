/**
 * Stack 1600×1600 dinosaur parts at origin, multiply-tint bases, patterns, overlay details.
 */
(function (global) {
  'use strict';

  var PARTS_ASSET_VERSION = '3';

  function DinoComposer(assetBase) {
    this.assetBase = assetBase || '';
    this.catalog = null;
    this.cache = new Map();
  }

  DinoComposer.prototype.resolvePath = function (relative) {
    const base = this.assetBase.replace(/\/?$/, '/');
    return base + relative.replace(/^\//, '');
  };

  DinoComposer.prototype.loadCatalog = async function (url) {
    const tryFetch = async function (fetchUrl) {
      const r = await fetch(fetchUrl, { cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    };

    const attempts = [url, 'assets/parts-catalog.json'];
    for (let i = 0; i < attempts.length; i++) {
      try {
        this.catalog = await tryFetch(attempts[i]);
        this.cache = new Map();
        return this.catalog;
      } catch (e) { /* try next */ }
    }

    if (global.__FOSSIL_FORGE_CATALOG_EMBED__) {
      this.catalog = global.__FOSSIL_FORGE_CATALOG_EMBED__;
      this.cache = new Map();
      return this.catalog;
    }

    const el = document.getElementById('parts-catalog-embed');
    if (el && el.textContent) {
      try {
        this.catalog = JSON.parse(el.textContent.trim());
        this.cache = new Map();
        return this.catalog;
      } catch (e) { /* ignore */ }
    }

    if (window.location.protocol === 'file:') {
      throw new Error(
        'Open Fossil Forge through a local web server (not by double-clicking the file). ' +
        'Run tools/serve-fossil-forge.sh in Terminal, then open the URL it prints.'
      );
    }
    throw new Error('Failed to load parts catalog');
  };

  DinoComposer.prototype.getAssetVersion = function () {
    return (this.catalog && this.catalog.assetVersion)
      ? String(this.catalog.assetVersion)
      : PARTS_ASSET_VERSION;
  };

  DinoComposer.prototype.loadImage = function (relativePath) {
    const url = this.resolvePath(relativePath);
    const busted = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + this.getAssetVersion();
    if (this.cache.has(busted)) return this.cache.get(busted);
    const p = new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Failed to load ' + relativePath)); };
      img.src = busted;
    });
    this.cache.set(busted, p);
    return p;
  };

  DinoComposer.prototype.getSpecies = function (speciesId) {
    if (!this.catalog) return null;
    return (this.catalog.species || []).find(function (s) { return s.id === speciesId; }) || null;
  };

  DinoComposer.prototype.drawTinted = function (ctx, img, color, destW, destH) {
    const off = document.createElement('canvas');
    off.width = img.naturalWidth;
    off.height = img.naturalHeight;
    const octx = off.getContext('2d');
    octx.drawImage(img, 0, 0);
    octx.globalCompositeOperation = 'multiply';
    octx.fillStyle = color;
    octx.fillRect(0, 0, off.width, off.height);
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(img, 0, 0);
    ctx.drawImage(off, 0, 0, destW, destH);
  };

  DinoComposer.prototype.drawLayerImage = function (ctx, img, tint, color, destW, destH) {
    if (tint) this.drawTinted(ctx, img, color, destW, destH);
    else ctx.drawImage(img, 0, 0, destW, destH);
  };

  DinoComposer.prototype.drawTintedToCanvas = function (destCanvas, img, color, destW, destH) {
    const octx = destCanvas.getContext('2d');
    octx.clearRect(0, 0, destW, destH);
    this.drawLayerImage(octx, img, true, color, destW, destH);
  };

  DinoComposer.prototype.buildLegEraseMask = function (legsImg, destW, destH) {
    const off = document.createElement('canvas');
    off.width = destW;
    off.height = destH;
    const octx = off.getContext('2d');
    octx.drawImage(legsImg, 0, 0, destW, destH);
    const imgData = octx.getImageData(0, 0, destW, destH);
    const d = imgData.data;
    const threshold = 96;
    for (let i = 3; i < d.length; i += 4) {
      d[i] = d[i] >= threshold ? 255 : 0;
      d[i - 3] = 255;
      d[i - 2] = 255;
      d[i - 1] = 255;
    }
    octx.clearRect(0, 0, destW, destH);
    octx.putImageData(imgData, 0, 0);
    return off;
  };

  DinoComposer.prototype.eraseUnderFrontLegs = function (ctx, destW, destH, legsImg) {
    const mask = this.buildLegEraseMask(legsImg, destW, destH);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(mask, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  DinoComposer.prototype.drawBodyLayerTo = async function (octx, img, equipped, color, destW, destH, tint) {
    this.drawLayerImage(octx, img, !!tint, color, destW, destH);
    if (!equipped.frontLegs) return;
    const legsSpecies = this.getSpecies(equipped.frontLegs);
    if (!legsSpecies || !legsSpecies.slots || !legsSpecies.slots.frontLegs) return;
    try {
      const legsImg = await this.loadImage(legsSpecies.slots.frontLegs.base);
      this.eraseUnderFrontLegs(octx, destW, destH, legsImg);
    } catch (e) { /* skip */ }
  };

  DinoComposer.prototype.parseColor = function (hex) {
    const h = String(hex || '#2d2d2d').replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16) || 0,
      g: parseInt(h.substring(2, 4), 16) || 0,
      b: parseInt(h.substring(4, 6), 16) || 0,
    };
  };

  DinoComposer.prototype.scaledTileSurface = function (tileImg, destW, pattern) {
    const repeatPx = (pattern && pattern.tileRepeatPx) || 96;
    const scaledRepeat = repeatPx * (destW / 640);
    const tileMax = Math.max(tileImg.naturalWidth, tileImg.naturalHeight, 1);
    const scale = scaledRepeat / tileMax;
    const w = Math.max(1, Math.round(tileImg.naturalWidth * scale));
    const h = Math.max(1, Math.round(tileImg.naturalHeight * scale));
    const scaled = document.createElement('canvas');
    scaled.width = w;
    scaled.height = h;
    scaled.getContext('2d').drawImage(tileImg, 0, 0, w, h);
    return scaled;
  };

  DinoComposer.prototype.fillPatternSource = function (octx, tileImg, destW, destH, pattern) {
    const mode = (pattern && pattern.tileMode) || 'repeat';
    if (mode === 'cover') {
      octx.drawImage(tileImg, 0, 0, destW, destH);
      return;
    }
    const scaledTile = this.scaledTileSurface(tileImg, destW, pattern);
    const tilePat = octx.createPattern(scaledTile, 'repeat');
    if (!tilePat) return;
    octx.fillStyle = tilePat;
    octx.fillRect(0, 0, destW, destH);
  };

  /** Dark pixels become patternColor; light pixels stay transparent so base color shows through. */
  DinoComposer.prototype.colorizeStripePattern = function (canvas, patternColor, pattern) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const c = this.parseColor(patternColor);
    const bgCutoff = (pattern && pattern.bgCutoff != null) ? pattern.bgCutoff : 32;
    const stripeCutoff = (pattern && pattern.stripeCutoff != null) ? pattern.stripeCutoff : 155;
    const strength = (pattern && pattern.colorStrength != null) ? pattern.colorStrength : 0.9;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < bgCutoff) {
        d[i + 3] = 0;
        continue;
      }
      if (lum < stripeCutoff) {
        const t = Math.min(1, (stripeCutoff - lum) / Math.max(1, stripeCutoff - bgCutoff));
        d[i] = c.r;
        d[i + 1] = c.g;
        d[i + 2] = c.b;
        d[i + 3] = Math.round(255 * t * strength);
      } else {
        d[i + 3] = 0;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  };

  /** Line-art textures: only darker strokes become patternColor; light background stays transparent. */
  DinoComposer.prototype.colorizeOutlinePattern = function (canvas, patternColor, pattern) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const c = this.parseColor(patternColor);
    const lineCutoff = (pattern && pattern.lineCutoff != null) ? pattern.lineCutoff : 218;
    const bgCutoff = (pattern && pattern.bgCutoff != null) ? pattern.bgCutoff : 232;
    const strength = (pattern && pattern.colorStrength != null) ? pattern.colorStrength : 0.95;
    const span = Math.max(1, bgCutoff - lineCutoff);

    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (lum >= bgCutoff || d[i + 3] < 8) {
        d[i + 3] = 0;
        continue;
      }
      const t = lum <= lineCutoff ? 1 : (bgCutoff - lum) / span;
      d[i] = c.r;
      d[i + 1] = c.g;
      d[i + 2] = c.b;
      d[i + 3] = Math.round(255 * t * strength);
    }
    ctx.putImageData(imgData, 0, 0);
  };

  /** Transparent PNG line art: non-transparent pixels become patternColor. */
  DinoComposer.prototype.colorizeAlphaLines = function (canvas, patternColor, pattern) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const c = this.parseColor(patternColor);
    const strength = (pattern && pattern.colorStrength != null) ? pattern.colorStrength : 1;

    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a < 8) continue;
      d[i] = c.r;
      d[i + 1] = c.g;
      d[i + 2] = c.b;
      d[i + 3] = Math.round(a * strength);
    }
    ctx.putImageData(imgData, 0, 0);
  };

  /** Tint seamless grayscale textures while keeping surface detail. */
  DinoComposer.prototype.tintPatternTexture = function (canvas, patternColor, pattern) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const c = this.parseColor(patternColor);
    const strength = (pattern && pattern.colorStrength != null) ? pattern.colorStrength : 0.72;

    for (let i = 0; i < d.length; i += 4) {
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      const shade = 0.35 + lum * 0.65;
      d[i] = Math.round(c.r * shade);
      d[i + 1] = Math.round(c.g * shade);
      d[i + 2] = Math.round(c.b * shade);
      d[i + 3] = Math.round(d[i + 3] * strength);
    }
    ctx.putImageData(imgData, 0, 0);
  };

  DinoComposer.prototype.buildPatternLayer = function (tileImg, destW, destH, patternColor, pattern) {
    const off = document.createElement('canvas');
    off.width = destW;
    off.height = destH;
    const octx = off.getContext('2d');
    this.fillPatternSource(octx, tileImg, destW, destH, pattern);
    const colorize = (pattern && pattern.colorize) || 'tint';
    if (colorize === 'stripes') {
      this.colorizeStripePattern(off, patternColor, pattern);
    } else if (colorize === 'outline') {
      this.colorizeOutlinePattern(off, patternColor, pattern);
    } else if (colorize === 'alpha') {
      this.colorizeAlphaLines(off, patternColor, pattern);
    } else {
      this.tintPatternTexture(off, patternColor, pattern);
    }
    return off;
  };

  DinoComposer.prototype.applyTilePattern = function (ctx, maskCanvas, tileImg, patternColor, blend, destW, destH, pattern) {
    const off = this.buildPatternLayer(tileImg, destW, destH, patternColor, pattern);
    const octx = off.getContext('2d');
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = blend || 'source-over';
    ctx.drawImage(off, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  DinoComposer.prototype.applyMaskedOverlay = function (ctx, overlayImg, maskCanvas, blend, destW, destH, tintColor) {
    const off = document.createElement('canvas');
    off.width = destW;
    off.height = destH;
    const octx = off.getContext('2d');
    octx.drawImage(overlayImg, 0, 0, destW, destH);
    if (tintColor) {
      octx.globalCompositeOperation = 'multiply';
      octx.fillStyle = tintColor;
      octx.fillRect(0, 0, destW, destH);
      octx.globalCompositeOperation = 'destination-in';
      octx.drawImage(overlayImg, 0, 0, destW, destH);
    }
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = blend || 'source-over';
    ctx.drawImage(off, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  DinoComposer.prototype.buildAlphaMask = function (sourceCanvas, destW, destH) {
    const mask = document.createElement('canvas');
    mask.width = destW;
    mask.height = destH;
    const mctx = mask.getContext('2d');
    mctx.drawImage(sourceCanvas, 0, 0);
    const imgData = mctx.getImageData(0, 0, destW, destH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = a;
    }
    mctx.putImageData(imgData, 0, 0);
    return mask;
  };

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} equipped - slot -> speciesId
   * @param {{ tint?: boolean, color?: string, pattern?: object, patternColor?: string, destW?: number, destH?: number }} opts
   */
  DinoComposer.prototype.render = async function (ctx, equipped, opts) {
    if (!this.catalog) return;
    const tint = opts && opts.tint;
    const color = (opts && opts.color) || '#4a8c3f';
    const pattern = opts && opts.pattern;
    const patternColor = (opts && opts.patternColor) || '#2d2d2d';
    const destW = (opts && opts.destW) || ctx.canvas.width;
    const destH = (opts && opts.destH) || ctx.canvas.height;
    const order = this.catalog.layerOrder || ['tail', 'body', 'backLegs', 'head', 'frontLegs'];

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const baseLayer = document.createElement('canvas');
    baseLayer.width = destW;
    baseLayer.height = destH;
    const baseCtx = baseLayer.getContext('2d');

    const partMasks = {};
    let bodyMaskCanvas = null;
    let tileImg = null;
    let overlayImg = null;
    let accessoryImg = null;

    if (pattern && pattern.type === 'tile' && pattern.path) {
      try { tileImg = await this.loadImage(pattern.path); } catch (e) { /* skip */ }
    }
    const patternPerPart = tileImg && tint && (!pattern || pattern.applyScope !== 'full');
    if (pattern && pattern.type === 'overlay' && pattern.path) {
      try { overlayImg = await this.loadImage(pattern.path); } catch (e) { /* skip */ }
    }
    if (pattern && pattern.type === 'body-accessory' && pattern.path) {
      try { accessoryImg = await this.loadImage(pattern.path); } catch (e) { /* skip */ }
    }

    for (let i = 0; i < order.length; i++) {
      const slot = order[i];
      const speciesId = equipped[slot];
      if (!speciesId) continue;
      const species = this.getSpecies(speciesId);
      if (!species || !species.slots || !species.slots[slot]) continue;
      const part = species.slots[slot];
      try {
        const img = await this.loadImage(part.base);
        const partCanvas = document.createElement('canvas');
        partCanvas.width = destW;
        partCanvas.height = destH;
        const partCtx = partCanvas.getContext('2d');

        if (slot === 'body') {
          await this.drawBodyLayerTo(partCtx, img, equipped, color, destW, destH, tint);
        } else if (tint) {
          this.drawLayerImage(partCtx, img, true, color, destW, destH);
        } else {
          partCtx.drawImage(img, 0, 0, destW, destH);
        }

        if (patternPerPart) {
          const alphaMask = this.buildAlphaMask(partCanvas, destW, destH);
          this.applyTilePattern(
            partCtx, alphaMask, tileImg, patternColor, pattern.blend || 'source-over', destW, destH, pattern
          );
        }

        partMasks[slot] = partCanvas;
        if (slot === 'body') bodyMaskCanvas = partCanvas;
        baseCtx.drawImage(partCanvas, 0, 0);
      } catch (e) { /* skip missing */ }
    }

    if (tileImg && tint && pattern && pattern.applyScope === 'full') {
      const silMask = this.buildAlphaMask(baseLayer, destW, destH);
      this.applyTilePattern(
        baseCtx, silMask, tileImg, patternColor, pattern.blend || 'source-over', destW, destH, pattern
      );
    }

    for (let j = 0; j < order.length; j++) {
      const slot = order[j];
      const speciesId = equipped[slot];
      if (!speciesId) continue;
      const species = this.getSpecies(speciesId);
      if (!species || !species.slots || !species.slots[slot]) continue;
      const det = species.slots[slot].details;
      if (!det) continue;
      try {
        const detImg = await this.loadImage(det);
        baseCtx.drawImage(detImg, 0, 0, destW, destH);
      } catch (e) { /* skip */ }
    }

    if (overlayImg) {
      const silMask = this.buildAlphaMask(baseLayer, destW, destH);
      const overlayTint = pattern.tintOverlay ? patternColor : null;
      this.applyMaskedOverlay(
        baseCtx, overlayImg, silMask, pattern.blend || 'source-over', destW, destH, overlayTint
      );
    }

    if (accessoryImg && bodyMaskCanvas) {
      const bodyAlpha = this.buildAlphaMask(bodyMaskCanvas, destW, destH);
      const accTint = pattern.tintOverlay ? patternColor : null;
      this.applyMaskedOverlay(
        baseCtx, accessoryImg, bodyAlpha, pattern.blend || 'source-over', destW, destH, accTint
      );
    }

    ctx.drawImage(baseLayer, 0, 0);
  };

  DinoComposer.prototype.allParts = function () {
    const out = [];
    if (!this.catalog) return out;
    (this.catalog.species || []).forEach(function (sp) {
      const slots = sp.onlySlots || Object.keys(sp.slots || {});
      slots.forEach(function (slot) {
        if (!sp.slots[slot]) return;
        out.push({
          id: sp.id + ':' + slot,
          species: sp.id,
          speciesLabel: sp.label,
          slot: slot,
          base: sp.slots[slot].base,
        });
      });
    });
    return out;
  };

  DinoComposer.prototype.randomPart = function (excludeIds) {
    const pool = this.allParts().filter(function (p) {
      return !excludeIds || excludeIds.indexOf(p.id) < 0;
    });
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  global.DinoComposer = DinoComposer;
})(typeof window !== 'undefined' ? window : this);
