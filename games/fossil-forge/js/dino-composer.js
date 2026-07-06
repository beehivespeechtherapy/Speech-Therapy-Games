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
    this.accessoriesVersion = null;
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

  DinoComposer.prototype.setAccessoriesVersion = function (version) {
    this.accessoriesVersion = version != null ? String(version) : null;
  };

  DinoComposer.prototype.getCacheBustVersion = function (relativePath) {
    if (relativePath && relativePath.indexOf('Patterns/Accessories/') >= 0 && this.accessoriesVersion) {
      return this.accessoriesVersion;
    }
    return this.getAssetVersion();
  };

  DinoComposer.prototype.loadImage = function (relativePath) {
    const url = this.resolvePath(relativePath);
    const busted = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + this.getCacheBustVersion(relativePath);
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

  DinoComposer.prototype.applyMaskedOverlay = function (ctx, overlayImg, maskCanvas, blend, destW, destH, pattern, patternColor) {
    const off = document.createElement('canvas');
    off.width = destW;
    off.height = destH;
    const octx = off.getContext('2d');
    if (pattern && pattern.colorize === 'alpha' && patternColor) {
      octx.drawImage(this.buildPatternLayer(overlayImg, destW, destH, patternColor, pattern), 0, 0);
    } else {
      octx.drawImage(overlayImg, 0, 0, destW, destH);
      if (pattern && pattern.tintOverlay && patternColor) {
        octx.globalCompositeOperation = 'multiply';
        octx.fillStyle = patternColor;
        octx.fillRect(0, 0, destW, destH);
        octx.globalCompositeOperation = 'destination-in';
        octx.drawImage(overlayImg, 0, 0, destW, destH);
      }
    }
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = blend || 'source-over';
    ctx.drawImage(off, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  DinoComposer.prototype.getImageContentBBox = function (img, alphaThreshold) {
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    if (!w || !h) return null;
    const off = document.createElement('canvas');
    off.width = w;
    off.height = h;
    const octx = off.getContext('2d');
    octx.drawImage(img, 0, 0);
    const data = octx.getImageData(0, 0, w, h).data;
    const cutoff = alphaThreshold != null ? alphaThreshold : 24;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[(y * w + x) * 4 + 3] >= cutoff) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    if (maxX < minX || maxY < minY) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  };

  DinoComposer.prototype.accessoryPathCandidates = function (fileBase, speciesId, accessory) {
    const sp = this.getSpecies(speciesId);
    const suffixes = [];
    if (speciesId === 't-rex') {
      suffixes.push('T-Rex', 't-Rex');
    }
    suffixes.push(speciesId);
    if (sp && sp.label) suffixes.push(sp.label);
    const seen = {};
    const paths = [];
    suffixes.forEach(function (s) {
      if (!s || seen[s]) return;
      seen[s] = true;
      paths.push('Patterns/Accessories/' + fileBase + ' ' + s + '.png');
    });
    paths.push('Patterns/Accessories/' + fileBase + '.png');
    const fallbackBase = accessory && accessory.fallbackFileBase;
    if (fallbackBase && fallbackBase !== fileBase) {
      paths.push('Patterns/Accessories/' + fallbackBase + '.png');
    }
    return paths;
  };

  DinoComposer.prototype.rainBootsAvailable = function (equipped) {
    return !!(equipped.frontLegs || equipped.backLegs);
  };

  DinoComposer.prototype.hasPterodactylTailBoots = function (equipped, accessory) {
    const tailBootsFor = (accessory && accessory.tailBootsFor) || ['pterodactyl'];
    return !!(equipped.tail && tailBootsFor.indexOf(equipped.tail) >= 0);
  };

  DinoComposer.prototype.resolveAccessorySpeciesId = function (equipped, accessory) {
    if (accessory && accessory.id === 'rain-boot') {
      const fallbacks = ['backLegs', 'frontLegs', 'head', 'body', 'tail'];
      for (let i = 0; i < fallbacks.length; i++) {
        if (equipped[fallbacks[i]]) return equipped[fallbacks[i]];
      }
      return null;
    }
    const slot = (accessory && accessory.slot) || 'head';
    const fallbacks = [slot, 'head', 'body', 'tail', 'frontLegs', 'backLegs'];
    for (let i = 0; i < fallbacks.length; i++) {
      if (equipped[fallbacks[i]]) return equipped[fallbacks[i]];
    }
    return null;
  };

  DinoComposer.prototype.appendRainBootImages = async function (images, accessory, speciesId) {
    const dualBootsFor = accessory.dualBootsFor || ['brachiosaurus', 'stegosaurus', 'triceratops'];
    if (dualBootsFor.indexOf(speciesId) >= 0) {
      const frontImg = await this.loadFirstExistingImage(
        this.dualBootPathCandidates(accessory.fileBase, speciesId, 'front')
      );
      const backImg = await this.loadFirstExistingImage(
        this.dualBootPathCandidates(accessory.fileBase, speciesId, 'back')
      );
      if (frontImg) images.push(frontImg);
      if (backImg) images.push(backImg);
    } else {
      const singleImg = await this.loadFirstExistingImage(
        this.accessoryPathCandidates(accessory.fileBase, speciesId, accessory)
      );
      if (singleImg) images.push(singleImg);
    }
  };

  DinoComposer.prototype.dualBootPathCandidates = function (fileBase, speciesId, leg) {
    const sp = this.getSpecies(speciesId);
    const suffixes = [];
    if (speciesId === 't-rex') {
      suffixes.push('T-Rex', 't-Rex');
    }
    suffixes.push(speciesId);
    if (sp && sp.label) suffixes.push(sp.label);
    const seen = {};
    const paths = [];
    suffixes.forEach(function (s) {
      if (!s || seen[s]) return;
      seen[s] = true;
      paths.push('Patterns/Accessories/' + fileBase + ' ' + s + ' ' + leg + '.png');
    });
    return paths;
  };

  DinoComposer.prototype.loadFirstExistingImage = async function (relativePaths) {
    for (let i = 0; i < relativePaths.length; i++) {
      const relativePath = relativePaths[i];
      const url = this.resolvePath(relativePath);
      const busted = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'v=' + this.getCacheBustVersion(relativePath);
      if (this.cache.has(busted)) {
        try {
          return await this.cache.get(busted);
        } catch (e) {
          this.cache.delete(busted);
        }
      }
      try {
        const img = await new Promise(function (resolve, reject) {
          const a = new Image();
          a.onload = function () { resolve(a); };
          a.onerror = function () { reject(new Error('missing')); };
          a.src = busted;
        });
        const cached = Promise.resolve(img);
        this.cache.set(busted, cached);
        return img;
      } catch (e) { /* try next */ }
    }
    return null;
  };

  /** Grayscale accessory art: tint fills while keeping dark outlines and light highlights. */
  DinoComposer.prototype.colorizeAccessory = function (canvas, accessoryColor, opts) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const c = this.parseColor(accessoryColor);
    const minShade = (opts && opts.minShade != null) ? opts.minShade : 0.42;
    const maxShade = (opts && opts.maxShade != null) ? opts.maxShade : 1.0;
    const lineCutoff = (opts && opts.lineCutoff != null) ? opts.lineCutoff : 0.18;

    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3];
      if (a < 8) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = 0;
        continue;
      }
      const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
      const preserveAlpha = opts && opts.preserveAlpha;

      if (lum <= lineCutoff) {
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        if (!preserveAlpha) d[i + 3] = 255;
        continue;
      }

      const shade = minShade + lum * (maxShade - minShade);
      d[i] = Math.round(c.r * shade);
      d[i + 1] = Math.round(c.g * shade);
      d[i + 2] = Math.round(c.b * shade);
      if (!preserveAlpha) d[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  };

  /** Accessory PNGs often use faint alpha; make every visible pixel fully opaque. */
  DinoComposer.prototype.solidifyAccessoryAlpha = function (canvas, minAlpha) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const d = imgData.data;
    const cutoff = minAlpha != null ? minAlpha : 1;

    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] >= cutoff) d[i + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  };

  DinoComposer.prototype.buildAccessoryLayer = function (accImg, destW, destH, accessoryColor, accessory) {
    const off = document.createElement('canvas');
    off.width = destW;
    off.height = destH;
    const octx = off.getContext('2d');
    octx.drawImage(accImg, 0, 0, destW, destH);
    const colorize = accessory && accessory.colorize !== false;
    const preserveAlpha = accessory && accessory.preserveAlpha;
    const shouldSolidify = !preserveAlpha && (!accessory || accessory.solidify !== false);

    if (colorize && accessoryColor) {
      this.colorizeAccessory(off, accessoryColor, { preserveAlpha: preserveAlpha });
    }
    if (shouldSolidify) {
      this.solidifyAccessoryAlpha(off, 1);
    }
    return off;
  };

  DinoComposer.prototype.buildAccessoryEraseMask = function (accImg, destW, destH) {
    const off = document.createElement('canvas');
    off.width = destW;
    off.height = destH;
    const octx = off.getContext('2d');
    octx.drawImage(accImg, 0, 0, destW, destH);
    const imgData = octx.getImageData(0, 0, destW, destH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 8) {
        d[i + 3] = 0;
        continue;
      }
      d[i] = 255;
      d[i + 1] = 255;
      d[i + 2] = 255;
      d[i + 3] = 255;
    }
    octx.putImageData(imgData, 0, 0);
    return off;
  };

  DinoComposer.prototype.eraseUnderAccessoryMask = function (ctx, maskCanvas) {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.drawImage(maskCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
  };

  DinoComposer.prototype.drawAccessoryImage = function (ctx, accessoryLayer) {
    ctx.drawImage(accessoryLayer, 0, 0);
  };

  DinoComposer.prototype.drawAccessoryImages = async function (
    ctx, equipped, accessory, accessoryColor, destW, destH, images
  ) {
    const self = this;
    for (let i = 0; i < images.length; i++) {
      const accImg = images[i];
      if (!accImg) continue;
      const layer = self.buildAccessoryLayer(accImg, destW, destH, accessoryColor, accessory);
      const shouldErase = accessory.eraseUnder !== false && !accessory.preserveAlpha;
      if (shouldErase) {
        const mask = self.buildAccessoryEraseMask(accImg, destW, destH);
        self.eraseUnderAccessoryMask(ctx, mask);
      }
      self.drawAccessoryImage(ctx, layer);
    }
  };

  DinoComposer.prototype.drawRainBoots = async function (
    ctx, equipped, accessory, accessoryColor, destW, destH
  ) {
    if (!this.rainBootsAvailable(equipped)) return;
    const images = [];
    const loadedSpecies = {};
    const legSpecies = [];

    if (equipped.frontLegs) legSpecies.push(equipped.frontLegs);
    if (equipped.backLegs) legSpecies.push(equipped.backLegs);

    for (let i = 0; i < legSpecies.length; i++) {
      const speciesId = legSpecies[i];
      if (loadedSpecies[speciesId]) continue;
      loadedSpecies[speciesId] = true;
      await this.appendRainBootImages(images, accessory, speciesId);
    }

    if (this.hasPterodactylTailBoots(equipped, accessory)) {
      await this.appendRainBootImages(images, accessory, equipped.tail);
    }

    await this.drawAccessoryImages(ctx, equipped, accessory, accessoryColor, destW, destH, images);
  };

  DinoComposer.prototype.drawEquippedAccessory = async function (ctx, equipped, accessory, accessoryColor, destW, destH) {
    if (!accessory || !accessory.fileBase) return;
    if (accessory.id === 'rain-boot') {
      await this.drawRainBoots(ctx, equipped, accessory, accessoryColor, destW, destH);
      return;
    }
    const speciesId = this.resolveAccessorySpeciesId(equipped, accessory);
    if (!speciesId) return;
    const paths = this.accessoryPathCandidates(accessory.fileBase, speciesId, accessory);
    const accImg = await this.loadFirstExistingImage(paths);
    if (!accImg) return;
    await this.drawAccessoryImages(ctx, equipped, accessory, accessoryColor, destW, destH, [accImg]);
  };

  DinoComposer.prototype.slotsHiddenByAccessory = function (accessory, equipped) {
    if (!accessory || !accessory.fileBase || accessory.id !== 'rain-boot') return [];
    const dualBootsFor = accessory.dualBootsFor || ['brachiosaurus', 'stegosaurus', 'triceratops'];
    const hidden = [];
    if (equipped.frontLegs && dualBootsFor.indexOf(equipped.frontLegs) >= 0) {
      hidden.push('frontLegs');
    }
    if (equipped.backLegs && dualBootsFor.indexOf(equipped.backLegs) >= 0) {
      hidden.push('backLegs');
    }
    return hidden;
  };

  DinoComposer.prototype.drawSlotDetails = async function (ctx, equipped, slot, destW, destH) {
    const speciesId = equipped[slot];
    if (!speciesId) return;
    const species = this.getSpecies(speciesId);
    if (!species || !species.slots || !species.slots[slot]) return;
    const det = species.slots[slot].details;
    if (!det) return;
    try {
      const detImg = await this.loadImage(det);
      ctx.drawImage(detImg, 0, 0, destW, destH);
    } catch (e) { /* skip */ }
  };

  DinoComposer.prototype.drawAllDetailsExcept = async function (ctx, equipped, order, skipSlots, destW, destH) {
    const skipList = Array.isArray(skipSlots) ? skipSlots : (skipSlots ? [skipSlots] : []);
    for (let j = 0; j < order.length; j++) {
      const slot = order[j];
      if (skipList.indexOf(slot) >= 0) continue;
      await this.drawSlotDetails(ctx, equipped, slot, destW, destH);
    }
  };

  DinoComposer.prototype.applyPartPattern = function (partCtx, partCanvas, renderOpts) {
    const pattern = renderOpts.pattern;
    const tint = renderOpts.tint;
    if (!tint || !pattern) return;
    const destW = renderOpts.destW;
    const destH = renderOpts.destH;
    const patternColor = renderOpts.patternColor;
    const tileImg = renderOpts.tileImg;
    const overlayImg = renderOpts.overlayImg;
    const patternPerPart = renderOpts.patternPerPart;
    const alphaMask = this.buildAlphaMask(partCanvas, destW, destH);

    if (pattern.type === 'tile' && tileImg && (patternPerPart || pattern.applyScope === 'full')) {
      this.applyTilePattern(
        partCtx, alphaMask, tileImg, patternColor, pattern.blend || 'source-over', destW, destH, pattern
      );
    } else if (pattern.type === 'overlay' && overlayImg) {
      this.applyMaskedOverlay(
        partCtx, overlayImg, alphaMask, pattern.blend || 'source-over', destW, destH, pattern, patternColor
      );
    }
  };

  DinoComposer.prototype.slotsRedrawnOnTop = function () {
    return ['backLegs', 'tail', 'head', 'frontLegs'];
  };

  DinoComposer.prototype.drawSlotLayerOnTop = async function (ctx, equipped, slot, renderOpts) {
    const speciesId = equipped[slot];
    if (!speciesId) return;
    const species = this.getSpecies(speciesId);
    if (!species || !species.slots || !species.slots[slot]) return;
    const tint = renderOpts.tint;
    const color = renderOpts.color;
    const pattern = renderOpts.pattern;
    const patternColor = renderOpts.patternColor;
    const tileImg = renderOpts.tileImg;
    const patternPerPart = renderOpts.patternPerPart;
    const destW = renderOpts.destW;
    const destH = renderOpts.destH;
    try {
      const img = await this.loadImage(species.slots[slot].base);
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

      this.applyPartPattern(partCtx, partCanvas, renderOpts);

      ctx.drawImage(partCanvas, 0, 0);
    } catch (e) { /* skip */ }
  };

  DinoComposer.prototype.drawSlotOutlineOnTop = async function (ctx, equipped, slot, destW, destH) {
    const speciesId = equipped[slot];
    if (!speciesId) return;
    const species = this.getSpecies(speciesId);
    if (!species || !species.slots || !species.slots[slot]) return;
    try {
      const img = await this.loadImage(species.slots[slot].base);
      const outline = this.buildOutlineMask(img, destW, destH);
      ctx.drawImage(outline, 0, 0);
    } catch (e) { /* skip */ }
  };

  DinoComposer.prototype.buildOutlineMask = function (img, destW, destH, lumCutoff) {
    const off = document.createElement('canvas');
    off.width = destW;
    off.height = destH;
    const octx = off.getContext('2d');
    octx.drawImage(img, 0, 0, destW, destH);
    const imgData = octx.getImageData(0, 0, destW, destH);
    const d = imgData.data;
    const cutoff = lumCutoff || 88;

    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      if (d[i + 3] < 16 || lum > cutoff) {
        d[i + 3] = 0;
      } else {
        const weight = Math.min(1, (cutoff - lum) / cutoff + 0.25);
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
        d[i + 3] = Math.round(d[i + 3] * weight);
      }
    }
    octx.putImageData(imgData, 0, 0);
    return off;
  };

  DinoComposer.prototype.redrawSlotOnTop = async function (ctx, equipped, slot, renderOpts) {
    if (!equipped[slot]) return;
    await this.drawSlotLayerOnTop(ctx, equipped, slot, renderOpts);
    if (renderOpts.tint) {
      await this.drawSlotOutlineOnTop(ctx, equipped, slot, renderOpts.destW, renderOpts.destH);
    }
  };

  DinoComposer.prototype.drawEquippedOutlines = async function (ctx, equipped, destW, destH, skipSlots) {
    const order = this.catalog.layerOrder || ['tail', 'body', 'backLegs', 'head', 'frontLegs'];
    const hidden = skipSlots || [];
    const onTop = this.slotsRedrawnOnTop();

    for (let i = 0; i < order.length; i++) {
      const slot = order[i];
      if (hidden.indexOf(slot) >= 0 || onTop.indexOf(slot) >= 0) continue;
      const speciesId = equipped[slot];
      if (!speciesId) continue;
      const species = this.getSpecies(speciesId);
      if (!species || !species.slots || !species.slots[slot]) continue;
      try {
        const img = await this.loadImage(species.slots[slot].base);
        const outline = this.buildOutlineMask(img, destW, destH);
        ctx.drawImage(outline, 0, 0);
      } catch (e) { /* skip */ }
    }
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
    const accessory = opts && opts.accessory;
    const accessoryColor = (opts && opts.accessoryColor) || patternColor;
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

    if (pattern && pattern.type === 'tile' && pattern.path) {
      try { tileImg = await this.loadImage(pattern.path); } catch (e) { /* skip */ }
    }
    const patternPerPart = tileImg && tint && (!pattern || pattern.applyScope !== 'full');
    if (pattern && pattern.type === 'overlay' && pattern.path) {
      try { overlayImg = await this.loadImage(pattern.path); } catch (e) { /* skip */ }
    }

    const hiddenSlots = this.slotsHiddenByAccessory(accessory, equipped);

    for (let i = 0; i < order.length; i++) {
      const slot = order[i];
      if (hiddenSlots.indexOf(slot) >= 0) continue;
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

        if (patternPerPart || (overlayImg && tint && pattern && pattern.type === 'overlay')) {
          this.applyPartPattern(partCtx, partCanvas, {
            tint: tint,
            pattern: pattern,
            patternColor: patternColor,
            tileImg: tileImg,
            overlayImg: overlayImg,
            patternPerPart: patternPerPart,
            destW: destW,
            destH: destH,
          });
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


    const slotRenderOpts = {
      tint: tint,
      color: color,
      pattern: pattern,
      patternColor: patternColor,
      tileImg: tileImg,
      overlayImg: overlayImg,
      patternPerPart: patternPerPart,
      destW: destW,
      destH: destH,
    };

    if (tint) {
      await this.drawEquippedOutlines(baseCtx, equipped, destW, destH, hiddenSlots);
    }

    const accessorySlot = (accessory && accessory.fileBase) ? (accessory.slot || 'head') : null;
    const headAccessory = accessorySlot === 'head';
    const detailsSkip = this.slotsRedrawnOnTop().concat(hiddenSlots);

    await this.drawAllDetailsExcept(
      baseCtx, equipped, order, detailsSkip, destW, destH
    );

    const onTopSlots = this.slotsRedrawnOnTop();
    for (let s = 0; s < onTopSlots.length; s++) {
      const slot = onTopSlots[s];
      if (hiddenSlots.indexOf(slot) >= 0) continue;
      if (!equipped[slot]) continue;
      await this.redrawSlotOnTop(baseCtx, equipped, slot, slotRenderOpts);
      await this.drawSlotDetails(baseCtx, equipped, slot, destW, destH);
    }

    if (headAccessory && accessory) {
      await this.drawEquippedAccessory(baseCtx, equipped, accessory, accessoryColor, destW, destH);
    }

    if (accessory && !headAccessory) {
      await this.drawEquippedAccessory(baseCtx, equipped, accessory, accessoryColor, destW, destH);
      const pteroTailBoots = accessory.id === 'rain-boot'
        && this.hasPterodactylTailBoots(equipped, accessory);
      if (accessory.slot === 'frontLegs' && equipped.tail && !pteroTailBoots) {
        await this.redrawSlotOnTop(baseCtx, equipped, 'tail', slotRenderOpts);
        await this.drawSlotDetails(baseCtx, equipped, 'tail', destW, destH);
      }
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
