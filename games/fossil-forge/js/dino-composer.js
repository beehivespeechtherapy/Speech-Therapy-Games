/**
 * Stack 1600×1600 dinosaur parts at origin, multiply-tint bases, overlay details.
 */
(function (global) {
  'use strict';

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
        return this.catalog;
      } catch (e) { /* try next */ }
    }

    if (global.__FOSSIL_FORGE_CATALOG_EMBED__) {
      this.catalog = global.__FOSSIL_FORGE_CATALOG_EMBED__;
      return this.catalog;
    }

    const el = document.getElementById('parts-catalog-embed');
    if (el && el.textContent) {
      try {
        this.catalog = JSON.parse(el.textContent.trim());
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

  DinoComposer.prototype.loadImage = function (relativePath) {
    const url = this.resolvePath(relativePath);
    if (this.cache.has(url)) return this.cache.get(url);
    const p = new Promise(function (resolve, reject) {
      const img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('Failed to load ' + relativePath)); };
      img.src = url;
    });
    this.cache.set(url, p);
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

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} equipped - slot -> speciesId
   * @param {{ tint?: boolean, color?: string, destW?: number, destH?: number }} opts
   */
  DinoComposer.prototype.render = async function (ctx, equipped, opts) {
    if (!this.catalog) return;
    const tint = opts && opts.tint;
    const color = (opts && opts.color) || '#4a8c3f';
    const destW = (opts && opts.destW) || ctx.canvas.width;
    const destH = (opts && opts.destH) || ctx.canvas.height;
    const order = this.catalog.layerOrder || ['tail', 'body', 'backLegs', 'frontLegs', 'head'];

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    for (let i = 0; i < order.length; i++) {
      const slot = order[i];
      const speciesId = equipped[slot];
      if (!speciesId) continue;
      const species = this.getSpecies(speciesId);
      if (!species || !species.slots || !species.slots[slot]) continue;
      const part = species.slots[slot];
      try {
        const img = await this.loadImage(part.base);
        if (tint) this.drawTinted(ctx, img, color, destW, destH);
        else ctx.drawImage(img, 0, 0, destW, destH);
      } catch (e) { /* skip missing */ }
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
        const img = await this.loadImage(det);
        ctx.drawImage(img, 0, 0, destW, destH);
      } catch (e) { /* skip */ }
    }
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
