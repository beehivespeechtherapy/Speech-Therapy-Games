/**
 * Stack aligned creature parts at origin.
 * Per-slot layers: fill → details → custom → outline. Wing/fin overlays draw over back legs.
 */
(function (global) {
  'use strict';

  var PARTS_ASSET_VERSION = '6';
  var SLOT_LAYER_ORDER = ['fill', 'details', 'custom', 'outline'];

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

    if (global.__MYTHIC_MIXUP_CATALOG_EMBED__) {
      this.catalog = global.__MYTHIC_MIXUP_CATALOG_EMBED__;
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
        'Open Mythic Mix-Up through a local web server (not by double-clicking the file). ' +
        'Double-click Open Mythic Mix-Up.command in Finder, then use the browser tab it opens.'
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
    if (relativePath && relativePath.indexOf('Accessories/') >= 0 && this.accessoriesVersion) {
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

  DinoComposer.prototype.speciesHasWings = function (speciesId) {
    const species = this.getSpecies(speciesId);
    return !!(species && species.slots && species.slots.wings);
  };

  DinoComposer.prototype.withAutoWings = function (equipped) {
    const out = {};
    const src = equipped || {};
    Object.keys(src).forEach(function (key) {
      if (key !== 'wings') out[key] = src[key];
    });
    if (out.body && this.speciesHasWings(out.body)) out.wings = out.body;
    return out;
  };

  DinoComposer.prototype.getContentBounds = function (img) {
    const b = this.catalog && this.catalog.contentBounds;
    if (b && b.w && b.h) return b;
    const w = img && (img.naturalWidth || img.width);
    const h = img && (img.naturalHeight || img.height);
    return { x: 0, y: 0, w: w || 1, h: h || 1 };
  };

  DinoComposer.prototype.drawImageNatural = function (ctx, img, destW, destH) {
    const src = this.getContentBounds(img);
    const scale = Math.min(destW / src.w, destH / src.h);
    const w = Math.max(1, Math.round(src.w * scale));
    const h = Math.max(1, Math.round(src.h * scale));
    const x = Math.round((destW - w) / 2);
    const y = Math.round((destH - h) / 2);
    ctx.drawImage(img, src.x, src.y, src.w, src.h, x, y, w, h);
  };

  DinoComposer.prototype.drawTinted = function (ctx, img, color, destW, destH) {
    const off = document.createElement('canvas');
    off.width = destW;
    off.height = destH;
    const octx = off.getContext('2d');
    this.drawImageNatural(octx, img, destW, destH);
    octx.globalCompositeOperation = 'multiply';
    octx.fillStyle = color;
    octx.fillRect(0, 0, destW, destH);
    octx.globalCompositeOperation = 'destination-in';
    this.drawImageNatural(octx, img, destW, destH);
    ctx.drawImage(off, 0, 0);
  };

  DinoComposer.prototype.drawLayerImage = function (ctx, img, tint, color, destW, destH) {
    if (tint) this.drawTinted(ctx, img, color, destW, destH);
    else this.drawImageNatural(ctx, img, destW, destH);
  };

  DinoComposer.prototype.drawTintedToCanvas = function (destCanvas, img, color, destW, destH) {
    const octx = destCanvas.getContext('2d');
    octx.clearRect(0, 0, destW, destH);
    this.drawLayerImage(octx, img, true, color, destW, destH);
  };

  DinoComposer.prototype.kindUsesTint = function (kind) {
    return kind === 'fill' || kind === 'custom';
  };

  DinoComposer.prototype.colorForKind = function (kind, renderOpts) {
    if (kind === 'custom') return renderOpts.customColor || renderOpts.color;
    return renderOpts.color;
  };

  DinoComposer.prototype.parseColor = function (hex) {
    const h = String(hex || '#2d2d2d').replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16) || 0,
      g: parseInt(h.substring(2, 4), 16) || 0,
      b: parseInt(h.substring(4, 6), 16) || 0,
    };
  };

  DinoComposer.prototype.safeGetImageData = function (ctx, w, h) {
    try {
      return ctx.getImageData(0, 0, w, h);
    } catch (e) {
      return null;
    }
  };

  DinoComposer.prototype.fillKeepingAlpha = function (ctx, color, w, h) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color || '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  };

  DinoComposer.prototype.multiplyTintKeepingAlpha = function (canvas, color) {
    const w = canvas.width;
    const h = canvas.height;
    const copy = document.createElement('canvas');
    copy.width = w;
    copy.height = h;
    copy.getContext('2d').drawImage(canvas, 0, 0);
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(copy, 0, 0);
    ctx.restore();
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
    const imgData = this.safeGetImageData(ctx, w, h);
    if (!imgData) {
      this.fillKeepingAlpha(ctx, patternColor, w, h);
      return;
    }
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
    const imgData = this.safeGetImageData(ctx, w, h);
    if (!imgData) {
      this.fillKeepingAlpha(ctx, patternColor, w, h);
      return;
    }
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
    const imgData = this.safeGetImageData(ctx, w, h);
    if (!imgData) {
      this.fillKeepingAlpha(ctx, patternColor, w, h);
      return;
    }
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
    const imgData = this.safeGetImageData(ctx, w, h);
    if (!imgData) {
      this.multiplyTintKeepingAlpha(canvas, patternColor);
      return;
    }
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
    const imgData = this.safeGetImageData(octx, w, h);
    if (!imgData) return null;
    const data = imgData.data;
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

  DinoComposer.prototype.getCanvasContentBBox = function (canvas, alphaThreshold) {
    const w = canvas && canvas.width;
    const h = canvas && canvas.height;
    if (!w || !h) return null;
    const ctx = canvas.getContext('2d');
    const imgData = this.safeGetImageData(ctx, w, h);
    if (!imgData) return null;
    const data = imgData.data;
    const cutoff = alphaThreshold != null ? alphaThreshold : 16;
    const step = w * h > 400000 ? 2 : 1;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < h; y += step) {
      for (let x = 0; x < w; x += step) {
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

  DinoComposer.prototype.speciesPathSuffixes = function (speciesId) {
    const sp = this.getSpecies(speciesId);
    const suffixes = [];
    suffixes.push(speciesId);
    if (sp && sp.label) suffixes.push(sp.label);
    const seen = {};
    return suffixes.filter(function (s) {
      if (!s || seen[s]) return false;
      seen[s] = true;
      return true;
    });
  };

  DinoComposer.prototype.accessoryPathCandidates = function (fileBase, speciesId, accessory) {
    const paths = [];
    this.speciesPathSuffixes(speciesId).forEach(function (s) {
      paths.push('Accessories/' + fileBase + ' ' + s + '.png');
    });
    paths.push('Accessories/' + fileBase + '.png');
    const fallbackBase = accessory && accessory.fallbackFileBase;
    if (fallbackBase && fallbackBase !== fileBase) {
      paths.push('Accessories/' + fallbackBase + '.png');
    }
    return paths;
  };

  DinoComposer.prototype.tailHatPathCandidates = function (fileBase, speciesId) {
    const paths = [];
    this.speciesPathSuffixes(speciesId).forEach(function (s) {
      paths.push('Accessories/' + fileBase + ' ' + s + ' Tail.png');
    });
    return paths;
  };

  DinoComposer.prototype.rainBootsAvailable = function (equipped) {
    return !!(equipped.frontLegs || equipped.backLegs);
  };

  DinoComposer.prototype.shoesAvailable = function (equipped, accessory) {
    if (!this.rainBootsAvailable(equipped)) return false;
    const dual = (accessory && accessory.dualBootsFor) || [];
    if (!dual.length) return true;
    const legSpecies = [equipped.frontLegs, equipped.backLegs].filter(Boolean);
    return legSpecies.some(function (id) { return dual.indexOf(id) >= 0; });
  };

  DinoComposer.prototype.hasCustomParts = function (equipped) {
    equipped = this.withAutoWings(equipped);
    if (!equipped) return false;
    const slots = Object.keys(equipped);
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const part = this.partForSlot(equipped, slot);
      if (!part) continue;
      if (part.custom) return true;
      const overlays = part.overlays || [];
      for (let o = 0; o < overlays.length; o++) {
        if (overlays[o] && overlays[o].kind === 'custom') return true;
      }
    }
    return false;
  };

  DinoComposer.prototype.hasPterodactylTailBoots = function (equipped, accessory) {
    const tailBootsFor = (accessory && accessory.tailBootsFor) || [];
    return !!(equipped.tail && tailBootsFor.indexOf(equipped.tail) >= 0);
  };

  DinoComposer.prototype.resolveAccessorySpeciesId = function (equipped, accessory) {
    if (accessory && (accessory.dualBootsFor || accessory.exclusiveGroup === 'shoes')) {
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

  DinoComposer.prototype.appendRainBootImages = async function (images, accessory, speciesId, side) {
    if (!speciesId) return null;
    const wantedSide = side || 'front';
    const dualImg = await this.loadFirstExistingImage(
      this.dualBootPathCandidates(accessory.fileBase, speciesId, wantedSide)
    );
    if (dualImg) {
      images.push(dualImg);
      return 'dual';
    }
    const singleImg = await this.loadFirstExistingImage(
      this.accessoryPathCandidates(accessory.fileBase, speciesId, accessory)
    );
    if (singleImg) {
      images.push(singleImg);
      return 'single';
    }
    return null;
  };

  DinoComposer.prototype.dualBootPathCandidates = function (fileBase, speciesId, leg) {
    const paths = [];
    this.speciesPathSuffixes(speciesId).forEach(function (s) {
      paths.push('Accessories/' + fileBase + ' ' + s + ' (' + leg + ').png');
      paths.push('Accessories/' + fileBase + ' ' + s + ' ' + leg + '.png');
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
    const imgData = this.safeGetImageData(ctx, w, h);
    if (!imgData) {
      this.multiplyTintKeepingAlpha(canvas, accessoryColor);
      return;
    }
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
    const imgData = this.safeGetImageData(ctx, w, h);
    if (!imgData) return;
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
    this.drawImageNatural(octx, accImg, destW, destH);
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
    this.drawImageNatural(octx, accImg, destW, destH);
    this.fillKeepingAlpha(octx, '#ffffff', destW, destH);
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
    const loadedKeys = {};
    const self = this;

    async function addLeg(speciesId, side) {
      if (!speciesId) return;
      const sideKey = speciesId + ':' + side;
      const singleKey = speciesId + ':single';
      if (loadedKeys[sideKey] || loadedKeys[singleKey]) return;
      const kind = await self.appendRainBootImages(images, accessory, speciesId, side);
      if (kind === 'single') loadedKeys[singleKey] = true;
      if (kind) loadedKeys[sideKey] = true;
    }

    await addLeg(equipped.frontLegs, 'front');
    await addLeg(equipped.backLegs, 'back');

    if (this.hasPterodactylTailBoots(equipped, accessory)) {
      await this.appendRainBootImages(images, accessory, equipped.tail, 'front');
    }

    await this.drawAccessoryImages(ctx, equipped, accessory, accessoryColor, destW, destH, images);
  };

  DinoComposer.prototype.drawEquippedAccessory = async function (ctx, equipped, accessory, accessoryColor, destW, destH) {
    if (!accessory || !accessory.fileBase) return;
    if (accessory.dualBootsFor || accessory.exclusiveGroup === 'shoes') {
      await this.drawRainBoots(ctx, equipped, accessory, accessoryColor, destW, destH);
      return;
    }
    const speciesId = this.resolveAccessorySpeciesId(equipped, accessory);
    if (!speciesId) return;
    const images = [];
    const accImg = await this.loadFirstExistingImage(
      this.accessoryPathCandidates(accessory.fileBase, speciesId, accessory)
    );
    if (accImg) images.push(accImg);
    const tailHatsFor = accessory.tailHatsFor || [];
    if (equipped.tail && tailHatsFor.indexOf(equipped.tail) >= 0) {
      const tailHat = await this.loadFirstExistingImage(
        this.tailHatPathCandidates(accessory.fileBase, equipped.tail)
      );
      if (tailHat) images.push(tailHat);
    }
    if (!images.length) return;
    await this.drawAccessoryImages(ctx, equipped, accessory, accessoryColor, destW, destH, images);
  };

  DinoComposer.prototype.sortAccessories = function (accessories) {
    return (accessories || []).slice().sort(function (a, b) {
      return (a.stackOrder || 0) - (b.stackOrder || 0);
    });
  };

  DinoComposer.prototype.drawEquippedAccessories = async function (
    ctx, equipped, accessories, accessoryColor, destW, destH, slotRenderOpts
  ) {
    const sorted = this.sortAccessories(accessories);
    const headAccs = [];
    const otherAccs = [];
    for (let i = 0; i < sorted.length; i++) {
      const acc = sorted[i];
      if (!acc || !acc.fileBase) continue;
      if ((acc.slot || 'head') === 'head') headAccs.push(acc);
      else otherAccs.push(acc);
    }

    for (let h = 0; h < headAccs.length; h++) {
      await this.drawEquippedAccessory(ctx, equipped, headAccs[h], accessoryColor, destW, destH);
    }

    let redrawTailAfterBoots = false;
    for (let j = 0; j < otherAccs.length; j++) {
      const acc = otherAccs[j];
      await this.drawEquippedAccessory(ctx, equipped, acc, accessoryColor, destW, destH);
      const pteroTailBoots = this.hasPterodactylTailBoots(equipped, acc);
      if (acc.slot === 'frontLegs' && equipped.tail && !pteroTailBoots) {
        redrawTailAfterBoots = true;
      }
    }

    if (redrawTailAfterBoots && slotRenderOpts) {
      await this.redrawSlotOnTop(ctx, equipped, 'tail', slotRenderOpts);
      await this.drawSlotDetails(ctx, equipped, 'tail', destW, destH);
    }
  };

  DinoComposer.prototype.slotsHiddenByAccessory = function (accessory, equipped) {
    // Rain boots replace leg pixels via eraseUnder when drawn on top; do not hide leg
    // slots or dual-boot species (stegosaurus, brachiosaurus, triceratops) lose legs
    // with nothing visible if boot images fail to load or draw after leg redraw.
    return [];
  };

  DinoComposer.prototype.drawLayerByKind = async function (ctx, path, kind, renderOpts) {
    if (!path) return;
    try {
      const img = await this.loadImage(path);
      const usesTint = this.kindUsesTint(kind) && !!renderOpts.tint;
      const color = this.colorForKind(kind, renderOpts);
      this.drawLayerImage(ctx, img, usesTint, color, renderOpts.destW, renderOpts.destH);
    } catch (e) { /* skip missing layer */ }
  };

  DinoComposer.prototype.applyPatternToCanvas = function (partCtx, partCanvas, renderOpts) {
    const pattern = renderOpts.pattern;
    const tint = renderOpts.tint;
    if (!tint || !pattern || pattern.type === 'none') return;
    try {
      const destW = renderOpts.destW;
      const destH = renderOpts.destH;
      const patternColor = renderOpts.patternColor;
      const tileImg = renderOpts.tileImg;
      const overlayImg = renderOpts.overlayImg;
      const alphaMask = this.buildAlphaMask(partCanvas, destW, destH);

      if (pattern.type === 'tile' && tileImg) {
        this.applyTilePattern(
          partCtx, alphaMask, tileImg, patternColor, pattern.blend || 'source-over', destW, destH, pattern
        );
      } else if (pattern.type === 'overlay' && overlayImg) {
        this.applyMaskedOverlay(
          partCtx, overlayImg, alphaMask, pattern.blend || 'source-over', destW, destH, pattern, patternColor
        );
      }
    } catch (e) { /* keep the unpatterned part */ }
  };

  DinoComposer.prototype.applyPartPattern = function (partCtx, partCanvas, renderOpts) {
    this.applyPatternToCanvas(partCtx, partCanvas, renderOpts);
  };

  DinoComposer.prototype.composeLayerList = async function (items, renderOpts) {
    const destW = renderOpts.destW;
    const destH = renderOpts.destH;
    const canvas = document.createElement('canvas');
    canvas.width = destW;
    canvas.height = destH;
    const ctx = canvas.getContext('2d');
    if (!items || !items.length) return canvas;

    const patterned = [];
    const outlines = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'outline') outlines.push(items[i]);
      else patterned.push(items[i]);
    }

    for (let p = 0; p < patterned.length; p++) {
      await this.drawLayerByKind(ctx, patterned[p].path, patterned[p].kind, renderOpts);
    }
    this.applyPatternToCanvas(ctx, canvas, renderOpts);
    for (let o = 0; o < outlines.length; o++) {
      await this.drawLayerByKind(ctx, outlines[o].path, outlines[o].kind, renderOpts);
    }
    return canvas;
  };

  DinoComposer.prototype.slotLayerItems = function (part) {
    const items = [];
    if (!part) return items;
    for (let i = 0; i < SLOT_LAYER_ORDER.length; i++) {
      const kind = SLOT_LAYER_ORDER[i];
      if (part[kind]) items.push({ kind: kind, path: part[kind] });
    }
    return items;
  };

  DinoComposer.prototype.composeSlotCanvas = async function (equipped, slot, renderOpts) {
    const part = this.partForSlot(equipped, slot);
    if (!part) return null;
    return this.composeLayerList(this.slotLayerItems(part), renderOpts);
  };

  DinoComposer.prototype.overlayLayerItems = function (part) {
    const overlays = (part && part.overlays) || [];
    if (!overlays.length) return [];
    const items = overlays.slice();
    let hasCustomOverlay = false;
    for (let i = 0; i < items.length; i++) {
      if (items[i].kind === 'custom') {
        hasCustomOverlay = true;
        break;
      }
    }
    if (part.custom && !hasCustomOverlay) {
      items.push({ kind: 'custom', path: part.custom });
    }
    return items;
  };

  DinoComposer.prototype.usesHippoTail2 = function (equipped) {
    if (!equipped || equipped.tail !== 'hippocampus' || !equipped.body) return false;
    const hippo = this.getSpecies('hippocampus');
    const tail = hippo && hippo.slots && hippo.slots.tail;
    const bodies = (tail && tail.variant2ForBodies) || [];
    return bodies.indexOf(equipped.body) >= 0 && !!(tail && tail.variant2);
  };

  DinoComposer.prototype.partForSlot = function (equipped, slot) {
    if (!equipped || !equipped[slot]) return null;
    const species = this.getSpecies(equipped[slot]);
    const part = species && species.slots && species.slots[slot];
    if (!part) return null;
    if (slot === 'tail' && this.usesHippoTail2(equipped) && part.variant2) {
      return part.variant2;
    }
    return part;
  };

  DinoComposer.prototype.overlayDrawsWithSlot = function (slot) {
    return slot !== 'tail';
  };

  DinoComposer.prototype.layerOrderFor = function (equipped) {
    const order = ((this.catalog && this.catalog.layerOrder)
      || ['tail', 'body', 'backLegs', 'frontLegs', 'head', 'wings']).slice();
    const tailOverBody = !!(equipped && equipped.tail === 'hippocampus' && (
      equipped.body === 'hippocampus' || this.usesHippoTail2(equipped)
    ));
    if (tailOverBody) {
      const tailAt = order.indexOf('tail');
      const bodyAt = order.indexOf('body');
      if (tailAt !== -1 && bodyAt !== -1 && tailAt < bodyAt) {
        order.splice(tailAt, 1);
        order.splice(order.indexOf('body') + 1, 0, 'tail');
      }
    }
    return order;
  };

  DinoComposer.prototype.stackOps = function (equipped) {
    const order = this.layerOrderFor(equipped);
    const ops = [];
    for (let i = 0; i < order.length; i++) {
      const slot = order[i];
      if (equipped[slot]) {
        ops.push({ slot: slot, kind: 'slot' });
        if (this.overlayDrawsWithSlot(slot)) ops.push({ slot: slot, kind: 'overlay' });
      }
      if (slot === 'backLegs' && equipped.tail) {
        ops.push({ slot: 'tail', kind: 'overlay' });
      }
    }
    return ops;
  };

  DinoComposer.prototype.composeOverlayCanvas = async function (equipped, slot, renderOpts) {
    const part = this.partForSlot(equipped, slot);
    const items = this.overlayLayerItems(part);
    if (!items.length) return null;
    return this.composeLayerList(items, renderOpts);
  };

  DinoComposer.prototype.drawAllOverlays = async function (ctx, equipped, order, renderOpts) {
    for (let i = 0; i < order.length; i++) {
      const slot = order[i];
      if (!equipped[slot]) continue;
      try {
        const overlayCanvas = await this.composeOverlayCanvas(equipped, slot, renderOpts);
        if (overlayCanvas) ctx.drawImage(overlayCanvas, 0, 0);
      } catch (e) { /* skip */ }
    }
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
      this.drawImageNatural(ctx, detImg, destW, destH);
    } catch (e) { /* skip */ }
  };

  DinoComposer.prototype.slotsRedrawnOnTop = function () {
    return [];
  };

  DinoComposer.prototype.drawSlotLayerOnTop = async function (ctx, equipped, slot, renderOpts) {
    const partCanvas = await this.composeSlotCanvas(equipped, slot, renderOpts);
    if (partCanvas) ctx.drawImage(partCanvas, 0, 0);
  };

  DinoComposer.prototype.redrawSlotOnTop = async function (ctx, equipped, slot, renderOpts) {
    if (!equipped[slot]) return;
    await this.drawSlotLayerOnTop(ctx, equipped, slot, renderOpts);
  };

  DinoComposer.prototype.buildAlphaMask = function (sourceCanvas, destW, destH) {
    const mask = document.createElement('canvas');
    mask.width = destW;
    mask.height = destH;
    const mctx = mask.getContext('2d');
    mctx.drawImage(sourceCanvas, 0, 0);
    this.fillKeepingAlpha(mctx, '#ffffff', destW, destH);
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
    const customColor = (opts && opts.customColor) || color;
    const pattern = opts && opts.pattern;
    const patternColor = (opts && opts.patternColor) || '#2d2d2d';
    const accessories = (opts && opts.accessories)
      || (opts && opts.accessory ? [opts.accessory] : []);
    const accessoryColor = (opts && opts.accessoryColor) || patternColor;
    const destW = (opts && opts.destW) || ctx.canvas.width;
    const destH = (opts && opts.destH) || ctx.canvas.height;
    equipped = this.withAutoWings(equipped);

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    const baseLayer = document.createElement('canvas');
    baseLayer.width = destW;
    baseLayer.height = destH;
    const baseCtx = baseLayer.getContext('2d');

    let tileImg = null;
    let overlayImg = null;

    if (pattern && pattern.type === 'tile' && pattern.path) {
      try { tileImg = await this.loadImage(pattern.path); } catch (e) { /* skip */ }
    }
    if (pattern && pattern.type === 'overlay' && pattern.path) {
      try { overlayImg = await this.loadImage(pattern.path); } catch (e) { /* skip */ }
    }

    const slotRenderOpts = {
      tint: tint,
      color: color,
      customColor: customColor,
      pattern: pattern,
      patternColor: patternColor,
      tileImg: tileImg,
      overlayImg: overlayImg,
      destW: destW,
      destH: destH,
    };

    const ops = this.stackOps(equipped);
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      try {
        const canvas = op.kind === 'overlay'
          ? await this.composeOverlayCanvas(equipped, op.slot, slotRenderOpts)
          : await this.composeSlotCanvas(equipped, op.slot, slotRenderOpts);
        if (canvas) baseCtx.drawImage(canvas, 0, 0);
      } catch (e) { /* skip missing */ }
    }

    if (accessories.length) {
      try {
        await this.drawEquippedAccessories(
          baseCtx, equipped, accessories, accessoryColor, destW, destH, slotRenderOpts
        );
      } catch (e) { /* keep the creature if an accessory fails */ }
    }

    ctx.drawImage(baseLayer, 0, 0);
  };

  DinoComposer.prototype.fillAccessoryThumb = async function (canvas, accessory) {
    if (!canvas || !accessory || !accessory.fileBase || !this.catalog) return;
    const speciesList = this.catalog.species || [];
    let img = null;
    for (let i = 0; i < speciesList.length; i++) {
      const sid = speciesList[i].id;
      img = await this.loadFirstExistingImage(
        this.accessoryPathCandidates(accessory.fileBase, sid, accessory)
          .concat(this.dualBootPathCandidates(accessory.fileBase, sid, 'front'))
      );
      if (img) break;
    }
    if (!img) return;
    const bbox = this.getImageContentBBox(img, 16);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pad = 8;
    const dw = canvas.width - pad * 2;
    const dh = canvas.height - pad * 2;
    if (!bbox) {
      ctx.drawImage(img, pad, pad, dw, dh);
      return;
    }
    const scale = Math.min(dw / bbox.w, dh / bbox.h);
    const w = bbox.w * scale;
    const h = bbox.h * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.drawImage(img, bbox.x, bbox.y, bbox.w, bbox.h, x, y, w, h);
  };

  DinoComposer.prototype.fillPartThumb = async function (canvas, equipped) {
    if (!canvas || !this.catalog) return;
    const destW = 320;
    const destH = 320;
    const off = document.createElement('canvas');
    off.width = destW;
    off.height = destH;
    await this.render(off.getContext('2d'), equipped, { tint: false, destW: destW, destH: destH });
    const bbox = this.getCanvasContentBBox(off, 16);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const pad = 8;
    const dw = canvas.width - pad * 2;
    const dh = canvas.height - pad * 2;
    if (!bbox || !bbox.w || !bbox.h) {
      ctx.drawImage(off, pad, pad, dw, dh);
      return;
    }
    const scale = Math.min(dw / bbox.w, dh / bbox.h);
    const w = bbox.w * scale;
    const h = bbox.h * scale;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(off, bbox.x, bbox.y, bbox.w, bbox.h, x, y, w, h);
  };

  DinoComposer.prototype.idleMotionFor = function (slot, kind, speciesId) {
    if (slot === 'frontLegs' && speciesId === 'hippocampus') return 'body';
    if (slot === 'wings') return 'wing';
    if (slot === 'head') return 'head';
    if (slot === 'tail') return 'tail';
    if (slot === 'body') return 'body';
    return 'ground';
  };

  DinoComposer.prototype.pivotFromBBox = function (motion, bbox, destW, destH) {
    if (!bbox) {
      if (motion === 'head') return { x: destW * 0.34, y: destH * 0.40 };
      if (motion === 'tail') return { x: destW * 0.70, y: destH * 0.50 };
      if (motion === 'wing') return { x: destW * 0.48, y: destH * 0.42 };
      return { x: destW * 0.50, y: destH * 0.52 };
    }
    if (motion === 'head') {
      return { x: bbox.x + bbox.w * 0.92, y: bbox.y + bbox.h * 0.78 };
    }
    if (motion === 'tail') {
      return { x: bbox.x + bbox.w * 0.07, y: bbox.y + bbox.h * 0.48 };
    }
    if (motion === 'wing') {
      return { x: bbox.x + bbox.w * 0.08, y: bbox.y + bbox.h * 0.60 };
    }
    return { x: bbox.x + bbox.w * 0.50, y: bbox.y + bbox.h * 0.58 };
  };

  DinoComposer.prototype.jointBand = function (motion, bbox) {
    if (!bbox) return null;
    if (motion === 'head') {
      return {
        x0: bbox.x + bbox.w * 0.82,
        x1: bbox.x + bbox.w,
        y0: bbox.y + bbox.h * 0.55,
        y1: bbox.y + bbox.h,
      };
    }
    if (motion === 'tail') {
      return {
        x0: bbox.x,
        x1: bbox.x + bbox.w * 0.14,
        y0: bbox.y + bbox.h * 0.28,
        y1: bbox.y + bbox.h * 0.72,
      };
    }
    if (motion === 'wing') {
      return {
        x0: bbox.x,
        x1: bbox.x + bbox.w * 0.16,
        y0: bbox.y + bbox.h * 0.38,
        y1: bbox.y + bbox.h * 0.82,
      };
    }
    return null;
  };

  DinoComposer.prototype.jointPivotFromCanvas = function (canvas, motion, destW, destH) {
    const bbox = this.getCanvasContentBBox(canvas);
    const fallback = this.pivotFromBBox(motion, bbox, destW, destH);
    const band = this.jointBand(motion, bbox);
    if (!band || !canvas) return { bbox: bbox, pivot: fallback };
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = this.safeGetImageData(ctx, w, h);
    if (!imgData) return { bbox: bbox, pivot: fallback };
    const data = imgData.data;
    const cutoff = 16;
    const step = w * h > 400000 ? 2 : 1;
    const x0 = Math.max(0, Math.floor(band.x0));
    const x1 = Math.min(w - 1, Math.ceil(band.x1));
    const y0 = Math.max(0, Math.floor(band.y0));
    const y1 = Math.min(h - 1, Math.ceil(band.y1));
    let sx = 0;
    let sy = 0;
    let n = 0;
    for (let y = y0; y <= y1; y += step) {
      for (let x = x0; x <= x1; x += step) {
        if (data[(y * w + x) * 4 + 3] >= cutoff) {
          sx += x;
          sy += y;
          n += 1;
        }
      }
    }
    if (n < 8) return { bbox: bbox, pivot: fallback };
    return { bbox: bbox, pivot: { x: sx / n, y: sy / n } };
  };

  DinoComposer.prototype.seamPivotFromCanvases = function (movingCanvas, anchorCanvas) {
    if (!movingCanvas || !anchorCanvas) return null;
    const w = Math.min(movingCanvas.width, anchorCanvas.width);
    const h = Math.min(movingCanvas.height, anchorCanvas.height);
    if (!w || !h) return null;
    const mData = this.safeGetImageData(movingCanvas.getContext('2d'), movingCanvas.width, movingCanvas.height);
    const aData = this.safeGetImageData(anchorCanvas.getContext('2d'), anchorCanvas.width, anchorCanvas.height);
    if (!mData || !aData) return null;
    const m = mData.data;
    const a = aData.data;
    const mw = movingCanvas.width;
    const aw = anchorCanvas.width;
    const cutoff = 16;
    const radius = 10;
    const step = w * h > 400000 ? 2 : 1;
    const movingBBox = this.getCanvasContentBBox(movingCanvas);
    const anchorBBox = this.getCanvasContentBBox(anchorCanvas);
    if (!movingBBox || !anchorBBox) return null;
    const x0 = Math.max(0, Math.floor(Math.min(movingBBox.x, anchorBBox.x) - radius));
    const y0 = Math.max(0, Math.floor(Math.min(movingBBox.y, anchorBBox.y) - radius));
    const x1 = Math.min(w - 1, Math.ceil(Math.max(movingBBox.x + movingBBox.w, anchorBBox.x + anchorBBox.w) + radius));
    const y1 = Math.min(h - 1, Math.ceil(Math.max(movingBBox.y + movingBBox.h, anchorBBox.y + anchorBBox.h) + radius));

    function opaque(data, width, x, y) {
      if (x < 0 || y < 0 || x >= width) return false;
      const rowCount = data.length / 4 / width;
      if (y >= rowCount) return false;
      return data[(y * width + x) * 4 + 3] >= cutoff;
    }

    const pts = [];
    for (let y = y0; y <= y1; y += step) {
      for (let x = x0; x <= x1; x += step) {
        if (!opaque(m, mw, x, y) || !opaque(a, aw, x, y)) continue;
        pts.push(x, y);
      }
    }
    if (pts.length / 2 < 12) {
      pts.length = 0;
      for (let y = y0; y <= y1; y += step) {
        for (let x = x0; x <= x1; x += step) {
          if (!opaque(m, mw, x, y)) continue;
          let near = false;
          for (let dy = -radius; dy <= radius && !near; dy += 2) {
            for (let dx = -radius; dx <= radius; dx += 2) {
              if (opaque(a, aw, x + dx, y + dy)) {
                near = true;
                break;
              }
            }
          }
          if (!near) continue;
          pts.push(x, y);
        }
      }
    }
    const count = pts.length / 2;
    if (count < 8) return null;
    const bodyCx = anchorBBox.x + anchorBBox.w * 0.55;
    const bodyCy = anchorBBox.y + anchorBBox.h * 0.58;
    const order = [];
    for (let i = 0; i < count; i++) {
      const x = pts[i * 2];
      const y = pts[i * 2 + 1];
      const dx = x - bodyCx;
      const dy = y - bodyCy;
      order.push({ x: x, y: y, d: dx * dx + dy * dy });
    }
    order.sort(function (a, b) { return a.d - b.d; });
    const keep = Math.max(8, Math.ceil(order.length * 0.22));
    let sx = 0;
    let sy = 0;
    for (let j = 0; j < keep; j++) {
      sx += order[j].x;
      sy += order[j].y;
    }
    return { x: sx / keep, y: sy / keep };
  };

  DinoComposer.prototype.pinTailLayersToBody = function (pose) {
    const layers = pose && pose.layers;
    if (!layers || !layers.length) return;
    let bodyLayer = null;
    let tailLayer = null;
    for (let i = 0; i < layers.length; i++) {
      if (layers[i].id === 'body') bodyLayer = layers[i];
      if (layers[i].id === 'tail') tailLayer = layers[i];
    }
    if (!bodyLayer || !tailLayer) return;
    const seam = this.seamPivotFromCanvases(tailLayer.canvas, bodyLayer.canvas);
    if (!seam) return;
    pose.hip = seam;
    for (let j = 0; j < layers.length; j++) {
      if (layers[j].motion === 'tail') layers[j].pivot = seam;
    }
  };

  DinoComposer.prototype.pushIdleLayer = function (layers, id, canvas, motion, destW, destH, eraseMask) {
    if (!canvas) return;
    const joint = this.jointPivotFromCanvas(canvas, motion, destW, destH);
    layers.push({
      id: id,
      canvas: canvas,
      motion: motion,
      eraseMask: eraseMask || null,
      pivot: joint.pivot,
      bbox: joint.bbox,
    });
  };

  DinoComposer.prototype.composeAccessoryPiece = function (
    images, accessory, accessoryColor, destW, destH
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = destW;
    canvas.height = destH;
    const ctx = canvas.getContext('2d');
    const erase = document.createElement('canvas');
    erase.width = destW;
    erase.height = destH;
    const ectx = erase.getContext('2d');
    let hasErase = false;
    let drew = false;
    for (let i = 0; i < images.length; i++) {
      const accImg = images[i];
      if (!accImg) continue;
      const layer = this.buildAccessoryLayer(accImg, destW, destH, accessoryColor, accessory);
      const shouldErase = accessory.eraseUnder !== false && !accessory.preserveAlpha;
      if (shouldErase) {
        ectx.drawImage(this.buildAccessoryEraseMask(accImg, destW, destH), 0, 0);
        hasErase = true;
      }
      ctx.drawImage(layer, 0, 0);
      drew = true;
    }
    if (!drew) return null;
    return { canvas: canvas, eraseMask: hasErase ? erase : null };
  };

  DinoComposer.prototype.appendIdleAccessoryLayers = async function (
    layers, equipped, accessories, accessoryColor, destW, destH
  ) {
    const sorted = this.sortAccessories(accessories);
    for (let i = 0; i < sorted.length; i++) {
      const acc = sorted[i];
      if (!acc || !acc.fileBase) continue;
      const isShoes = !!(acc.dualBootsFor || acc.exclusiveGroup === 'shoes');
      if (isShoes) {
        const images = [];
        const loadedKeys = {};
        const self = this;
        async function addLeg(speciesId, side) {
          if (!speciesId) return;
          const sideKey = speciesId + ':' + side;
          const singleKey = speciesId + ':single';
          if (loadedKeys[sideKey] || loadedKeys[singleKey]) return;
          const kind = await self.appendRainBootImages(images, acc, speciesId, side);
          if (kind === 'single') loadedKeys[singleKey] = true;
          if (kind) loadedKeys[sideKey] = true;
        }
        await addLeg(equipped.frontLegs, 'front');
        await addLeg(equipped.backLegs, 'back');
        if (this.hasPterodactylTailBoots(equipped, acc)) {
          await this.appendRainBootImages(images, acc, equipped.tail, 'front');
        }
        const piece = this.composeAccessoryPiece(images, acc, accessoryColor, destW, destH);
        if (piece) {
          this.pushIdleLayer(layers, acc.id + ':shoes', piece.canvas, 'ground', destW, destH, piece.eraseMask);
        }
        continue;
      }

      const speciesId = this.resolveAccessorySpeciesId(equipped, acc);
      if (!speciesId) continue;
      const headImg = await this.loadFirstExistingImage(
        this.accessoryPathCandidates(acc.fileBase, speciesId, acc)
      );
      const slot = acc.slot || 'head';
      const motion = slot === 'body' ? 'body' : (slot === 'tail' ? 'tail' : 'head');
      if (headImg) {
        const piece = this.composeAccessoryPiece([headImg], acc, accessoryColor, destW, destH);
        if (piece) {
          this.pushIdleLayer(layers, acc.id + ':' + slot, piece.canvas, motion, destW, destH, piece.eraseMask);
        }
      }
      const tailHatsFor = acc.tailHatsFor || [];
      if (equipped.tail && tailHatsFor.indexOf(equipped.tail) >= 0) {
        const tailHat = await this.loadFirstExistingImage(
          this.tailHatPathCandidates(acc.fileBase, equipped.tail)
        );
        if (tailHat) {
          const piece = this.composeAccessoryPiece([tailHat], acc, accessoryColor, destW, destH);
          if (piece) {
            this.pushIdleLayer(layers, acc.id + ':tailHat', piece.canvas, 'tail', destW, destH, piece.eraseMask);
          }
        }
      }
    }
  };

  DinoComposer.prototype.prepareIdleLayers = async function (equipped, opts) {
    const destW = (opts && opts.destW) || 640;
    const destH = (opts && opts.destH) || destW;
    equipped = this.withAutoWings(equipped);
    const pose = {
      destW: destW,
      destH: destH,
      chest: { x: destW * 0.50, y: destH * 0.52 },
      neck: { x: destW * 0.34, y: destH * 0.40 },
      hip: { x: destW * 0.70, y: destH * 0.50 },
      shoulder: { x: destW * 0.48, y: destH * 0.42 },
      layers: [],
    };
    if (!this.catalog) return pose;

    const tint = opts && opts.tint;
    const color = (opts && opts.color) || '#4a8c3f';
    const customColor = (opts && opts.customColor) || color;
    const pattern = opts && opts.pattern;
    const patternColor = (opts && opts.patternColor) || '#2d2d2d';
    const accessories = (opts && opts.accessories)
      || (opts && opts.accessory ? [opts.accessory] : []);
    const accessoryColor = (opts && opts.accessoryColor) || patternColor;
    pose.tailSpecies = equipped.tail || null;

    let tileImg = null;
    let overlayImg = null;
    if (pattern && pattern.type === 'tile' && pattern.path) {
      try { tileImg = await this.loadImage(pattern.path); } catch (e) { /* skip */ }
    }
    if (pattern && pattern.type === 'overlay' && pattern.path) {
      try { overlayImg = await this.loadImage(pattern.path); } catch (e) { /* skip */ }
    }

    const slotRenderOpts = {
      tint: tint,
      color: color,
      customColor: customColor,
      pattern: pattern,
      patternColor: patternColor,
      tileImg: tileImg,
      overlayImg: overlayImg,
      destW: destW,
      destH: destH,
    };

    const layers = pose.layers;
    const ops = this.stackOps(equipped);
    for (let i = 0; i < ops.length; i++) {
      const op = ops[i];
      const speciesId = equipped[op.slot];
      try {
        const canvas = op.kind === 'overlay'
          ? await this.composeOverlayCanvas(equipped, op.slot, slotRenderOpts)
          : await this.composeSlotCanvas(equipped, op.slot, slotRenderOpts);
        if (canvas) {
          this.pushIdleLayer(
            layers,
            op.kind === 'overlay' ? op.slot + ':overlay' : op.slot,
            canvas,
            this.idleMotionFor(op.slot, op.kind, speciesId),
            destW,
            destH
          );
        }
      } catch (e) { /* skip missing */ }
    }

    if (accessories.length) {
      try {
        await this.appendIdleAccessoryLayers(
          layers, equipped, accessories, accessoryColor, destW, destH
        );
      } catch (e) { /* keep the creature if an accessory fails */ }
    }

    function pivotOf(id, motion) {
      for (let i = 0; i < layers.length; i++) {
        if (layers[i].id === id) return layers[i].pivot;
      }
      for (let j = 0; j < layers.length; j++) {
        if (layers[j].motion === motion) return layers[j].pivot;
      }
      return null;
    }

    pose.chest = pivotOf('body', 'body') || pose.chest;
    pose.neck = pivotOf('head', 'head') || pose.chest;
    pose.hip = pivotOf('tail', 'tail') || pose.chest;
    pose.shoulder = pivotOf('wings', 'wing') || pose.chest;
    this.pinTailLayersToBody(pose);
    return pose;
  };

  DinoComposer.prototype.idleMotionAt = function (tSeconds, pose) {
    const deg = Math.PI / 180;
    const breath = Math.sin(tSeconds * Math.PI * 2 / 4.1);
    const head = Math.sin(tSeconds * Math.PI * 2 / 3.3);
    const tail = Math.sin(tSeconds * Math.PI * 2 / 2.85 + 0.7);
    const wing = Math.sin(tSeconds * Math.PI * 2 / 3.7 + 1.2);
    const glanceCycle = tSeconds % 10.5;
    let glance = 0;
    if (glanceCycle > 8.6 && glanceCycle < 10.0) {
      glance = Math.sin((glanceCycle - 8.6) / 1.4 * Math.PI);
    }
    const tailAmp = (pose && pose.tailSpecies === 'zheng')
      ? 1.8
      : (pose && (pose.tailSpecies === 'hippocampus' || pose.tailSpecies === 'kraken')) ? 2.2 : 4.0;
    return {
      scaleX: 1 + 0.014 * breath,
      scaleY: 1 + 0.036 * breath,
      head: (2.5 * head + 1.2 * glance) * deg,
      tail: -tailAmp * tail * deg,
      wing: 3.5 * wing * deg,
    };
  };

  DinoComposer.prototype.drawIdleFrame = function (ctx, pose, tSeconds) {
    if (!ctx || !pose) return;
    const destW = pose.destW || ctx.canvas.width;
    const destH = pose.destH || ctx.canvas.height;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = 'high';
    const motion = this.idleMotionAt(tSeconds || 0, pose);
    const chest = pose.chest || { x: destW / 2, y: destH / 2 };
    const layers = pose.layers || [];
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layer || !layer.canvas) continue;
      ctx.save();
      if (layer.motion === 'body') {
        ctx.translate(chest.x, chest.y);
        ctx.scale(motion.scaleX, motion.scaleY);
        ctx.translate(-chest.x, -chest.y);
      }
      let ang = 0;
      let pivot = layer.pivot || chest;
      if (layer.motion === 'head') {
        ang = motion.head;
        pivot = pose.neck || layer.pivot || chest;
      } else if (layer.motion === 'tail') {
        ang = motion.tail;
        pivot = pose.hip || layer.pivot || chest;
        const liveHip = {
          x: chest.x + (pivot.x - chest.x) * motion.scaleX,
          y: chest.y + (pivot.y - chest.y) * motion.scaleY,
        };
        ctx.translate(liveHip.x - pivot.x, liveHip.y - pivot.y);
        pivot = liveHip;
      } else if (layer.motion === 'wing') {
        ang = motion.wing;
        pivot = pose.shoulder || layer.pivot || chest;
      }
      if (ang) {
        ctx.translate(pivot.x, pivot.y);
        ctx.rotate(ang);
        ctx.translate(-pivot.x, -pivot.y);
      }
      if (layer.eraseMask) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(layer.eraseMask, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.drawImage(layer.canvas, 0, 0);
      ctx.restore();
    }
  };

  DinoComposer.prototype.allParts = function () {
    const out = [];
    if (!this.catalog) return out;
    (this.catalog.species || []).forEach(function (sp) {
      const slots = sp.onlySlots || Object.keys(sp.slots || {});
      slots.forEach(function (slot) {
        if (slot === 'wings' || !sp.slots[slot]) return;
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
