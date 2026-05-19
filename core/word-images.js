/**
 * Resolve word clipart paths under word-images/_library/.
 */
(function (global) {
  'use strict';

  function imageFilename(word) {
    const trimmed = (word || '').trim();
    if (trimmed === 'v' || trimmed === 'V') return 'v.png';
    if (trimmed === 'Ed') return 'Ed.png';
    return trimmed + '.png';
  }

  function wordImagesRootFromPage() {
    if (typeof window === 'undefined' || !window.location) return '';
    const path = window.location.pathname.replace(/\/games\/[^/]+(\/.*)?$/, '');
    const origin = window.location.origin || '';
    return origin + (path.endsWith('/') ? path : path + '/');
  }

  /**
   * @param {string} word
   * @param {{ relativeBase?: string, legacyFolder?: string, useOrigin?: boolean }} [options]
   */
  function libraryImagePath(word, options) {
    const opts = options || {};
    const relativeBase = (opts.relativeBase != null ? opts.relativeBase : '../../word-images').replace(/\/$/, '');
    const filename = imageFilename(word);
    const libraryRel = relativeBase + '/_library/' + filename;

    if (opts.useOrigin !== false && typeof window !== 'undefined') {
      try {
        const root = wordImagesRootFromPage();
        if (root) {
          return new URL('word-images/_library/' + encodeURIComponent(filename).replace(/%2F/g, '/'), root).href
            .replace(/%2F/g, '/');
        }
      } catch (e) { /* fall through */ }
    }

    const legacyFolder = opts.legacyFolder;
    if (legacyFolder) {
      const encodedFolder = encodeURIComponent(legacyFolder).replace(/%2F/g, '/');
      return relativeBase + '/' + encodedFolder + '/' + filename;
    }

    return libraryRel;
  }

  global.WordImages = {
    imageFilename: imageFilename,
    libraryImagePath: libraryImagePath,
    wordImagesRootFromPage: wordImagesRootFromPage
  };
})(typeof window !== 'undefined' ? window : globalThis);
